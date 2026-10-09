# Canopy: Delivery Plan

Companion to [spec.md](spec.md). The spec says what and why. This plan says in what order, with checkable tasks, so work can continue across sessions.

Status (2026-10-08): Phases 1 to 3 are complete in a reduced form (see the scope cut in section 7), and an unplanned interface and navigation rework (section 7A) is also done. Phases 4 and 5 are not started. Current milestone: housekeeping (R0), then M4.1 Outline. The spec was updated to v0.3 on the same date and matches the app.

Tests: 263 unit and 177 end-to-end, all passing, with `npm run check` and ESLint clean.

---

## 0. Remaining work (read this first)

Everything below is what is left, in the order proposed. Each item points at its milestone in section 8 for the task list.

### R0. Housekeeping before more features (small)

- [ ] **Re-run the benchmarks** (`npm run bench`, 500 and 5,000 topics). The last numbers are from the end of Phase 3. Since then every topic gained a shadow rect and a parent-side fold button, and the panels and Filter changed, so check pan and zoom (60 fps), create, fold (99 ms last time) and unfold (154 ms, already over the 100 ms budget). Record the numbers in the log.
- [ ] **Visual-regression baselines** for the Looks × Modes, the panels and the exports. Several recent changes (flat shadows, level numbers, braces, dotted node) were checked by eye only.
- [ ] **Manual screen-reader smoke test and bug bash** by a person. Automated axe checks pass, but nobody has listened to the map yet.
- [ ] **Unit tests for the Branch view layout** (`canvas/branchLayout.ts`: real depths, dotted node left of the root for Right and above it for Down, bounds include it). It has e2e coverage only.
- [ ] Save repo memory notes. The conventions and gotchas to record are listed in section 11, and `/memories/repo` is still empty.

### R1. Phase 4, in this order

1. **M4.1 Outline view** (recommended next). It is the largest accessibility gap, the canonical screen-reader view in the spec, and it gives roll-ups and Filters a second home. The map is already a `role="tree"`, so the Outline needs a left-panel tab, two-way selection, fold and edit sync, and the Filter and Trail applied to it.
2. **M4.2 Semantic zoom.** The canvas already has two levels (full, and text-free far out on maps over 600 topics) and viewport culling. Add the title-only and dot levels with smooth transitions, then the 5,000-topic run.
3. **M4.3 Remaining Flows, per-branch Flow and morph.** Left, Both and Radial, a per-branch override, and the arc morph. This touches the layout engine, the growth handles, insert-between, the Branch view's dotted node and the Trail, which all handle only Right and Down today, so it needs the most care.
4. **M4.4 Brain-dump.** `!!` expansion and pasted outlines work. Left: shorthand recognised while pasting, OPML paste, the unfurl animation, and one-step undo for large pastes (200-topic cap exists).
5. **M4.5 Focus and Tour.** Decide the scope first (see the open questions). The Trail and the Branch view already cover much of Focus. The Tour (ordered steps, captions, camera choreography, present mode) is still new.
6. **M4.6 Minimap, navigation and Phase 4 hardening.**

### R2. Phase 5, once the views are agreed

7. **M5.1 to M5.3 Board, Table and Timeline**, now over three Properties only (Status, Due date, Tags). The view switcher, shared Filter and selection, and CSV (which already exists as the Table data) come first.
8. **M5.4 re-scoped:** a **Status Set editor** and a **saved-Filter editor** replace custom Properties and workflow rules, which went with the scope cut. The model already supports both.
9. **M5.5 Visual history**, **M5.6 Shortcut customisation** (the registry in `editor/shortcuts.ts` is ready for it), **M5.7 Performance** (Web Worker layout only if the re-measure says so, patch-based autosave, CI thresholds), **M5.8 Import, accessibility audit and localisation** (OPML and CSV import, strings are inline today), **M5.9 Release hardening** (About screen and credits, onboarding, final regression).

### R3. Small leftovers (any time)

- `⌘⌥V` paste style only, `⌥`-click fold all peers, Frame export, manual branch colour, Note peek card and inline preview at high zoom, `prefers-contrast`, chip morph on status change, count-up and stagger on fold.
- Keep the Branch view and the Trail honest as Flows are added (R1.3).

### Open questions for the product owner

1. **Planner views:** are Board, Table and Timeline still wanted with only Status, Due date and Tags? Each is smaller now, and the Table already exists as CSV.
2. **Focus:** is the Trail plus the Branch view enough, so that M4.5 can shrink to the Tour alone?
3. **Tour:** keep it in v1, or move it to the backlog?
4. **Outline home:** a tab in the left panel (proposed), or a separate rail?
5. **Custom Properties and workflow rules:** confirm they are out of v1.

---

## 1. How to use this plan (session protocol)

Start of every session:
1. Read this file's **Progress log** (section 9) and find the **Current milestone** in the header.
2. Read the milestone below, and only the spec sections it references.
3. Skim `/memories/repo/` notes for conventions learned in earlier sessions.

During a session:
- Work one milestone at a time, and finish it before starting the next.
- Tick tasks (`[x]`) as they are completed. If a task changes shape, edit it here instead of working around it.
- If a decision changes the spec, update [spec.md](spec.md) in the same session.

End of every session:
1. Update the **Current milestone** line in the header.
2. Add a row to the **Progress log** (date, milestone, what was done, what is next, blockers).
3. Record new conventions, commands and gotchas in repo memory.
4. Make sure the project builds, lints and tests pass (milestone Definition of Done below).

A milestone is sized to fit one working session. If one runs long, split it and note the split in the log.

## 2. Definition of Done (applies to every milestone)

- [ ] Type check, lint and unit tests pass in CI mode.
- [ ] New logic has unit tests, and new user flows have an end-to-end test.
- [ ] Keyboard-only operation works for everything added.
- [ ] Works in Light and Dark Mode, and in every Look that exists so far.
- [ ] Reduced-motion behavior implemented for every animation added.
- [ ] No new axe-core violations.
- [ ] Spec-referenced behavior matches the spec, or the spec is updated.
- [ ] Performance budget check run if the milestone touches layout or rendering (see 3.3).
- [ ] Progress log and memory updated.

