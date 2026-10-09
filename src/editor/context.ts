import { announce } from '../a11y';
import { blurCanvas, layoutState } from '../canvas/layoutState';
import { setTool } from '../canvas/toolStore';
import { viewportStore } from '../canvas/viewportStore';
import { settingsStore } from '../settings';
import { canopyStore } from '../store';
import { showToast } from '../ui/toast';
import { jumpFilter } from '../ui/filterNav';
import {
  closeInspector,
  openDialog,
  openInspector,
  openQuickAdd,
  pointAtEdge,
  startEdgeEdit,
  startImageAltEdit,
  focusFilterSearch,
  openLeft,
  openTopicSearch,
  setFilter,
  setFocusBranch,
  setTrailMode,
  toggleZen,
  uiStore,
} from '../ui/uiStore';
import { importMapAsBranch, openMapFromFile, saveMapAsFile, startNewMap } from '../ui/fileActions';
import type { CommandContext } from './commands';

export const appContext: CommandContext = {
  store: canopyStore,
  viewport: viewportStore,
  getLayout: () => layoutState.getState().layout,
  announce,
  releaseFocus: blurCanvas,
  notify: showToast,
  app: {
    openDialog,
    quickAdd: openQuickAdd,
    zen: toggleZen,
    focusBranch: () => {
      if (uiStore.getState().focusBranch) {
        setFocusBranch(null);
        announce('Everything unfolded');
        return;
      }
      const { doc, focus } = canopyStore.getState();
      if (focus === doc.coreId) {
        announce('The Core has nothing above it to fold');
        return;
      }
      setFocusBranch(focus);
      announce(
        `Showing ${doc.topics[focus]?.title.trim() || 'this topic'} alone, with everything above folded`,
      );
    },
    tool: (tool) => {
      setTool(tool);
      announce(`${tool === 'select' ? 'Select' : tool === 'pan' ? 'Pan' : 'Zoom'} tool`);
    },
    trail: () => {
      // With the Trail off in Settings the key turns it on; otherwise it flips the highlight.
      if (!settingsStore.getState().trail) {
        settingsStore.getState().update({ trail: true });
        setTrailMode('highlight');
        announce('Trail on');
        return;
      }
      const next = uiStore.getState().trailMode === 'none' ? 'highlight' : 'none';
      setTrailMode(next);
      announce(next === 'none' ? 'Trail highlight off' : 'Trail highlight on');
    },
    confirmDelete: () => openDialog('confirmDelete'),
    editImageAlt: startImageAltEdit,
    editEdge: (id) => {
      canopyStore.getState().select([id], id);
      startEdgeEdit(id);
    },
    labelEdge: (id) => {
      canopyStore.getState().select([id], id);
      pointAtEdge(id);
      // The panel may still be opening, so look for the field over the next few frames.
      let tries = 0;
      const focusLabel = () => {
        const field = document.querySelector<HTMLInputElement>(
          '#inspector-section-stickers .edge-label-field input',
        );
        if (field) {
          field.focus();
          field.select();
        } else if (++tries < 20) requestAnimationFrame(focusLabel);
      };
      requestAnimationFrame(focusLabel);
    },
    stickEdge: (id) => {
      canopyStore.getState().select([id], id);
      pointAtEdge(id);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>('#inspector-section-stickers input[type="search"]')
          ?.focus(),
      );
    },
    searchFilter: focusFilterSearch,
    topicSearch: (sourceId) => openTopicSearch(sourceId ?? null),
    advancedFilters: () => {
      openLeft('filter');
      focusFilterSearch();
    },
    unfoldParents: () => setFocusBranch(null),
    filter: (action) => {
      if (action === 'off') setFilter(null);
      else jumpFilter(action === 'next' ? 1 : -1);
    },
    inspector: (tab) => {
      if (!tab) {
        if (uiStore.getState().inspectorOpen) closeInspector();
        else openInspector();
        return;
      }
      openInspector(tab);
      // Wait for the panel to draw, then put the cursor in its first field.
      const first: Record<string, string> = {
        note: 'textarea',
        stickers: 'input[type="search"]',
        properties: '.pill-group button',
      };
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`#inspector-section-${tab} ${first[tab]}`)?.focus(),
      );
    },
    file: (action) => {
      if (action === 'new') startNewMap();
      else if (action === 'open') void openMapFromFile();
      else if (action === 'import') void importMapAsBranch();
      else void saveMapAsFile();
    },
  },
};
