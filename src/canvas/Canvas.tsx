import {
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { useStore } from 'zustand';
import { announce } from '../a11y';
import {
  HintStrip,
  TitleEditor,
  appContext,
  executeCommand,
  useCanvasKeyboard,
  useClipboard,
} from '../editor';
import {
  computeLayout,
  chipItems,
  edgeBadgeSize,
  edgeGap,
  edgeMidpoint,
  referenceGeometry,
  type ChipItem,
  type LayoutOptions,
} from '../layout';
import { readExportTheme } from '../io';
import {
  childrenOf,
  computeRollups,
  descendantCounts,
  hasChildren,
  planningOf,
  today,
  type CanopyMap,
  type Topic as CanopyTopic,
  type Rollup,
} from '../model';
import { prefersReducedMotion } from '../motion';
import { canopyStore, useCanopy } from '../store';
import { useAppearanceEpoch, useThemeVersion } from '../theme';
import { useActiveFilter } from '../ui/filter';
import { useTrail } from '../ui/trail';
import { openContextMenu, openReferenceMenu } from '../ui/ContextMenu';
import { isMac } from '../editor/shortcuts';
import { effectiveTool, notePanned, toolStore, useEffectiveTool, useZoomsOut } from './toolStore';
import { useCanvasTools } from './useCanvasTools';
import {
  openInspector,
  pointAtEdge,
  setEdgeFocus,
  setFocusBranch,
  setReferenceFocus,
  startEdgeEdit,
  useUi,
} from '../ui/uiStore';
import { describeProps, type ChipContext } from './Chips';
import { createLayoutAnimator, sameTopics } from './animator';
import { cullLayout } from './cull';
import { DragChip, DropIndicator } from './DragLayer';
import { useDrag } from './dragStore';
import { FoldPeek } from './FoldPeek';
import { FirstRunHint } from './FirstRunHint';
import { applyGrowth, previewGrowth, type GrowthSlot } from './growth';
import { GrowthHandles } from './GrowthHandles';
import { growthStore, useGrowth } from './growthStore';
import { layoutState, registerCanvasElement } from './layoutState';
import { measureTopic, textWidth } from './metrics';
import { levelOf } from '../theme/levels';
import { branchLayout } from './branchLayout';
import { ContextNodeView } from './ContextNodeView';
import { EdgeBadge } from './EdgeBadge';
import { PlayfulDefs } from './PlayfulDefs';
import { EdgeEditor } from './EdgeEditor';
import { EdgeQuickBar } from './EdgeQuickBar';
import { createRegionStore } from './region';
import { TopicNode, type Detail, type NodeKind } from './TopicNode';
import { useTopicDrag } from './useTopicDrag';
import { intersectsRect } from './viewport';
import { removeReference } from './navigation';
import { ReferenceDelete } from './ReferenceDelete';
import { panelObstacles } from './panelInsets';
import { useSettings } from '../settings';
import { viewportStore } from './viewportStore';
import { ZoomControls } from './ZoomControls';
import './canvas.css';

/** Most topics drawn with text at once when zoomed out. */
const TEXT_BUDGET = 600;
/** Larger maps jump between layouts instead of animating. */
const MAX_ANIMATED_TOPICS = 1500;

const regionStore = createRegionStore(viewportStore);
const layoutAnimator = createLayoutAnimator();

const NO_CHIPS: ChipItem[] = [];

/** What a screen reader hears after a topic's title. */
function summaryOf(topic: CanopyTopic, ctx: ChipContext): string {
  const stickers = topic.stickers?.length ?? 0;
  return [
    describeProps(topic, ctx),
    stickers > 0 ? `${stickers} ${stickers === 1 ? 'sticker' : 'stickers'}` : '',
  ]
    .filter(Boolean)
    .join(', ');
}

/** A copy of the map with only the topics in `keep`, and every kept topic open so matches show. */
function isolate(doc: CanopyMap, keep: ReadonlySet<string>): CanopyMap {
  const topics: CanopyMap['topics'] = {};
  // With no match the map is just the Core, which layout needs to have.
  for (const id of keep.has(doc.coreId) ? keep : [doc.coreId, ...keep]) {
    const t = doc.topics[id];
    if (t) topics[id] = t.folded ? { ...t, folded: false } : t;
  }
  return { ...doc, topics };
}

/** "3/7" for a folded branch: finished work out of all work with a status. */
function rollupLabel(r: Rollup | undefined): string | undefined {
  if (!r || r.withStatus === 0) return undefined;
  return `${r.byCategory.complete}/${r.withStatus - r.byCategory.canceled}`;
}

const edgeIdOf = (target: EventTarget) =>
  (target as Element).closest('[data-edge-id]')?.getAttribute('data-edge-id') ?? null;

const topicIdOf = (target: EventTarget) =>
  (target as Element).closest('[data-topic-id]')?.getAttribute('data-topic-id') ?? null;

const referenceFromOf = (target: EventTarget) =>
  (target as Element).closest('[data-reference-from]')?.getAttribute('data-reference-from') ?? null;

const referenceDeleteOf = (target: EventTarget) =>
  (target as Element).closest('[data-reference-delete]')?.getAttribute('data-reference-delete') ??
  null;

export function Canvas() {
  const doc = useCanopy((s) => s.doc);
  const selection = useCanopy((s) => s.selection);
  const picked = useCanopy((s) => s.picked);
  const focus = useCanopy((s) => s.focus);
  const editing = useCanopy((s) => s.editing);
  const mapId = useCanopy((s) => s.mapId);
  const slot = useGrowth((s) => s.slot);
  const ghostIds = useGrowth((s) => s.ghostIds);
  const faded = useDrag((s) => s.faded);
  const hasSize = useStore(viewportStore, (s) => s.size.w > 0);
  const region = useStore(regionStore, (s) => s.region);
  const view = useStore(layoutAnimator.store, (s) => s.view);

  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const marquee = useRef<{
    x: number;
    y: number;
    mode: 'select' | 'zoom';
    /** Already picked when the box began, which Shift keeps. */
    base: string[];
    /** The topic a zoom click landed on. */
    topic: string | null;
  } | null>(null);
  const shownMap = useRef<string | null>(null);

  const { flow, density, look, voice, connector, showLevels, chips: chipMode } = doc.prefs;
  const filter = useActiveFilter();
  const trail = useTrail();
  const dimmed = filter ? filter.paths : null;
  const edgeEditing = useUi((s) => s.edgeEditing);
  const themeVersion = useThemeVersion();
  const day = today();
  // Fonts and type scale change measured sizes, so layouts are measured again when they change.
  const epoch = useAppearanceEpoch();
  const options = useMemo<LayoutOptions>(
    () => ({
      flow,
      density,
      measure: measureTopic,
      edgeGap: (t: CanopyTopic) => edgeGap(t, flow, textWidth, t.id === edgeEditing),
    }),
    // `epoch` is not read inside, but a new epoch must produce new measurements.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flow, density, epoch, edgeEditing],
  );
  // Isolating a Filter lays out only the matches and the path to them.
  const layoutDoc = useMemo(
    () =>
      filter?.mode === 'isolate'
        ? isolate(doc, filter.paths)
        : trail?.mode === 'isolate'
          ? isolate(doc, trail.keep)
          : doc,
    // The topic table changes on every edit; the rest of the map does not affect layout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc.topics, filter, trail],
  );
  // One branch alone, with the rest folded into a dotted node, when it has been asked for.
  const focusBranch = useUi((s) => s.focusBranch);
  const branchRoot =
    focusBranch && focusBranch !== layoutDoc.coreId && layoutDoc.topics[focusBranch]
      ? focusBranch
      : null;
  const branch = useMemo(
    () => (branchRoot ? branchLayout(layoutDoc, branchRoot, options) : null),
    // Layout reads only topics and the options; `layoutDoc` also changes with unrelated prefs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutDoc.topics, options, branchRoot],
  );
  const layout = useMemo(
    () => branch?.layout ?? computeLayout(layoutDoc, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutDoc.topics, options, branch],
  );
  const rollups = useMemo(
    () => computeRollups(doc, day),
    // Roll-ups depend on the topics and the Status Set only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc.topics, doc.planning, day],
  );
  const chipContext = useMemo<ChipContext>(
    () => ({
      statuses: new Map(planningOf(doc).statusSet.map((x) => [x.key, x])),
      tags: new Map(planningOf(doc).tags.map((t) => [t.key, t])),
      today: day,
      now: new Date(),
      theme: readExportTheme(),
      full: chipMode === 'full',
    }),
    // The theme is read from the page, so a new theme version needs a new context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc.planning, chipMode, day, themeVersion, look],
  );

  // While a handle is hovered, the map shows how it would look with the new topic added.
  const preview = useMemo(
    // A preview lays out the whole map, so it waits until the whole map is shown.
    () => (slot && !branchRoot ? previewGrowth(doc, layout, slot, options) : null),
    [doc, layout, slot, options, branchRoot],
  );
  const target = preview?.layout ?? layout;

  useEffect(() => {
    const sameMap = shownMap.current === mapId;
    shownMap.current = mapId;
    const previous = layoutAnimator.getTarget();
    const structural = !previous || !sameTopics(previous, target);
    // Typing resizes topics on every key, and that should not lag behind the keys.
    const typing = canopyStore.getState().editing !== null && !structural;
    const animate =
      sameMap && !typing && !prefersReducedMotion() && target.order.length <= MAX_ANIMATED_TOPICS;
    layoutAnimator.setTarget(target, animate);
  }, [target, mapId]);

  const scene = useMemo(
    () =>
      cullLayout(view.layout, flow, region.rect, {
        style: connector,
        wobble: voice === 'sketch' ? 4 : 0,
      }),
    [view.layout, flow, region.rect, connector, voice],
  );
  // Text only drops out when zoomed far out over a lot of topics.
  const detail: Detail =
    region.detail === 'low' && scene.topics.length > TEXT_BUDGET ? 'low' : 'full';
  const selected = useMemo(() => new Set(picked ? selection : []), [selection, picked]);

  // Place of each topic among its peers, for assistive technology.
  const places = useMemo(() => {
    const seen = new Map<string, number>();
    const out = new Map<string, { position: number; siblings: number }>();
    for (const box of layout.order) {
      if (!box.parentId) {
        out.set(box.id, { position: 1, siblings: 1 });
        continue;
      }
      const position = (seen.get(box.parentId) ?? 0) + 1;
      seen.set(box.parentId, position);
      out.set(box.id, { position, siblings: childrenOf(doc, box.parentId).length });
    }
    return out;
  }, [layout, doc]);

  const hiddenCounts = useMemo(
    () => descendantCounts(doc),
    // Counts depend only on which topics exist and where.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc.topics],
  );
  const topicDrag = useTopicDrag(hostRef, layout);

  useCanvasKeyboard(hostRef);
  useCanvasTools(hostRef);
  const tool = useEffectiveTool();
  const zoomsOut = useZoomsOut();
  useClipboard(hostRef);

  useEffect(() => {
    registerCanvasElement(svgRef.current);
    return () => registerCanvasElement(null);
  }, []);

  useEffect(() => {
    layoutState.setState({ layout });
  }, [layout]);

  useEffect(() => {
    growthStore.getState().reset();
  }, [mapId]);

  // Pan and zoom move the SVG directly, so they never wait on a React render.
  useEffect(() => {
    const apply = () => {
      const { vp } = viewportStore.getState();
      const world = worldRef.current;
      world?.setAttribute('transform', `translate(${vp.x} ${vp.y}) scale(${vp.k})`);
      // Fold buttons keep a usable size on screen, like the add handles do, and stop growing when zoomed in far.
      world?.style.setProperty('--toggle-scale', String(Math.min(Math.max(vp.k, 1), 3) / vp.k));
    };
    apply();
    return viewportStore.subscribe(apply);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      viewportStore.getState().setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(host);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = host.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        viewportStore
          .getState()
          .zoom(Math.exp(-e.deltaY * 0.01), { x: e.clientX - rect.left, y: e.clientY - rect.top });
      } else {
        viewportStore.getState().panBy(-e.deltaX, -e.deltaY);
      }
    };
    host.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      host.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Showing one branch (or the whole map again) fits the new view.
  const shownBranch = useRef<string | null>(null);
  useEffect(() => {
    if (!hasSize || shownBranch.current === branchRoot) return;
    shownBranch.current = branchRoot;
    viewportStore.getState().fit(layout.bounds);
  }, [branchRoot, layout, hasSize]);

  useEffect(() => {
    setFocusBranch(null);
  }, [mapId]);

  // Fit the map when it is first shown.
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!hasSize || fittedFor.current === mapId) return;
    fittedFor.current = mapId;
    viewportStore.getState().fit(layout.bounds);
  }, [hasSize, mapId, layout]);

  // A new layout direction or spacing changes the map's shape, so centre and fit it again.
  const shapeKey = `${flow}/${density}`;
  const shapeSeen = useRef<string>(shapeKey);
  useEffect(() => {
    if (!hasSize || fittedFor.current !== mapId || shapeSeen.current === shapeKey) return;
    shapeSeen.current = shapeKey;
    viewportStore.getState().fit(layout.bounds);
  }, [shapeKey, layout, hasSize, mapId]);

  // Keep the focused topic on screen as it moves or grows, clear of the floating panels.
  const autoPan = useSettings((s) => s.autoPan);
  // Opening or hiding a panel changes what is in the way, so it counts as a reason to look again.
  const leftOpen = useUi((s) => s.leftOpen);
  const inspectorOpen = useUi((s) => s.inspectorOpen);
  const zen = useUi((s) => s.zen);
  const edgeFocus = useUi((s) => s.edgeFocus);
  const referenceFocusRaw = useUi((s) => s.referenceFocus);
  const referenceFocus =
    referenceFocusRaw && doc.topics[referenceFocusRaw]?.referenceTo ? referenceFocusRaw : null;
  useEffect(() => {
    if (!autoPan || !hasSize || fittedFor.current !== mapId) return;
    const box = layout.boxes.get(focus);
    if (box) viewportStore.getState().reveal(box, 56, panelObstacles(hostRef.current));
  }, [focus, layout, hasSize, mapId, autoPan, leftOpen, inspectorOpen, zen]);

  const hostPoint = (e: { clientX: number; clientY: number }) => {
    const rect = hostRef.current?.getBoundingClientRect();
    return { x: e.clientX - (rect?.left ?? 0), y: e.clientY - (rect?.top ?? 0) };
  };

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 && e.button !== 1) return;
    // Control-click is a right-click on a Mac, and opens the menu instead.
    if (e.button === 0 && e.ctrlKey && isMac()) return;
    e.currentTarget.focus({ preventScroll: true });
    // A held key borrows a tool: Space pans, Cmd (Ctrl) zooms. The middle button always pans.
    const tool = e.button === 1 ? 'pan' : effectiveTool(toolStore.getState());

    if (tool === 'pan') {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setAttribute('data-dragging', '');
      return;
    }
    if (tool === 'zoom') {
      e.currentTarget.setPointerCapture(e.pointerId);
      marquee.current = { ...hostPoint(e), mode: 'zoom', base: [], topic: topicIdOf(e.target) };
      return;
    }

    if ((e.target as Element).closest('[data-context-node]')) {
      setFocusBranch(null);
      return;
    }
    const deleting = referenceDeleteOf(e.target);
    if (deleting) {
      removeReference(deleting);
      return;
    }
    const referenceFrom = referenceFromOf(e.target);
    if (referenceFrom && !topicIdOf(e.target)) {
      setReferenceFocus(referenceFrom);
      return;
    }
    setReferenceFocus(null);
    const id = topicIdOf(e.target);
    const edgeId = id ? null : edgeIdOf(e.target);
    if (edgeId) {
      canopyStore.getState().select([edgeId], edgeId);
      pointAtEdge(edgeId);
      return;
    }
    setEdgeFocus(null);
    if (id) {
      const { selection: current, select } = canopyStore.getState();
      if ((e.target as Element).closest('[data-parent-toggle]')) {
        select([id], id);
        setFocusBranch(id);
        announce('Everything above is folded into one node');
        return;
      }
      if ((e.target as Element).closest('[data-fold-badge], [data-fold-toggle]')) {
        select([id], id);
        executeCommand('topic.toggleFold', appContext);
        return;
      }
      if (e.shiftKey) {
        select(current.includes(id) ? current.filter((s) => s !== id) : [...current, id], id);
      } else if (current.includes(id) && current.length > 1) {
        // Keep the group so it can be dragged. A plain click collapses it on release.
        topicDrag.press(e, id, id);
      } else {
        select([id], id);
        openInspector();
        topicDrag.press(e, id, null);
      }
      return;
    }

    // Empty canvas: drag a box to pick what it touches. Shift adds to what is picked.
    e.currentTarget.setPointerCapture(e.pointerId);
    const { selection: held, deselect } = canopyStore.getState();
    if (!e.shiftKey) deselect();
    marquee.current = {
      ...hostPoint(e),
      mode: 'select',
      base: e.shiftKey && canopyStore.getState().picked ? held : [],
      topic: null,
    };
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (topicDrag.move(e)) return;
    const start = drag.current;
    if (start) {
      viewportStore.getState().panBy(e.clientX - start.x, e.clientY - start.y);
      drag.current = { x: e.clientX, y: e.clientY };
      notePanned();
      return;
    }
    const from = marquee.current;
    const el = marqueeRef.current;
    if (!from || !el) {
      const id = topicIdOf(e.target);
      const onBadge = (e.target as Element).closest('[data-fold-badge]') !== null;
      growthStore.getState().setPeek(onBadge ? id : null);
      if (id) growthStore.getState().setHover(id);
      else growthStore.getState().leave();
      return;
    }
    const to = hostPoint(e);
    const screen = {
      x: Math.min(from.x, to.x),
      y: Math.min(from.y, to.y),
      w: Math.abs(to.x - from.x),
      h: Math.abs(to.y - from.y),
    };
    // A press that has barely moved is still a click.
    if (screen.w < 4 && screen.h < 4) return;
    el.hidden = false;
    el.dataset['mode'] = from.mode;
    Object.assign(el.style, {
      left: `${screen.x}px`,
      top: `${screen.y}px`,
      width: `${screen.w}px`,
      height: `${screen.h}px`,
    });
    if (from.mode === 'zoom') return;
    const { vp } = viewportStore.getState();
    const area = {
      x: (screen.x - vp.x) / vp.k,
      y: (screen.y - vp.y) / vp.k,
      w: screen.w / vp.k,
      h: screen.h / vp.k,
    };
    const hits = layout.order.filter((b) => intersectsRect(b, area)).map((b) => b.id);
    const next = [...new Set([...from.base, ...hits])];
    if (next.length > 0) canopyStore.getState().select(next);
    else canopyStore.getState().deselect();
  };

  const endPointer = (e: PointerEvent<SVGSVGElement>) => {
    topicDrag.release(e);
    if (drag.current) {
      drag.current = null;
      e.currentTarget.removeAttribute('data-dragging');
    }
    const box = marquee.current;
    if (box) {
      marquee.current = null;
      const el = marqueeRef.current;
      if (el) el.hidden = true;
      if (box.mode === 'zoom' && e.type === 'pointerup') zoomWith(box, hostPoint(e));
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  // The zoom tool: drag an area to fill the view with it, click a topic to zoom to it, click
  // empty canvas to zoom in, and Alt-click to zoom out.
  const zoomWith = (
    from: { x: number; y: number; topic: string | null },
    to: { x: number; y: number },
  ) => {
    const { vp } = viewportStore.getState();
    const screen = {
      x: Math.min(from.x, to.x),
      y: Math.min(from.y, to.y),
      w: Math.abs(to.x - from.x),
      h: Math.abs(to.y - from.y),
    };
    if (screen.w >= 4 || screen.h >= 4) {
      viewportStore.getState().zoomTo({
        x: (screen.x - vp.x) / vp.k,
        y: (screen.y - vp.y) / vp.k,
        w: Math.max(1, screen.w / vp.k),
        h: Math.max(1, screen.h / vp.k),
      });
      return;
    }
    const zoomOut = toolStore.getState().alt;
    const box = from.topic && !zoomOut ? layout.boxes.get(from.topic) : undefined;
    if (box && from.topic) {
      canopyStore.getState().select([from.topic], from.topic);
      viewportStore.getState().zoomTo(box);
      return;
    }
    viewportStore.getState().zoom(zoomOut ? 1 / 2 : 2, { x: to.x, y: to.y });
  };

  const keyboardMenuAt = useRef(0);

  const openMenuFor = (id: string | null, x: number, y: number) => {
    const { selection: current, select } = canopyStore.getState();
    if (id) select(current.includes(id) ? current : [id], id);
    openContextMenu(x, y, id ? 'topic' : 'canvas');
  };

  const onContextMenu = (e: MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    // The browser also sends this event after the menu key, which has already opened the menu.
    if (Date.now() - keyboardMenuAt.current < 400) return;
    const referenceFrom = topicIdOf(e.target) ? null : referenceFromOf(e.target);
    if (referenceFrom) {
      setReferenceFocus(referenceFrom);
      openReferenceMenu(e.clientX, e.clientY, referenceFrom);
      return;
    }
    openMenuFor(topicIdOf(e.target) ?? edgeIdOf(e.target), e.clientX, e.clientY);
  };

  // The menu key and Shift+F10 open the menu beside the focused topic.
  const onKeyDown = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
    e.preventDefault();
    const box = layout.boxes.get(focus);
    const rect = hostRef.current?.getBoundingClientRect();
    if (!box || !rect) return;
    const { vp } = viewportStore.getState();
    keyboardMenuAt.current = Date.now();
    openMenuFor(
      focus,
      rect.left + vp.x + (box.x + box.w / 2) * vp.k,
      rect.top + vp.y + (box.y + box.h) * vp.k,
    );
  };

  const onDoubleClick = (e: MouseEvent<SVGSVGElement>) => {
    const id = topicIdOf(e.target);
    if (!id) {
      const edgeId = edgeIdOf(e.target);
      if (!edgeId) return;
      canopyStore.getState().select([edgeId], edgeId);
      startEdgeEdit(edgeId);
      return;
    }
    const { select, setEditing } = canopyStore.getState();
    select([id], id);
    setEditing(id);
  };

  // Creates the previewed topic. The view pans by the amount the preview was held back, so the
  // subject stays where it is on screen and the ghost becomes the real topic in place.
  const commitSlot = (chosen: GrowthSlot) => {
    const { doc: current, commit } = canopyStore.getState();
    const held = previewGrowth(current, layout, chosen, options);
    const grown = applyGrowth(current, chosen);
    if (held) {
      const { k } = viewportStore.getState().vp;
      layoutAnimator.shiftView(-held.shift.x, -held.shift.y);
      viewportStore.getState().panBy(held.shift.x * k, held.shift.y * k);
    }
    commit(grown.map, { select: [grown.id], focus: grown.id, edit: grown.id });
    growthStore.getState().committed();
    announce(
      chosen.kind === 'child'
        ? 'Added sub-topic'
        : chosen.kind === 'between'
          ? 'Added a topic between'
          : chosen.kind === 'level'
            ? 'Added a topic above all its peers'
            : 'Added peer',
    );
  };

  const editingBox = editing ? view.layout.boxes.get(editing) : undefined;
  const focusDrawn = scene.topics.some((b) => b.id === focus);

  return (
    <div ref={hostRef} className="canvas-host">
      <svg
        ref={svgRef}
        className="canvas-svg"
        role="tree"
        aria-label="Mind map"
        aria-multiselectable="true"
        data-filter={dimmed ? '' : undefined}
        data-tool={tool}
        data-zoom-out={(tool === 'zoom' && zoomsOut) || undefined}
        aria-activedescendant={focusDrawn ? `topic-${focus}` : undefined}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={() => {
          growthStore.getState().leave();
          growthStore.getState().setPeek(null);
        }}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
        onFocus={() => growthStore.getState().setCanvasFocused(true)}
        onBlur={() => growthStore.getState().setCanvasFocused(false)}
      >
        {look === 'playful' && <PlayfulDefs />}
        <g ref={worldRef}>
          <defs>
            <marker
              id="reference-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path className="reference-arrow" d="M0 0L8 4L0 8Z" />
            </marker>
          </defs>
          <g className="references">
            {view.layout.order.map((source) => {
              const targetId = doc.topics[source.id]?.referenceTo;
              const target = targetId ? view.layout.boxes.get(targetId) : undefined;
              if (!target || !targetId) return null;
              const sourceTitle = doc.topics[source.id]?.title.trim() || 'Empty topic';
              const targetTitle = doc.topics[targetId]?.title.trim() || 'Empty topic';
              const d = referenceGeometry(source, target).d;
              return (
                <g
                  key={`${source.id}-${targetId}`}
                  className="reference-link"
                  data-reference-from={source.id}
                  data-reference-to={targetId}
                  data-selected={referenceFocus === source.id || undefined}
                  opacity={view.fade.get(source.id)}
                >
                  <title>{`Reference from ${sourceTitle} to ${targetTitle}`}</title>
                  <path className="reference-connector" d={d} markerEnd="url(#reference-arrow)" />
                  <path className="reference-hit" d={d} />
                </g>
              );
            })}
          </g>
          <g className="links">
            {scene.links.map((link) => {
              const dim = (dimmed !== null && !dimmed.has(link.id)) || undefined;
              const child = view.layout.boxes.get(link.id);
              const parent = child?.parentId ? view.layout.boxes.get(child.parentId) : undefined;
              const edge = doc.topics[link.id]?.edge;
              const size = edgeBadgeSize(edge, textWidth);
              const mid = child && parent ? edgeMidpoint(parent, child, flow) : null;
              return (
                <g
                  key={link.id}
                  className="link"
                  data-edge-id={link.id}
                  data-selected={(edgeFocus === link.id && focus === link.id) || undefined}
                  data-trail={trail?.links.has(link.id) || undefined}
                  data-level={child ? levelOf(child.depth - 1) : undefined}
                  opacity={view.fade.get(link.id)}
                >
                  <path className="connector" data-style={connector} data-dim={dim} d={link.d} />
                  <path className="connector-hit" d={link.d} />
                  {edge && size && mid && edgeEditing !== link.id && (
                    <g data-dim={dim} className="edge-badge-wrap">
                      <EdgeBadge edge={edge} size={size} cx={mid.x} cy={mid.y} stamp />
                    </g>
                  )}
                </g>
              );
            })}
          </g>
          <g className="topics">
            {scene.topics.map((box) => {
              const place = places.get(box.id);
              const topic = doc.topics[box.id];
              const kind: NodeKind = layout.boxes.has(box.id)
                ? 'topic'
                : ghostIds.has(box.id)
                  ? 'ghost'
                  : 'leaving';
              return (
                <TopicNode
                  key={box.id}
                  box={box}
                  title={doc.topics[box.id]?.title ?? ''}
                  kind={kind}
                  selected={selected.has(box.id)}
                  focused={picked && focus === box.id}
                  editing={editing === box.id}
                  expanded={hasChildren(doc, box.id) ? !doc.topics[box.id]?.folded : undefined}
                  position={place?.position ?? 1}
                  siblings={place?.siblings ?? 1}
                  opacity={Math.min(view.fade.get(box.id) ?? 1, faded.has(box.id) ? 0.35 : 1)}
                  hidden={doc.topics[box.id]?.folded ? (hiddenCounts.get(box.id) ?? 0) : 0}
                  flow={flow}
                  look={look}
                  showLevel={showLevels}
                  detail={detail}
                  chips={topic ? chipItems(topic) : NO_CHIPS}
                  topic={topic}
                  chipContext={chipContext}
                  dim={dimmed !== null && !dimmed.has(box.id)}
                  trail={trail?.nodes.has(box.id) ?? false}
                  rollup={topic?.folded ? rollupLabel(rollups.get(box.id)) : undefined}
                  summary={topic ? summaryOf(topic, chipContext) : ''}
                  epoch={epoch}
                />
              );
            })}
          </g>
          {referenceFocus && (
            <ReferenceDelete
              source={view.layout.boxes.get(referenceFocus)}
              target={view.layout.boxes.get(doc.topics[referenceFocus]?.referenceTo ?? '')}
              from={referenceFocus}
            />
          )}
          {branch && <ContextNodeView node={branch.context} />}
          <DropIndicator layout={layout} flow={flow} />
        </g>
      </svg>
      <div ref={marqueeRef} className="marquee" hidden />
      <GrowthHandles layout={layout} onCommit={commitSlot} />
      <FoldPeek layout={layout} />
      <FirstRunHint layout={layout} />
      <DragChip />
      {editingBox && editing && <TitleEditor key={editing} box={editingBox} />}
      {edgeEditing && <EdgeEditor key={edgeEditing} id={edgeEditing} layout={layout} />}
      {edgeFocus && edgeFocus === focus && !edgeEditing && !editing && (
        <EdgeQuickBar key={edgeFocus} id={edgeFocus} layout={layout} />
      )}
      <HintStrip />
      <ZoomControls onFit={() => viewportStore.getState().fit(layout.bounds)} />
    </div>
  );
}