## 3. Engineering foundations

### 3.1 Stack (from spec section 9)
- React + TypeScript + Vite, custom SVG renderer (no React Flow).
- Zustand + Immer, Dexie (IndexedDB). **As built:** undo history stores snapshots (not patches), Notes are Markdown text with a safe preview (no TipTap), and motion is a small hand-written animator (no spring library).
- Vitest (unit), Playwright (end-to-end, benchmark), axe-core. Visual regression is not set up yet (R0).
- ESLint 9 + Prettier. The package manager is npm.

### 3.2 Target repository layout

```
canopy/
  spec.md  plan.md  THIRD_PARTY_NOTICES.md
  package.json  vite.config.ts  tsconfig.json
  src/
    model/        types, schema + migrations, ids, ordering keys, pure tree operations
    store/        Zustand store, history (patches), selectors, derived data (roll-ups, lenses)
    layout/       tidy-tree engines per Flow, layout worker
    canvas/       viewport, renderer, topic, connector, handles, selection, minimap
    editor/       inline editing, keyboard map, clipboard
    ui/           top bar, inspector, command palette, toasts, preferences
    views/        outline, board, table, timeline
    theme/        design tokens (Mode x Look x Voice)
    motion/       tokens, springs, reduced-motion gate
    io/           json, markdown, opml, csv, export (png, svg, pdf)
    persistence/  IndexedDB, File System Access, autosave
    a11y/         announcer, tree semantics helpers
  public/stickers/
  tests/  e2e/  bench/
```

As built, the layout above holds with these differences: `settings/` (device settings), `stickers/` (original artwork and the catalog) and `dev/` (demo maps) were added, `views/` holds only a placeholder, `a11y/` holds the announcer, and `public/stickers/` was not needed because the artwork is code.

Architecture rules:
- `model/` is pure TypeScript with no React or DOM imports. Everything user-visible is expressed as model operations that return patches.
- Layout is a pure function: tree + measurements + Flow settings in, positions out. Rendering and animation only consume positions.
- Derived data (roll-ups, Filter matches, outline) is computed in selectors and never stored in the document.
- All colors, spacing, durations and fonts come from tokens. No hard-coded values in components.
- Stored data uses stable IDs and fractional ordering keys (CRDT-friendly, see spec decisions).

### 3.3 Performance budget (from spec 9.2)
- Benchmark maps of 500, 1,000 and 5,000 topics live in `bench/`, generated by a script.
- Budgets: 60 fps pan and zoom, under 100 ms for create, fold and edit.
- Checked at the end of M1.10, M4.2 and M5.7, and in CI from M5.7.

## 4. Phase overview

| Phase | Theme | Outcome | Spec refs | State |
|---|---|---|---|---|
| 1 | Foundation | A fast, keyboard-first mind map that saves and reloads | 3.1, 3.2 (Right, Down), 3.3, 3.8 (JSON) | Done |
| 2 | Expression | Notes, Stickers, Looks, Voices, export | 3.5, 3.6, 3.7, 3.8 | Done, simplified. Attachments cut |
| 3 | Planning | Status, Due date, Tags, Chips, Filters, roll-ups | 3.4 | Done, reduced. People, Approval, Priority, Progress cut |
| 3A | Interface and navigation rework (unplanned) | Floating panels, inspector, Trail, Branch view, Zen, pointer tools, lines, context menu | 2 (IA), 3.9 to 3.12 | Done |
| 4 | Delight and depth | Outline, semantic zoom, all Flows, Brain-dump, Focus, Tour | 3.1, 3.2, sections 4, 5, 6 | Not started |
| 5 | Planner views and polish | Board, Table, Timeline, history, accessibility audit, 5k performance | 3.4, section 6, 9.2 | Not started |

Each phase ends with a **release candidate** that is usable on its own.

---

## 5. Phase 1: Foundation

Goal: create, edit, move, fold, copy and save a map with a delightful keyboard and mouse model.

### M1.1 Scaffold and tooling
- [x] Create the Vite + React + TypeScript project in `canopy/` and choose the package manager (npm).
- [x] Configure ESLint, Prettier, Vitest, Playwright, axe-core and a CI script (`npm run check` runs typecheck, lint, format check, unit tests).
- [x] Create the folder layout from 3.2 with placeholder modules.
- [x] Add design token scaffolding (CSS variables) and a reset stylesheet.
- [x] Add `THIRD_PARTY_NOTICES.md` skeleton.
- [x] Save commands and conventions to repo memory.

Done when: `check` passes on an empty app that renders a titled blank page.

### M1.2 Data model and operations (done)
- [x] Types for Map, Topic, preferences (Phase 1 subset), and schema version `canopy/1` as in spec section 8. The in-memory model is a normalized topic table; the file form is nested (`toFile`, `parseFile`).
- [x] ID generator and fractional ordering keys.
- [x] Pure operations: create sub-topic, create peer (before and after), rename, delete branch, move branch (re-parent and reorder), fold toggle, duplicate branch, with cycle prevention. Also `moveSibling`, `foldToLevel`, `unfoldAll`, `selectionAfterDelete`.
- [x] Schema validation and a migration hook (`validateMap`, `parseFile` with readable errors). JSON file import/export logic is therefore already done; M1.9 only needs UI.
- [x] Unit tests including property-based tests for tree invariants (single Core, no cycles, unique IDs).

Done when: all operations are covered by tests and never produce an invalid tree.

### M1.3 Store, history and persistence (done)
- [x] Zustand store holding the document plus UI state (selection, editing target).
- [x] Undo/redo with grouping of rapid edits. History stores snapshots (structural sharing), not patches. Patch-based autosave is still planned for M5.7.
- [x] Autosave to IndexedDB (debounced, whole document), restore on load, new map. The map list is in the File menu. **Changed later:** a map is stored only after its first edit, and opening or starting a map is not an edit, so reloading an untouched Untitled map no longer leaves empty maps behind. A pending edit is written under its own map when another one is opened. Patch-based autosave is still planned for M5.7.
- [x] Save/open via File System Access API with download/upload fallback (`persistence/files.ts`, File menu).
- [x] Unit tests for history grouping and persistence round-trip.

Done when: reload restores the exact map and undo/redo works across all operations.

### M1.4 Layout engine (Right and Down) (done)
- [x] Topic measurement (text width and height, wrapping rules).
- [x] Tidy-tree layout for Right and Down Flows with variable-size topics and density settings.
- [x] Connector path generation (curved first).
- [x] Incremental work: measurements are cached per topic object, and the layout pass is a single O(n) sweep (4 ms for 5,000 topics), so no separate incremental engine was needed.
- [x] Unit tests for overlap-free layout and determinism, with a benchmark at 5,000 topics.

Done when: layouts have no overlaps on generated trees and the 5,000-topic full layout time is recorded in the log.

### M1.5 Canvas rendering and viewport (done)
- [x] SVG renderer for topics and connectors from layout output.
- [x] Pan (drag, wheel), zoom (Ctrl/Cmd+wheel, pinch, `⌘+`, `⌘-`), fit to screen (`⌘0`), zoom controls.
- [x] Viewport culling with a margin, plus text dropping out when zoomed far out over more than 600 topics.
- [x] Focus and selection rendering that follows the Look tokens (halo stays visible at any zoom).
- [x] Basic Minimal Look and Light/Dark Mode tokens (Dark follows the OS for now, the toggle is M1.9).

Done when: a 5,000-topic benchmark map pans and zooms at the target frame rate with culling.

### M1.6 Selection, inline editing and keyboard model (done)
- [x] Single and multi-select (click, `Shift`/`⌘`-click, `Shift`+drag box, `⌘A` selects the focused branch, `Shift`+arrow extends).
- [x] Inline title editing with `Space`/`F2` or double click. Text is selected on entry. Changes apply live (the topic resizes as you type) and are one undo step. `Esc` restores the old title and leaves no history. `Enter`, `Shift+Enter` and `Tab` inside the editor create the next topic, `⌘Enter` finishes.
- [x] Keyboard map for Phase 1 actions (`Tab`, `Enter`, `Shift+Enter`, arrows, `⌥`+arrows, `Del`, `⌘D`, `]` for fold (was `.`), `1`-`9`, `0`, `⌘+`, `⌘-`, `⌘ 0`, undo/redo, `Esc`).
- [x] Central shortcut registry (`editor/shortcuts.ts`): keys, labels and formatting. Handlers live in `editor/commands.ts`. Hints (M1.7) and the cheat sheet (M1.10) read the same list.
- [x] One tab stop: the map is a `role="tree"` with `aria-activedescendant`, and each topic is a `treeitem` with level, position, size, expanded and selected. Nothing needs DOM focus to move, which also works with culling.
- [x] Live-region announcer for create, move, fold, delete, undo and redo.
- [x] Measured at 5,000 topics: Tab to editor visible 85 ms, typing keeps up with frames.

Done when: a complete map can be built and edited without touching the mouse.

Decisions: Tab is captured for "add sub-topic", so `Esc` (when nothing else to cancel) and `Shift+Tab` leave the map, which avoids a keyboard trap. The editor textarea is sized in layout units and scaled with CSS, because text wraps differently at different font sizes.

### M1.7 Growth Handles with ghost preview (done)
- [x] Handles on hover (pointer) and on the focused topic (after key presses): child, peer before, peer after. The Core only offers sub-topics. Handles are 22 px HTML buttons at a fixed screen size, anchored to the real layout. Visibility is a device setting (on hover, always, never).
- [x] Ghost topic at the exact landing slot with the whole map shifted to make room. The preview layout is held so the subject does not move, and committing pans the view by the same amount, so the ghost becomes the real topic in place (same ID).
- [x] Click to create and open the editor. Drag from a handle snaps to the nearest attachment point of any visible topic (within 90 px), and releasing away from one cancels.
- [x] Shortcut hint strip (`HintStrip`, `hintsFor`) built from the registry: topic, Core, several topics, and editing.
- [x] Motion: tokens in `motion/`, a layout animator (`canvas/animator.ts`) that tweens every layout change outside React. New topics grow out of their parent and fade in, removed topics fold back and fade out, and typing never animates. Maps over 1,500 topics jump instead. Reduced motion jumps everywhere.

Done when: the ghost preview matches the final created position, and the hint strip is correct for each selection type.

Note: the animator already handles fold, delete and move, so M1.8 only needs to wire them and check the feel. Create latency at 5,000 topics is 68 ms (headless).

### M1.8 Fold, clipboard and drag to re-parent (done)
- [x] Fold Badge with the hidden count, a hover peek listing what is inside, click to unfold, and fold memory in the file. Folding by mouse from an expanded topic was added later: a circle with a curly brace on the sub-topic side (see 7A).
- [x] Copy, cut and paste: Canopy data (`application/x-canopy-branches+json`) plus a Markdown list on `text/plain`. Pasted plain text is read as an outline. `⌘V` pastes as sub-topics, `⌘⇧V` as peers. Style-only paste is deferred to Phase 2.
- [x] Drag to re-parent or reorder: a topic dropped on the middle of another becomes its child, on the top or bottom band it becomes a peer, with an insertion line or target highlight. Groups move together, nothing can be dropped into its own branch, `Esc` cancels.
- [x] Delete shows an Undo notification that disappears once the map changes again.
- [x] Fold, delete and move animate through the layout animator, with reduced-motion fallback.

Done when: all structural edits are undoable and animated, and copy/paste works between maps and external text editors.

Measured at 5,000 topics: fold 59 ms, unfold 129 ms.

Feedback applied: growth handles now appear only when hovering the selected (focused) topic, so browsing the map stays quiet. The Preferences option `always` shows them on the focused topic, `never` hides them.

### M1.9 Mode, Minimal Look and JSON import/export (done)
- [x] Light, Dark and Auto Mode with a toggle in the top bar, remembered on this device (`settings/appSettings.ts`).
- [x] Minimal Look tokens for both Modes. A fuller design review of spacing and type scale is part of M2.1 with the other Looks.
- [x] JSON save (file picker or download) and open (file chooser), with readable errors for bad files and a round-trip e2e test.
- [x] Top bar: editable map title, Maps list, New, Open, Save, shortcuts, Mode.
- [x] First-run hint under the Core until the first idea is added.

Done when: JSON export followed by import yields a deep-equal document.

### M1.10 Phase 1 hardening and release candidate (done, with gaps)
- [x] End-to-end suite for core flows (40+ tests), axe checks in Light, Dark, while editing and in the cheat sheet. Visual regression baselines are not set up yet.
- [x] Accessibility pass through axe and the tree semantics. A manual screen reader smoke test is still to do by a person.
- [x] Performance run on 500 and 5,000 topics: 60 fps pan and zoom, create 79 ms, fold 59 ms, unfold 129 ms. A 1,000-topic run was not done separately.
- [x] `?` cheat sheet built from the shortcut registry.

Done when: Phase 1 acceptance criteria in section 5.1 pass.

### 5.1 Phase 1 acceptance criteria
- Build a 50-topic map using only the keyboard in a reasonable flow with no dead ends.
- Reload restores everything. Undo and redo are correct across all operations.
- 5,000-topic map meets the performance budget.
- JSON round-trip is lossless.
- No axe-core violations in Light and Dark Mode.

---

## 6. Phase 2: Expression

Goal: make maps rich and beautiful, and shareable as images and documents.

### M2.1 Looks, Voices and Settings (done, with gaps)
- [x] Token sets for Looks (Minimal, High Contrast, Playful) and Voices (Clean, Editorial, Mono, Sketch) with self-hosted fonts (`theme/looks.css`, `theme/voices.ts`). The Voice applies to the map only; the app chrome stays in the system font.
- [x] Connector styles (curved, elbow, straight, tapered) and the Sketch wobble (stable per connector, so it does not shimmer).
- [x] Colour in Playful follows the level (the Core, then five colours that repeat). **Changed** from eight hues by top-level branch. Overriding a branch colour by hand is not built.
- [x] Settings (`⌘,`, or the Settings tab of the left panel) with map-level and device-level choices: Theme, Font, Font size, Layout, Spacing, Connectors, Property chips, Level numbers; Auto-pan, Trail, Text expansion, empty-topic removal, hints, handles, motion. This replaced the Preferences dialog in the interface rework (7A).
- [x] High Contrast: black on white and white on black, 2.5 px borders, and a different corner shape per level so level is not carried by colour. axe colour contrast passes in both Modes. A strict 7:1 measurement is not automated.
- [x] Playful motion: layout changes settle with a small overshoot.

Done when: every Look × Mode × Voice combination renders correctly and passes contrast checks.

### M2.2 Command palette and shortcut system (done)
- [x] Command palette (`⌘K`, or the ⌘K button) with fuzzy search (`ui/commandIndex.ts`), shortcuts shown, and recent commands (remembered on this device).
- [x] Every registry action is in the palette, plus map preferences (Look, Font, Connectors, Layout, Spacing, levels) and colour mode. A unit test fails if a new command is not reachable. Copy, cut and paste are browser events, so they are not palette entries.
- [x] `?` cheat sheet is generated from the registry (done in M1.10) and now includes the Topic content group.

Done when: every action in the app is reachable from the palette.

### M2.3 Notes (done, simplified)
- [x] Notes are Markdown, edited in a plain text field with a toolbar (bold, italic, heading, lists, task list, code, link) and a Write / Preview switch. **Deviation:** the plan said TipTap. A rich-text editor was left out to keep the bundle small and the note format plain. Revisit if people want live formatting.
- [x] Inspector (`i`) with a Note tab (`n` jumps to it), and a note icon on topics.
- [x] The renderer (`ui/markdownParse.ts`) supports headings, lists, task lists, code, quotes, tables, rules, bold, italic, strike, links. It builds React elements, so no HTML is ever injected, and only web and mail links are allowed. Raw HTML shows as text.
- [ ] Not built: hover peek card on the note icon and inline note preview at high zoom.

Done when: Notes round-trip through JSON and Markdown export and render safely. (Verified by unit tests.)

### M2.4 Attachments (built, then cut)
- [x] Built in Phase 2: files by picker, drag or paste, embedded as data URLs, an Inspector Files tab, and a paperclip on topics.
- [x] **Removed in the scope cut (7A).** The Files tab, the paperclip and the embed-limit settings are gone. Old files that contain attachments still open, and the fields are ignored. Link previews were never built because they need network requests, which conflicts with local-first.

Done when: nothing in the app refers to attachments. (Done.)

### M2.5 Stickers (done, redesigned)
- [x] Sticker picker (`s`) in the Stickers tab of the Inspector with search, up to four stickers per topic (one per corner), and removal. **Redesigned in the scope cut (7A):** the first pass used 71 system emoji and custom SVG upload. It is now 23 original die-cut stickers drawn in code (`stickers/art.tsx`), so they look the same everywhere and in exports, and nothing third-party is bundled. Custom upload was dropped.
- [x] Stickers land with a short stamp animation (`canvas/stampStore.ts`), and can also stick to lines (7A).
- [x] The Filter can pick topics out by sticker (7A).
- [x] **Deviation:** the plan said vendored Fluent Emoji. That is dropped (spec 9.3).
- [ ] Not planned: high-contrast variants, dragging and rotating stickers.
- [ ] Manual branch colour override is not built either (R3).

Done when: stickers render consistently in all Looks and survive export and import. (Survive export and import: yes. Consistent across platforms: no, see above.)

### M2.6 Image, SVG and PDF export (done, simplified)
- [x] Standalone SVG built from the layout (`io/svg.ts`), following the Look, Voice, connector style, level numbers and folds, with the map's font embedded.
- [x] PNG at 1×, 2× and 4× with an optional transparent background. The scale drops automatically when a map would be too large for a canvas.
- [x] PDF through the browser's print dialog: one page sized to the map, vector, with selectable text. **Deviation:** no multi-page tiling and no bundled PDF writer.
- [x] Export tab in the left panel (`⌘E`, or File > Export) with live preview, stickers and notes toggle, and "only the selected branches" or "only what the Filter picks out". CSV is the Table data.
- [x] Markdown outline with optional notes and links.
- [ ] Not built: frame export, and visual-regression baselines for exports (checked by eye and by unit and e2e tests of the files instead).

Done when: exports match the on-screen map in each Look, and text stays selectable in PDF.

### M2.7 Phase 2 hardening and release candidate (done, with gaps)
- [x] End-to-end tests cover every Look × Mode × Voice for accessibility (24 combinations) plus the dialogs, Inspector and export.
- [x] Accessibility and performance re-run. 5,000 topics: first paint 258 ms, 60 fps pan and zoom, create to editor 87 ms, fold 68 ms, unfold 141 ms.
- [ ] Not done: visual-regression screenshots, a performance run with Notes and Stickers on thousands of topics (the layout only adds a cached lookup per topic), and a manual bug bash by a person.

### 6.1 Phase 2 acceptance criteria
- A map with Notes and Stickers exports to PNG, SVG and PDF and looks right in every Look.
- High Contrast Look passes AAA contrast checks.
- Performance budget still holds with Notes and Stickers on a 5,000-topic map.

---

## 7. Phase 3: Planning

Goal: turn any map into a lightweight plan using Properties.

### M3.1 Property model and Status Set (done, then reduced)
- [x] Types for `props` and the Status Set (`model/types.ts`). Maps without a Status Set use the default one (Not started, In progress, Blocked, In review, Done, Canceled) and store their own copy once it is edited. **The scope cut removed** Roles, Approval, Priority, Progress and people from the types. The file reader ignores those fields in old files.
- [x] Operations in `model/planning.ts`: `setProps` (set, clear, bulk), `setStatusSet`, `ensureTag`, `removeTag`. Empty Properties are removed so plain maps stay plain.
- [x] Format: no migration was needed. The fields are optional in `canopy/1`, and removals only drop data on the next save.
- [x] Unit tests, including a round trip through the file format.

### M3.2 Roster (built, then cut)
- [x] Built in Phase 3: roster, People dialog, roles and "I am this person".
- [x] **Removed in the scope cut (7A).** Nothing in the app refers to people any more.

### M3.3 Chips on the canvas (done, reduced)
- [x] Status, due date and tag chips in a row under the title (`layout/chips.ts`, `canvas/Chips.tsx`), plus a note mark. Status uses a different shape per kind (hollow, half, tick, slash, flagged triangle), overdue dates are bold and underlined, so nothing relies on colour alone. Priority, people, approval and progress chips were removed with their Properties.
- [x] Density setting (Off, Compact, Full) in Settings, measured into layout.
- [x] Each topic's accessible name includes its Properties, for example "Draft launch plan, status In progress, due Oct 9".
- [x] The same renderer draws chips in SVG, PNG and PDF exports.
- [ ] Not built: chip morph motion for status change.

### M3.4 Property Quick-Add and inline shorthand (done, reduced)
- [x] `p` opens Quick-Add (status, due date, tag), and `t`, `d` and `g` open it for status, due date and tag. `Shift+P` opens the full Properties tab. Choices apply to the whole selection. (`o` for owner was removed with people.)
- [x] Shorthand in a title: `#tag`, `/status`, `^date` (today, tomorrow, weekdays, `+3d`, `eow`, `nov1`, `11/1`, `2026-11-01`). A preview shows under the topic while typing, and Enter, Tab or leaving turns it into Properties and removes it from the title. Undo brings the shorthand back. `@owner`, `@@approver` and `!p0`-`!p3` were removed.
- [x] Words that only look like shorthand (emails, `C#`, paths, bad dates) stay in the title.
- [ ] Deviation: conversion happens when the title is finished, not on every key.

### M3.5 Inspector Properties tab and bulk edit (done, reduced)
- [x] Properties tab for status, due date (start and end) and tags, for one or many selected topics. Mixed values show as "Mixed" and are left alone until changed.
- [ ] Approval, priority, progress and people were removed with the scope cut.

### M3.6 Roll-ups (done)
- [x] `computeRollups` (`model/rollup.ts`): counts by category, derived progress, date range and overdue count for each branch, in one pass, cached per edit.
- [x] A folded topic's badge shows `hidden count · done/total` (for example "12 · 3/7"), and the Properties tab shows a roll-up panel.
- [x] 5,000 topics with Properties: first paint 323 ms, Filter on 252 ms, 60 fps pan.

### M3.7 Filters (done; called Lenses in the first version)
- [x] Renamed from Lens to **Filter**. The first version had presets (Mine, Overdue, Blocked, Awaiting my approval, Due this week). The rework replaced them with a **Filter panel** (left panel, `/` or `F`) that ticks choices in groups: Due date (overdue, this week, a date range), Status, Tags and, newly, **Stickers**. Choices in a group are alternatives, and the groups combine. Saved Filters are still read from a file, and there is no editor for them yet.
- [x] A pill over the map shows the active Filter with its match count, Highlight or Isolate, and a switch off. `.` and `,` jump between matches (opening folded branches on the way), and each jump is announced. (These were `]` and `[` before the bracket keys were reassigned.)
- [x] Highlight fades the rest. Isolate lays out only the matches and the path to them, with the layout animation. The Trail uses the same machinery.
- [x] The export can be limited to what the Filter picks out.

### M3.8 Settings, workflow rules and CSV export (done, reduced)
- [x] CSV export has one row per topic with its path, Status, dates and tags, defuses spreadsheet formulas, and respects the Filter and the selection. The Markdown outline can write Properties as the same shorthand.
- [ ] The Planning section of Preferences (Status Set editor, approval rule, who is using this device) was **removed** with the old Preferences dialog. The workflow rule went with Approval. A Status Set editor is planned again in M5.4.
- [ ] Not built: date format, first day of the week and overdue behaviour settings.

### M3.9 Phase 3 hardening and release candidate (done, with gaps)
- [x] Accessibility checks cover chips in every Look in light and dark, Quick-Add, the Properties tab, the panels and an active Filter.
- [x] Benchmarks at the end of Phase 3: 5,000 topics, plain and with Properties, hold 60 fps pan and zoom. Fold 99 ms and unfold 154 ms (a little slower than Phase 2). **Not re-run since** (R0).
- [ ] Not done: visual-regression baselines, and a bug bash by a person.

### 7.1 Phase 3 acceptance criteria (as reduced)
- Typing `Draft launch plan #launch /doing ^fri` creates a topic with the right Properties and Chips.
- A folded branch shows a correct roll-up summary.
- The Filter works on the map and in exports.
- Performance budget holds on a 5,000-topic map with Properties. (Last checked before the interface rework, see R0.)

The original acceptance items about `@priya @@sam !p1` and "Awaiting my approval" no longer apply.

---

## 7A. Unplanned: interface and navigation rework (done)

This work was not in the original plan. It came from using the app and was done in small requests after Phase 3. Each item has end-to-end coverage, and the spec describes the result (3.9 to 3.12). All of it is done.

**Scope cut.** Planning was reduced to Status, Due date, Tags and Stickers. Removed: attachments, people, roles, approval, priority, progress, the roster, custom Properties and workflow rules. Old files still open and ignore those fields.

**Interface**
- [x] A slim top bar (File menu, title with a save indicator, undo and redo buttons, command palette) and floating panels: Settings, Filter, Tags and Export on the left, and an Inspector (Properties, Stickers, Note) on the right that opens when a topic is clicked.
- [x] Undo and Redo as explicit icon buttons in the top bar that dim when there is nothing to step through, with the shortcut in the tooltip.
- [x] A context menu for topics, lines and empty canvas, also from the keyboard (menu key, `Shift+F10`).
- [x] Tooltips with shortcuts, a searchable cheat sheet, and the hint strip fed from the registry.
- [x] Looks refined: Minimal has very subtle card borders and a flat shadow, Playful has flat level-coloured shadows (no glow), the Dark canvas dots are faint, lines are slightly thinner, and level numbers are small, faded and monospace.
- [x] Font size (Small, Medium, Large) and level numbers in Settings.

**Navigation aids**
- [x] **Trail**: highlight or isolate the way up to the Core, a pill to switch modes, `R` to toggle, and a status bar showing the path with Copy path inline after it. Copy path writes `!!A>B>C`, so pasting it into a new topic rebuilds the chain with text expansion.
- [x] **Branch view**: `[` (or the brace button on a topic's parent side) folds everything above into one dotted node, and clicking it, `[` again or Unfold everything returns.
- [x] **Zen** (`Z`), **pointer tools** (Select `V`, Pan `H`, Zoom `Shift+Z`), and an unfold-everything button.
- [x] Fold buttons are circles with a curly brace on each side of a topic. They keep a usable size when zoomed out and stop growing when zoomed in far, as the add handles do.

**Editing**
- [x] **Lines** with a label and up to three stickers, picked by click or `L`, with a quick sticker bar.
- [x] **Insert between levels**: `W`, `Shift+W` and an in-line handle.
- [x] **Text expansion** (`!!a>b>c`, `!!a, b, c`) with a guide, empty-topic removal and auto-pan.
- [x] **Stickers** redesigned as original art, with a stamp landing, and a Filter by sticker.

**Fixes found on the way**
- [x] A press that ended outside the canvas (for example when the Inspector opened under the pointer) left a drag half-started, which made the context menu and Escape misbehave. Releases anywhere now end the press.
- [x] Reloading an untouched map no longer stores an empty map (M1.3).
- [x] Shortcut changes: `]` fold, `[` Branch view, `.` and `,` for Filter matches.

---

## 8. Phases 4 and 5

### Phase 4: Delight and depth (not started)

Goal: make large maps easy to understand and present, and make the app accessible beyond the canvas. The proposed order is in section 0 (R1).

### M4.1 Outline view and tree semantics
- [ ] Outline as a fifth tab in the left panel, live-synced with the canvas (selection, fold, edit) with cross-highlight animation.
- [x] Canvas exposed as `role="tree"` with level, expanded, position and size attributes (done in M1.6).
- [ ] Roll-ups and Chips surfaced in the Outline, and the Filter and the Trail applied to it.
- [ ] Screen reader test pass by a person.

### M4.2 Semantic zoom and level of detail
- [ ] Zoom thresholds for title only, dot, and full detail (Notes inline, Chips). Today: full, and text-free below zoom 0.35 on maps over 600 topics.
- [ ] Smooth transitions between detail levels.
- [ ] Performance run on 5,000 topics.

### M4.3 Remaining Flows, per-branch Flow and morph
- [ ] Left, Both and Radial layouts, and a Flow switcher. (`L` now labels a line, so the key needs choosing.)
- [ ] Per-branch Flow override with mixed-layout correctness tests.
- [ ] Flow morph animation (arcs, stagger) limited to visible topics, with reduced-motion fallback.
- [ ] Make the growth handles, insert-between, the Branch view's dotted node, the Trail and the fold buttons work in every Flow.

### M4.4 Brain-dump import
- [x] `!!` text expansion and pasted outlines (done).
- [ ] Recognise shorthand (`#tag /status ^date`) while pasting, and OPML paste.
- [ ] Unfurl animation, and one-step undo for large pastes (a 200-topic cap exists).

### M4.5 Focus and Tour
- [~] Focus: the Trail (highlight or isolate) and the Branch view already cover most of it. Decide whether a separate dim-everything-else mode (`F` is now the Filter key) is still needed.
- [ ] Tour model (ordered steps, captions), editor to arrange steps, and present mode with camera choreography.
- [ ] Keyboard controls and exit behavior, with reduced-motion cuts.

### M4.6 Minimap, navigation and Phase 4 hardening
- [ ] Minimap and navigation shortcuts.
- [ ] End-to-end, visual regression, accessibility and performance passes.
- [ ] Bug bash.

Acceptance: a screen reader user can build and navigate a map from the Outline. A 5,000-topic map stays within budget in every Flow. A Tour can be presented from start to finish.

### Phase 5: Planner views and polish (not started)

Goal: finish planning views and bring the product to release quality. Board, Table and Timeline now work over Status, Due date and Tags only, and they are an open question (section 0).

### M5.1 View framework and Board
- [ ] View switcher (`⌘1` to `⌘4`) and shared selection and Filter across views.
- [ ] Board view with columns by status category or Status, drag to change Status, keyboard moves with announcements. (Grouping by Owner or Priority went with those Properties.)
- [ ] Shared-element transitions between Map and Board.

### M5.2 Table view
- [ ] Sortable, editable columns (Status, Due, Tags) with path breadcrumbs, keyboard navigation and virtualization. The data and CSV already exist (`model/table.ts`).

### M5.3 Timeline view
- [ ] Bars by start and due date grouped by branch, drag to change dates, keyboard alternatives.

### M5.4 Status Set and saved-Filter editors (re-scoped)
- [ ] A Status Set editor (rename, category, flag, add, remove, reset). The model operation `setStatusSet` exists.
- [ ] A saved-Filter editor (name, save the current choices, apply, delete). Saved Filters are already read from files.
- [x] Custom Properties and workflow rules are **dropped** with the scope cut.

### M5.5 Visual history
- [ ] Scrubbable history timeline, and restore a single branch from the past.

### M5.6 Shortcut customization
- [ ] Rebind shortcuts with conflict detection and import/export of bindings.

### M5.7 Performance at 5,000 topics
- [ ] Layout in a Web Worker, incremental layout verified, animation limits, patch-based autosave.
- [ ] Benchmark thresholds enforced in CI.

### M5.8 Import, accessibility audit and localization prep
- [ ] CSV import with column mapping, OPML import polish.
- [ ] Full accessibility audit (WCAG 2.2 AA, AAA in High Contrast) and fixes.
- [ ] Externalize strings and set up localization.

### M5.9 Release hardening
- [ ] Bug bash, documentation, onboarding polish, About and license credits, final regression pass.

Acceptance: everything in the spec for v1 is implemented, the Definition of Done holds, and the performance and accessibility budgets are met.

---

## 9. Progress log

| Date | Milestone | Done | Next | Blockers or notes |
|---|---|---|---|---|
| 2026-10-08 | Planning | Spec v0.2 finalized, decisions resolved, this plan created | M1.1 Scaffold and tooling | None |
| 2026-10-08 | M1.1 | Scaffolded Vite 8 + React 19 + TS 6 with Vitest, Playwright + axe, ESLint 9, Prettier, tokens, folder layout. `npm run check`, build and e2e smoke pass | M1.2 Data model and operations | ESLint pinned to 9 because jsx-a11y does not yet support 10. Revisit when it does |
| 2026-10-08 | M1.2 to M1.5 | Model and ops (75 unit tests incl. property-based), store with undo/redo, IndexedDB autosave, file save/open helpers, tidy-tree layout (5,000 topics in 4 ms), SVG canvas with culling, pan/zoom/fit, selection halo, light/dark tokens. Reviewed in the browser in both colour schemes. Added `?demo=N` dev maps, `e2e/canvas.spec.ts` (axe in light and dark) and `npm run bench` (headless Chromium: 60 fps pan and zoom at 500 and 5,000 topics, first paint about 190 ms) | M1.6 Selection, inline editing and keyboard model | Not yet measured: edits (create/fold) at 5,000 topics, text-visible zoom levels with many topics. Check these in M1.6 and M1.10 |
| 2026-10-08 | M1.6 | Shortcut registry and commands (arrows, create, edit, delete, duplicate, fold, reorder, levels, undo/redo, select), inline title editor, tree semantics with `aria-activedescendant`, live-region announcer, Shift+drag selection box, keyboard e2e flows incl. axe while editing, edit-latency benchmark (Tab to editor 85 ms at 5,000 topics). 102 unit and 13 e2e tests pass | M1.7 Growth Handles with ghost preview | Still to measure in M1.10: fold/unfold at 5,000 topics with text visible. Idle ideas: hint strip needs registry labels (ready) |
| 2026-10-08 | M1.7 | Growth Handles, ghost preview with held layout, drag-to-slot, hint strip, motion tokens and layout animator (create, remove, fold-ready), reduced-motion path. 122 unit and 21 e2e tests pass, benchmarks unchanged (create to editor 68 ms at 5,000 topics) | M1.8 Fold, clipboard and drag to re-parent | Fold Badge and drag re-parent still need UI. The animator already tweens fold, delete and move |
| 2026-10-08 | M1.8 to M1.10 | Fold badge and peek, clipboard (Canopy data and Markdown), drag to re-parent, undo toast, Mode toggle, JSON open and save, cheat sheet, e2e suite with axe in light, dark, editing and the cheat sheet, benchmarks at 500 and 5,000 topics | M2.1 | Mouse fold from an expanded topic is keyboard-only for now |
| 2026-10-08 | M2.1 | Looks (Minimal, High Contrast, Playful), Voices (Clean, Editorial, Mono, Sketch) with bundled fonts, four connector styles, level badges, Preferences dialog with Map and Device scopes, 34 Look and Voice e2e tests | M2.2 | Manual branch colour override deferred |
| 2026-10-08 | M2.2 | Command palette with fuzzy search and recents; every command reachable | M2.3 | None |
| 2026-10-08 | M2.3 to M2.5 | Inspector (Note, Files, Stickers), safe Markdown renderer, attachments with embed limit, emoji stickers with SVG upload, topic extras row measured into layout, clipboard now keeps topic content | M2.6 | Simplifications listed under each milestone |
| 2026-10-08 | M2.6 and M2.7 | SVG, PNG, PDF (print) and Markdown export with preview, Phase 2 test and benchmark pass | M3.1 | PDF is via the print dialog |
| 2026-10-08 | M3.1 to M3.4 | Planning model (Properties, roster, Status Set, rules, dates, shorthand parser, roll-ups, Lenses, table and CSV) with 32 unit tests, chips on the canvas, Quick-Add, shorthand in titles | M3.5 | None |
| 2026-10-08 | M3.5 to M3.9 | Properties tab with bulk edit, People dialog, Lens control and navigation, Planning preferences, CSV and shorthand Markdown export, File menu to keep the top bar short, accessibility and benchmark runs | Phase 4 | Chip morph motion, drag-from-roster, date and week preferences left out |
| 2026-10-08 | UI rework | Slim top bar (File menu, title, search). Floating side panels that shrink to stripes: details on the right (opens when a topic is clicked: properties, note, files, stickers as folding sections), map tools on the left (appearance, lens, people, planning, export, settings) replacing the modal dialogs. Calmer dark Minimal and Playful. Selection now has its own colour, an offset halo and a light wash | Phase 4 | Command palette, Quick-Add, Lens picker and the shortcut sheet are still popovers |
| 2026-10-08 | Scope cut | Kept only stickers, status, due date and tags. Removed attachments, people, approvals, priority, progress and the roster (old files still open, ignoring those fields). Stickers are now original die-cut artwork that sticks to the four corners of a topic. Details panel opens on click and closes with its button, with no stripe. Segmented controls use icons where the icon says it all. Editing a topic shows one selection mark | Phase 4 | Notes remain. Property chips show status, due date, tags and a note mark |
| 2026-10-08 | Interface and navigation rework (7A) | Pointer tools, Trail with status bar, Branch view, Zen, lines with labels and stickers, insert between levels, context menu, text expansion, empty-topic removal, auto-pan, font size, curly-brace fold buttons on both sides, unfold-everything button, undo and redo buttons, Filter by sticker, Minimal and Playful flat shadows, smaller level numbers. Saving now waits for the first edit. Fixed a stale-press bug that broke the context menu. 263 unit and 176 end-to-end tests pass | R0 housekeeping, then M4.1 Outline | Benchmarks not re-run since Phase 3. Fold buttons, shadow rects and the in-line insert handle add DOM per topic, so measure first |
| 2026-10-08 | Spec and plan convergence | Spec rewritten as v0.3 with Built, Planned and Cut tags and a change list (section 12). This plan rewritten to match: reduced Phases 2 and 3, section 7A for the unplanned work, Phase 4 and 5 re-scoped, remaining work and open questions at the top, notices file corrected | R0, then M4.1 | Five open questions for the product owner at the top of this file |
| 2026-10-09 | References and Find | **References:** a topic can point at one existing topic (`referenceTo`), drawn as a dashed arrow. The upper peer handle became the Reference Handle: drag onto a topic to connect, or click it or press `X` to search by path. Click an arrow for a delete icon, right-click it for Go to, Change and Remove. Deleting a topic clears references into it, and bad references are rejected on open. **Find:** `⌘F` is now a fuzzy topic and path search that reveals the result, with *Advanced filters…* opening the Filter panel (`F` and `/` open the panel directly, replacing the old Filter dialog). Unit and e2e tests added. | M4.1 | A topic holds one reference only; several per topic would change `referenceTo` to a list |

## 10. Backlog (post-v1, not scheduled)

- Real-time collaboration and notifications (data model is ready for it).
- People, Roles and Approval, if collaboration returns. The file format ignores them today.
- Attachments with a size limit, if there is a call for them.
- Dependencies between topics, critical path.
- Custom Properties and workflow rules.
- More sticker sets, and custom sticker upload.
- Additional import formats (FreeMind, XMind).
- Templates gallery.

## 11. Conventions and gotchas (to copy into repo memory)

Commands: `npm run check` (types, lint, format, unit), `npx playwright test` (end-to-end), `npm run bench`, `npm run dev` (port 5173, `?demo=14` is a small map, `?demo=40&plan=1` has Properties and stickers).

Gotchas learned the hard way:
- There is no git. Prettier reformats code, so re-read a file before an exact-text edit.
- On this Mac Playwright must use `Meta` (not `ControlOrMeta`) for zoom keys, because the app treats it as macOS.
- `boundingBox()` of an SVG topic includes its invisible fold buttons. Measure `.topic-box` when geometry matters.
- `.panel button { font: inherit }` overrides pill sizes. Use `.panel .name` selectors.
- Zustand selectors must return stable values. A selector that builds a new Set or array each call causes an infinite render loop. Derive with `useMemo` instead.
- axe checks the contrast of `aria-hidden` text too.
- A pointer press can end outside the canvas when a panel opens under it, so never rely only on the canvas's own `pointerup`.
- The e2e storage state disables the empty-topic removal setting.
- Wait for the first fit before measuring sizes in tests.
- Maps store only after the first edit. Tests that reload must edit first and wait for the save.
- Level numbers are measured with a fixed monospace advance (`LEVEL_PREFIX_SCALE` in `layout/measure.ts`), and the CSS size in `theme/looks.css` must stay in step.
