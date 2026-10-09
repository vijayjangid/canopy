# Product Spec: Canopy (working name)

An enterprise-grade, local-first mind-mapping and light planning app that is fast, accessible and enjoyable to use.

Status: v0.3, converged with the implementation on 2026-10-08. Phases 1 to 3 are built, plus an unplanned round of interface and navigation work (section 12). Phases 4 and 5 are not started.

How to read this spec: each feature heading carries a tag.

- **[Built]** works in the app today.
- **[Planned]** is still in scope for v1 and not started (see plan.md, "Remaining work").
- **[Cut]** was in v0.2 and was deliberately removed from v1. Section 12.1 lists them.

Where the app differs from what v0.2 said, the text below describes the app, and section 12 lists the change.

---

## 1. Product principles

1. **Keyboard-first, mouse-delightful.** Every action works from the keyboard. The mouse gets rich affordances and hints, not a separate feature set.
2. **Structure and expression are separate.** *Look* (theme, font, stickers) never changes the data. The same map can be restyled in one click.
3. **Motion explains, never decorates.** Every animation shows cause and effect, such as where a node came from or where it went.
4. **Accessible by default.** The map is a real tree for assistive tech, not just pixels on a canvas.
5. **Local-first and private.** It works offline and autosaves. No account is needed to be productive.
6. **Progressive depth.** The first-run view is a blank map with a cursor. Power features (Properties, Filters, Tour) appear through hints and the command palette.
7. **A map is also a plan.** Ideas become work without leaving the map or converting to another tool.

## 2. Terminology and taxonomy

| Concept | Term | Notes |
|---|---|---|
| Whole document | **Map** | `.canopy.json` |
| Root node | **Core** | Exactly one per map |
| Node | **Topic** | Title plus optional payload |
| Child / Sibling | **Sub-topic / Peer** | |
| Topic + descendants | **Branch** | The unit for fold, copy, move, style and layout |
| Depth | **Level** (L0 = Core) | Optional level badge |
| Fold / Unfold | **Fold / Unfold** | The one pair of words used everywhere in the interface. A folded branch shows a **Fold Badge** with a count |
| Markdown note | **Note** | Markdown, written as text with a Write / Preview switch |
| Decorative marks | **Stickers** | Original die-cut artwork. Expressive only, and also searchable through the Filter |
| Structured metadata | **Properties** | Typed fields on a topic: Status, Due date, Tags |
| Visible form of a Property | **Chip** | Compact pill on the topic (status shape, due date, tags, note mark) |
| Workflow states | **Status Set** | Ordered states, each in a category (see 3.4) |
| Hover add-buttons | **Growth Handles** | Child to the right or below, a peer below, and one that inserts a topic between two levels. The handle above the topic is the **Reference Handle** |
| Link to another topic | **Reference** | A dashed arrow from one topic to an existing topic elsewhere in the map, so a shared branch is linked instead of copied |
| The line from a topic up to its parent | **Line** | Can carry a label and up to three stickers |
| The way from a topic up to the Core | **Trail** | Highlighted, or isolated, with a status bar that shows it as a path |
| One branch with everything above it folded | **Branch view** | The rest of the map becomes one dotted node |
| Horizontal / Vertical / Radial | **Flow** (Right, Down built. Left, Both, Radial planned) | Settable per map. Per-branch override is planned |
| Light / dark | **Mode** | Light, Dark, Auto |
| Minimal / High-contrast / Playful | **Look** | Independent of Mode |
| Font choice | **Voice** | Sketch, Editorial, Mono, Clean |
| Global settings | **Settings** | Map-level (saved in the file) and device-level (kept in this browser) |
| Plain-text alternate view | **Outline** | Live-synced with the canvas |
| Pick out topics by Property or sticker | **Filter** | Dims non-matching topics (for example "Blocked", "Due this week", the Star sticker) |
| Planner alternate views | **Board / Table / Timeline** | Projections of the same Properties |
| Presentation | **Tour** | Walks branches in a chosen order |
| Spotlight | **Focus** | Dims everything outside the selected branch |

### Information architecture

- **Top bar [Built]:** a File menu (New, Open, Save a copy, recent maps), the map title with a save indicator, and the Command Palette (⌘K) and shortcut sheet buttons. Look, Mode and Flow live in the left panel instead.
- **Canvas [Built]:** the infinite map.
- **Left panel [Built]:** a strip of four tabs that opens into a floating panel: Settings (appearance, layout and behaviour), Filter, Tags and Export. The Outline is planned to join it.
- **Right inspector [Built]:** floating details panel that opens when a topic is clicked and closes with its own button. Tabs: Properties, Stickers, Note. When a line is picked, the Stickers tab edits the line.
- **Bottom-left toolbar [Built]:** pointer tools (Select, Pan, Zoom), fit to screen, unfold everything, Zen. A minimap is planned.
- **Bottom-center [Built]:** a transient shortcut hint strip that adapts to the current selection, and a Trail pill.
- **Status bar [Built]:** the Trail as a path from the Core to the focused topic, with Copy path and, in a Branch view, Unfold everything.
- **View switcher [Planned]:** Map | Board | Table | Timeline.

## 3. Feature specification

### 3.1 Canvas and topic creation [Built, with Brain-dump partly planned]

- **Growth Handles:** hovering or focusing a topic shows `+` handles on its right (sub-topic) and bottom (peer below) edges, and one on the line above it that inserts a topic between the topic and its parent (hold `Shift` to take all its peers along). The handle on the top edge is the Reference Handle (see 3.10). "Add peer above" stays available as `Shift+Enter`, the context menu and the palette.
  - **Ghost preview:** hovering a handle shows a translucent ghost topic at its exact landing position, and surrounding topics shift slightly to make room.
  - **Click** creates the topic and enters inline edit.
  - **Drag from a handle** creates a topic at the drop point with a magnetic snap to valid slots.
  - Handle visibility is a device setting: on hover, always or never.
- **Keyboard:**
  - `Tab` adds a sub-topic, `Enter` adds a peer, `Shift+Enter` adds a peer above, `⌘Enter` finishes editing.
  - `W` inserts a topic between this one and its parent, and `Shift+W` between it and its sub-topics.
  - `Space` edits, `F2` renames, `Del` deletes the branch, `⌘D` duplicates.
  - Arrow keys move spatially, and `⌥+Arrows` reorders peers.
  - `1–9` folds the map to Level N, and `0` unfolds all.
- **Text expansion [Built, replaces part of Brain-dump]:** a title that starts with `!!` expands into topics when it is finished: `!!a>b>c` makes a chain of children and `!!a, b, c` makes peers. A guide under the editor says what the result will be, one undo puts the text back, and a single expansion is capped at 200 topics. It can be turned off in Settings.
- **Brain-dump [Partly built]:** pasting an indented text outline or Markdown bullets onto a topic unfurls a branch. OPML paste, the unfurl animation and token recognition on paste are planned.
- **Empty topics [Built]:** a new topic left without a title or details is removed when you move on (a device setting).
- **Multi-select [Built]:** marquee, `Shift`-click and `⌘A` within a branch.
- **Drag to re-parent [Built]:** a drop-target indicator shows the exact insertion line. Dropping on a topic makes it a sub-topic, and dropping between two topics makes it a peer.
- **Auto-pan [Built]:** the view keeps the topic you are working on in view as the map changes (a device setting).
- **Pointer tools [Built]:** Select (`V`, the default), Pan (`H`, or hold `Space` and drag) and Zoom (`Shift+Z`, or hold `⌘`). With Zoom, click zooms in, `Alt`-click zooms out, and dragging an area fills the view with it. The middle button always pans.
- **Context menu [Built]:** right-click a topic, a line or empty canvas for the actions that otherwise need a shortcut, with the shortcut shown. It opens from the keyboard with the menu key or `Shift+F10`.
- **Command Palette (⌘K) [Built]:** every action is searchable, with its shortcut shown next to it, plus map and device settings.

### 3.2 Flow (layout) [Right and Down built, the rest planned]

- **Flows:** Right and Down are built. Left, Both (balanced) and Radial are planned.
- **Per-branch Flow override [Planned]:** for example, a Radial Core with a Down branch for a timeline.
- **Spacing density [Built]:** Compact, Comfortable, Airy.
- **Flow morph [Planned]:** switching Flow animates every topic along an arc to its new position (see section 5). Today a change of Flow animates through the ordinary layout tween.

### 3.3 Copy, paste, fold [Built, except paste style]

- Copy and paste a topic or a branch as JSON (in-app, preserves everything including Properties, Notes and Stickers) and as Markdown (to other apps). Pasted plain text is read as an outline.
- **Paste modes:** `⌘V` pastes as a sub-topic and `⌘⇧V` pastes as a peer. `⌘⌥V` (style only) is not built.
- **Fold:** press `]`, click the fold button, or click the Fold Badge. The fold button is a circle with a curly brace, shown on the side where the sub-topics are, when you hover or select a topic. `0` unfolds everything, and so does the Unfold everything button in the bottom-left toolbar.
- **Fold Badge:** shows the hidden count and a **peek** of the first children on hover. It also shows a rolled-up summary of Status when there is one (for example "12 · 3/7"). `⌥`-click to fold all peers is not built.
- **Fold memory:** fold state persists in the file.

### 3.4 Properties (metadata for planning) [Built, reduced scope]

Every topic can carry Properties. They are optional and invisible until used, so a plain mind map stays plain. v1 keeps three: Status, Due date and Tags. People, Roles, Approval, Priority, Progress and custom Properties were cut (section 12).

**Built-in Properties**

| Property | Type | Notes |
|---|---|---|
| Status | Single choice from the Status Set | Default set below, editable |
| Due date | Date (optional start date) | Shows as a compact date, bold and underlined when overdue |
| Tags | Multi-choice | User-defined and coloured, managed in the Tags tab of the left panel |
| Custom | Text, number, date, single or multi choice, checkbox, link | **[Cut]** |

**Adding Properties**
- `P` opens the **Property Quick-Add** popover on the selected topic. Type to filter, with fuzzy matching and keyboard-only operation. `T` goes straight to Status, `D` to Due date and `G` to Tags. `Shift+P` opens the Properties tab.
- Inline shorthand while editing a title: `#launch` adds a tag, `/blocked` sets status and `^fri` sets a due date (`today`, `tomorrow`, weekdays, `+3d`, `eow`, `nov1`, `11/1`, `2026-11-01`). A preview shows under the topic while typing, and finishing the title turns it into Properties and removes it from the text. Undo brings the shorthand back. Words that only look like shorthand (emails, `C#`, paths, bad dates) stay in the title. Conversion happens when the title is finished, not on every key.
- The Properties tab in the inspector is the full editor, including bulk edit when several topics are selected. Mixed values show as "Mixed" and are left alone until changed.
- The Markdown outline export can write Properties as the same shorthand. Recognising shorthand while pasting is **[Planned]** with Brain-dump.

**Chips (how Properties show on the canvas)**
- **Status:** a shape per kind, not only colour: hollow, half, tick, slash and a flagged triangle.
- **Due date:** compact date, emphasised when overdue.
- **Tags:** a dot per tag in the tag's colour.
- **Note:** a small mark on a topic that has a Note.
- **Chip density** (Settings): Off, Compact, Full. It is measured into the layout, so topics grow to hold their chips.
- Chips are also drawn in SVG, PNG and PDF exports.
- Chips that fade with semantic zoom are **[Planned]** with M4.2. Today, zoomed far out, text and chips give way to icons for what a topic holds.
- Each topic's accessible name includes its Properties, for example "Draft launch plan, status In progress, due Oct 9".

**Status Set (default, editable)**
- *Not started* (category: To do)
- *In progress* (category: Active)
- *Blocked* (category: Active, flagged)
- *In review* (category: Active)
- *Done* (category: Complete)
- *Canceled* (category: Canceled)
- A map can carry its own Status Set in the file, and each state must belong to one of the categories To do, Active, Complete or Canceled so roll-ups and filters still work. The model supports adding, renaming and removing states, but the editor was removed with the old Preferences dialog, so today everyone uses the default set. **[Planned]** to bring an editor back (plan, M5.4).
- **Workflow rules [Cut]:** the "can't mark Done while Approval is Pending" rule went with Approval.

**Roll-ups [Built]**
- Parent topics summarise their branch: counts by status category, derived progress, earliest and latest due date, and overdue count. They are computed in one pass and cached per edit.
- Roll-ups show on the Fold Badge ("12 · 3/7") and in the Properties tab. They will also show in the Outline when it exists.

**Roster (Members) [Cut]**
- The local list of people, Roles and "I am this person" went with People. Old files that still contain them open normally, and those fields are ignored.

**Find a topic and Filters [Built]**
- **Find a topic (`⌘F`):** a fuzzy search over every topic by title or full path. Choosing a result unfolds the path to it, selects it and scrolls it into view. Without a query it lists the first topics, and the list is capped (60) so it stays fast on large maps. An *Advanced filters…* button opens the Filter panel.
- The Filter panel (opened with `/` or `F`, with the cursor in its search box) ticks choices in four groups: Due date (overdue, this week, a date range), Status, Tags and Stickers. Choices inside a group are alternatives, and the groups combine (AND). Only the stickers that are on the map are offered.
- **Filter modes:** *Highlight* (non-matching topics fade) or *Isolate* (non-matching topics are hidden, with the paths to matches kept).
- A Filter tells you how many topics match, and `.` and `,` jump to the next and previous match, opening folded branches on the way and announcing each jump. A pill over the map shows the active Filter with its mode and a switch off.
- Filters are also used by the export ("only what the Filter picks out").
- **Saved Filters [Partly built]:** a map file can carry named Filters and they are read and kept, but there is no editor for them yet.
- Filters following you into the Outline and Board, Table and Timeline views are **[Planned]** with those views.

**Planner views (projections of the same data) [Planned]**
- **Board:** columns by Status category or Status. Dragging a card changes its Status.
- **Table:** one row per topic with sortable and editable columns, and a path breadcrumb for context. The data side exists today as the CSV export.
- **Timeline:** a lightweight bar chart by Due date and Start date, grouped by branch. Dragging bars changes dates.
- Grouping by Owner or Priority is cut with those Properties.
- Switching views keeps the selection and animates topics between positions (see section 5).
- Out of scope for v1: dependencies, resource levelling, critical path.

### 3.5 Note, Stickers [Built, simplified], Attachments [Cut]

- **Note [Built, simplified]**
  - Markdown, written in a plain text field with a toolbar (bold, italic, heading, lists, task list, code, link) and a Write / Preview switch. **Deviation:** v0.2 asked for a WYSIWYG editor (TipTap) with a source toggle. A rich-text editor was left out to keep the bundle small and the note format plain. Revisit if people want live formatting.
  - The preview supports headings, lists, task lists, code, quotes, tables, rules, bold, italic, strike and links. It builds React elements, so no HTML is ever injected, only web and mail links are allowed, and raw HTML shows as text.
  - `N` jumps to the Note tab. A topic with a Note shows a small mark on the topic and on its tab.
  - **[Planned]** inline preview of the first lines at high zoom, and a peek card on hover.
- **Pictures [Built, new]**
  - Pasting an image from the clipboard (`⌘V`, or Paste in the topic's context menu) puts it on the focused topic, above the title. Text or Canopy topics on the clipboard still paste as topics, so a picture is used only when no text was copied with it.
  - The topic sizes itself to the picture: it shows at its own size, scaled down (never up) to fit at most 280 × 200 units, with the title below. A topic with a picture and no title shows no placeholder text.
  - On paste the image is scaled so its longest side is at most 1280 px and stored in the map as a WebP data URL (PNG where the browser cannot write WebP); further steps down are tried if it is still large. If it cannot be made small enough, a message says so and nothing changes.
  - Pasting also works while the title is being edited: the picture goes on that topic, the typed text is kept and editing carries on. A new, otherwise empty topic that gets a picture is not removed as blank.
  - One picture per topic; pasting another replaces it (and clears its description). Undo restores the old one.
  - **Controls:** pointing at or selecting a topic with a picture shows two round buttons on the picture's top-right corner: **Alt** and **✕**. ✕ removes the picture. Alt opens a one-line field over the picture's lower edge to type a description (up to 200 characters; Enter saves, Esc cancels, an empty text clears it). The Alt button is outlined in the accent colour when a description exists. The same actions are in the context menu ("Describe picture…", "Remove picture") and the palette (`topic.imageAlt`, `topic.imageRemove`).
  - **Alt text:** the description is saved as `image.alt`, read out after the topic's title ("picture: …", or "has a picture" when there is none), shown as a tooltip on the picture, and written into SVG exports as the image's `<title>`.
  - The picture is part of the topic, so it travels with Copy, Cut, Paste, Duplicate and the file, and is drawn in SVG, PNG and PDF exports. Markdown and CSV exports skip it.
  - Only embedded PNG, JPEG, WebP and GIF pictures are accepted from a file or the clipboard, up to about 4.5 MB each. Links to outside images and SVG are refused, so opening a map never loads anything from the web or runs script.
- **Drag and drop [Built, new]**
  - **A picture dropped on empty canvas** becomes a new, untitled topic under the Core, with the picture on it.
  - **A picture dropped on a topic** puts the picture on that topic (replacing any it had). Several pictures dropped on one topic: the first goes on it, and the others become sub-topics, each with its own picture. Several on empty canvas each become a new topic under the Core.
  - **A Canopy map file (`.json` or `.canopy.json`) dropped on a topic** adds the whole map as a new last branch under it, or under the Core when dropped on empty canvas. The other map's Core becomes the top of the branch (named by the Core's title, or by the map's title when the Core still has the default name). It can be dropped any number of times.
    - Every topic gets a new ID, so nothing clashes with the map it joins. Notes, stickers, pictures, lines, properties and fold state come along, and so do the statuses and tags its topics use that this map lacks. References between its own topics are kept; a reference to anything else cannot be, and is dropped. Its own Looks, preferences and saved Filters are not imported.
    - Files over 40 MB are refused.
  - Pictures and maps can be dropped together. Everything in one drop is one undo step, and the new topics are selected.
  - **Feedback:** while files are dragged over the map, the topic they would land on is outlined (or the whole canvas, for the Core), and a label says what will happen, such as "Add picture to “Beta”". Dropping outside the map does nothing, and the browser never opens the file in place of the map. A file that is neither a picture nor a map is refused with a message, and a map file that cannot be read says why.
  - **Without a mouse:** pasting a picture and the command "Add a map file as a branch of the selected topic" (File menu, palette) cover the same ground from the keyboard.
- **Attachments [Cut]**
  - Files and unfurled links were removed from v1 (see 12.1). Old files that contain attachments still open, and the attachments are ignored. Pasted pictures (above) are the one exception.
- **Stickers (expressive) [Built, redesigned]**
  - A picker opens with `S`, or from the Stickers tab. It has a search box and a sheet of original, die-cut artwork (23 stickers such as Star, Heart, Launch, Done, Alert, Flag, Coffee). **Deviation:** v0.2 planned vendored open-licence packs (Fluent Emoji) and custom upload. The set is original SVG art instead, so it looks identical on every platform and in exports, and needs no third-party licence. Custom upload was dropped.
  - Stickers stick to the four corners of a topic (up to four per topic), and land with a short stamp animation (instant under reduced motion).
  - **Each sticker is on a topic or line at most once.** The sheet in the Stickers tab shows every sticker as a switch: one that is on is ringed and tinted with a tick, and pressing a sticker puts it on, or takes it off when it is already on. There is no separate list of what is on the topic. When the topic or line is full (four, or three), the stickers that are off wait, and the ones that are on can still be pressed to take off. Files and the clipboard that repeat a sticker are read with one of each kind, keeping the first.
  - Stickers can also stick to a **Line** (see 3.10), up to three per line.
  - Stickers are decorative, but the Filter can pick topics out by sticker (3.4), so a sticker can serve as a quick personal marker. Anything that needs status or a date is a Property.
  - Dragging and rotating stickers, a Fluent-style 3D set for Playful and a high-contrast set are not planned for v1.

### 3.6 Looks, Modes, Voices [Built]

- **Mode:** Light, Dark, Auto (follows the OS).
- **Looks** (shown as "Theme" in Settings)
  - *Minimal:* neutral palette, very subtle card borders and a flat, hard-edged shadow under each card for elevation, one accent. In Dark Mode the canvas dots are very faint.
  - *High Contrast:* black on white or white on black, thicker strokes, and a different corner shape per level, so level is not carried by colour. Colour contrast passes the automated check in both Modes. A strict 7:1 measurement is not automated.
  - *Playful:* saturated colour by level (the Core, then five colours that repeat), soft gradient cards with a bright edge, a flat offset shadow in the level's colour (no glow), and a small overshoot when the layout settles.
- **Voices** (shown as "Font")
  - *Sketch:* handwritten font plus wobbly hand-drawn connectors, stable per connector so they do not shimmer.
  - *Editorial:* serif, "bookish."
  - *Mono:* monospace.
  - *Clean:* sans-serif.
  - The Voice applies to the map. The app chrome stays in the system font.
- **Font size:** Small, Medium or Large for the map text.
- **Level numbers:** an optional number such as `2.3` before each title, set small, faded and in a monospace face so it reads as a label.
- **Branch colour [Changed]:** colour follows the level in Playful. A manual per-branch colour override is **[Planned, low priority]**.
- **Connector styles:** curved, elbow, straight, tapered.
- Chips adopt the active Look: soft and flat in Minimal, bordered with shapes in High Contrast, rounded and tactile in Playful.

### 3.7 Settings (global settings) [Built, reduced]

Settings live in the Settings tab of the left panel, in three groups. The map-level choices are saved in the file, and the device-level ones are kept in this browser and labelled as such.

- **Appearance:** Colour mode (device), Theme, Font, Font size (map).
- **Map layout (map):** Layout (Flow), Spacing, Connectors, Property chips (Off, Compact, Full), Level numbers.
- **Behaviour (device):** Auto-pan, Trail, Text expansion, Remove empty new topics, Shortcut hints, Add-topic handles (on hover, always, never), Motion (System, Full, Reduced).
- **[Cut or deferred]:** typography scale per level, topic shape, snap and grid, larger hit targets, screen-reader verbosity, date format and first day of the week, overdue behaviour, default export settings and anything about attachments or Roles. **[Planned]:** shortcut customisation (M5.6).

### 3.8 Import / Export [Built, simplified]

- **Export** (the Export tab of the left panel, or `⌘E`, with a live preview)
  - **PNG** at 1×, 2× and 4×, with an optional transparent background. The scale drops on its own when a map would be too large for a canvas.
  - **SVG**, vector, built from the layout and following the Look, Voice, connector style, level numbers and folds, with the map's font embedded.
  - **PDF** through the browser's print dialog: one page sized to the map, vector, with selectable text. **Deviation:** no multi-page tiling and no bundled PDF writer.
  - **Compact layout for A4** (PNG, SVG and PDF): moves topics so the map fills one A4 page, portrait, landscape or best fit. Each branch picks the arrangement that wastes least room (a column beside its parent, a row under it, or indented under it like an outline), and the top topic can split its branches onto both sides. The picture takes the page's size and is shrunk only as far as needed. A map that already fits at full size is left as drawn. The map on screen is not changed.
  - **JSON**, versioned (`canopy/1`), round-trippable. Saved with File > Save a copy as a file.
  - **Markdown outline**, with optional notes and links, and Properties written as the inline shorthand from 3.4.
  - **CSV**, one row per topic with its path and Properties, defusing spreadsheet formulas.
  - **Selection export [Built]:** only the selected branches. **Frame export [Planned, low priority].**
- **Export options:** toggles for Notes, Stickers and Chips, and a **Filter-aware export** that includes only what the active Filter picks out.
- **Import:** JSON (File > Open), and pasted indented text or Markdown. **[Planned]:** OPML and CSV import with column mapping (M5.8). FreeMind and XMind stay stretch goals.
- **Round-trip guarantee [Built]:** JSON export followed by import is lossless. Old files that contain people, approvals, priority, progress or attachments open normally and ignore those fields.

### 3.9 Navigation aids: Trail, Branch view, Zen [Built, new]

These were not in v0.2. They exist to help someone work inside a big map without losing their place.

- **Trail:** the way up from the focused topic to the Core. It is either highlighted (topics and lines on the way, the rest left alone) or isolated (everything else hidden). A pill at the bottom chooses None, Highlight or Isolate, `R` turns it on or off, and a setting makes it the default. A status bar at the bottom shows the Trail as a path of topic names, each one clickable, with **Copy path** just after it. The path is shown **in full while the bar has room for it**, however many levels it has. Only when it does not fit are the middle levels folded into an ellipsis (hovering it names them), and as few as possible, keeping the first level and the most recent ones. Names are shortened only after that, the earlier levels before the topic you are on. Copy path writes the path as `!!A>B>C` (separators inside a name are turned into spaces), so pasting it into a new topic rebuilds the same chain through text expansion (3.1).
- **Branch view:** `[`, the Fold everything above item in the context menu, or the brace button on the parent side of any topic shows only that branch. Everything above it, all the parents and their peers, becomes one dotted node ("12 topics above", with the path) at the root, so a subtree can be worked on without panning and zooming back and forth. Clicking the dotted node, pressing `[` again, or choosing Unfold everything (the status bar button, the toolbar button or `0`) returns to the whole map, so Unfold everything opens folded children and the parents together. The view fits itself when it starts and ends, and it is dropped when another map opens.
- **Zen (`Z`):** hides every panel and bar, leaving only the map, until you press `Esc` or the Exit Zen button. The button sits in the bottom left, in the corner the toolbar (and its Zen button) occupies when it is shown.
- **Pointer tools:** see 3.1.

### 3.10 Lines (edge labels and stickers) [Built, new]

- The line from a topic to its parent can be picked (click it, or press `L` on the topic). A small bar offers quick stickers, and the Stickers tab then edits the line instead of the topic. The bar's stickers are switches, like the sheet's: each is ringed while it is on the line, and a press puts it on or takes it off. Stickers that are on the line but not among the usual few are listed after them, so every one can be taken off from the bar. A **pencil** at the start of the bar opens the details panel and puts the cursor in its Label field.
- A line can carry a short label (up to 80 characters), such as "depends on", shown on the line, and up to three stickers.
- Lines are drawn with their label and stickers in exports.

### 3.10a References [Built, new]

A Reference links a topic to **one** existing topic anywhere in the map, so two branches that share the same sub-tree can point at one copy instead of repeating it. A Reference does not move or copy anything and never changes the tree.

- **Drawn as:** a bold dashed arrow in the accent colour, drawn above the topics, so it reads differently from the solid parent-child lines. It leaves the middle of the side of the source that faces the target and ends with an arrowhead at the middle of the facing side of the target. Topics lined up across the Flow (stacked in a Right flow, side by side in a Down flow) get a loop out of the side, so the arrow never runs over the topics between them.
- **Create by dragging:** the link-icon Reference Handle sits above a selected topic (not shown on the Core). Drag it onto any other topic: a dashed line follows the pointer and the topic under it is highlighted. Release to connect. Releasing on empty canvas, or `Esc`, cancels.
- **Create by search:** click the handle, press `X`, or choose "Reference to…" in the topic's context menu. A search over every topic by name or full path (for example "Case Types › Workflow › Templates") picks the target.
- **Replace:** a topic has at most one reference, so a new one replaces the old.
- **Remove:** click the arrow to pick it and a delete icon appears on its middle. Click the icon to remove the Reference (undo restores it). Right-clicking the arrow offers *Go to referenced topic*, *Change reference…* and *Remove reference*. Clicking elsewhere puts the icon away.
- **Integrity:** deleting a topic (or its branch) removes every Reference that pointed into it. A Reference to a missing topic or to itself is rejected when a file is opened. Copy and paste keeps a Reference when the target is in the same map and drops it otherwise.

### 3.11 Editing aids [Built, new]

- **Insert between levels:** `W`, `Shift+W` and the in-line handle insert a topic between two levels, so a missing parent or middle step can be added without dragging.
- **Text expansion, empty-topic clean-up, auto-pan, context menu:** see 3.1.
- **Shortcut hint strip and cheat sheet:** the strip at the bottom adapts to what is selected. `?` opens a searchable cheat sheet built from the same registry as the handlers, so the two cannot drift apart.
- **Tooltips:** small labels with the shortcut on controls and on the fold and add buttons.

### 3.12 Saving [Built, changed]

- A map is stored in IndexedDB shortly after it is edited, and when the page is hidden. A map that has only been opened or just created is **not** stored, so reloading an untouched Untitled map does not leave empty maps behind. The first edit, including giving it a title, stores it.
- Opening or starting a different map finishes saving the one that was being edited, under its own identity.
- The title bar shows a save indicator with the time of the last save.
- File > Open and Save a copy move maps in and out as `.canopy.json` files, with a download fallback when the browser cannot choose a file.
- Patch-based writes (rather than whole documents) are still planned with performance work (M5.7).

## 4. Strongest and most unique differentiators

These are where we should beat Miro, XMind, MindMeister, Coggle and Whimsical. Tags show how far each one is.

1. **Ghost-Growth Handles [Built].** Hovering a handle previews the new topic and its layout shift before you commit. Most tools only show a `+` icon. Ours shows the outcome.
2. **Outline and Map dual view, live-synced [Planned].** Edit in either view and the other updates, with an animated cross-highlight. This is both an accessibility feature and a power-user feature. Competitors are canvas-only.
3. **Semantic zoom (levels of detail) [Partly built].** Zoomed out, you see structure only. Zoomed in, Notes and Chips reveal themselves in place. Today there are two levels: full, and an icon level below 35% zoom, plus viewport culling. In the icon level text is not drawn. The Core shows a house; a picture shows a picture mark; the main icon under it is the status mark when the topic has a status, else a page for a note, else a **T** for text; tags show as dots in their colours and a due date as a small square (in the warning colour when late). Fold buttons stay on maps of up to 600 topics, and the add and reference handles step aside, since they would be larger than the topics.
4. **Flow morphing and per-branch Flow [Planned].** Layouts are animated transformations, not jumps, and each branch can use a different Flow. Few competitors support mixed layouts.
5. **Map-native planning with shorthand entry [Built].** Type `Draft launch plan #launch /doing ^fri` and you get a topic with a tag, status and due date, without opening a form. Roll-ups on folded branches turn any map into a status view. Most mind-map tools have only tags or checkboxes, and most planners have no free-form thinking space.
6. **Filters that follow you across views [Partly built].** One Filter applies to the map, the Trail, the next-match jumps and the exports, and the map dims instead of rearranging, so spatial memory is preserved. The Outline, Board, Table and Timeline are the views still to join.
7. **One data model, many projections [Planned].** Map, Board, Table and Timeline are animated views of the same topics. Dragging a card in Board changes the map, and no sync or duplication is involved.
8. **Tour mode with camera choreography [Planned].** Present the map as a story. Each step focuses a branch, dims the rest, and moves the camera smoothly with an optional narration note. Tour order can differ from tree order. The Branch view and Trail (3.9) cover part of the "focus" half already.
9. **Brain-dump paste [Partly built].** Paste any outline and watch it become a tree. Pasted outlines and `!!` text expansion work today. Recognising shorthand while pasting, OPML, and the unfurl animation are planned.
10. **Visual history (time-scrub) [Planned].** Undo and redo as a scrubbable timeline instead of only a linear stack, and you can restore a single branch from the past. Today there is ordinary undo and redo.
11. **Accessible by design [Built, audit pending].** ARIA tree semantics, a full keyboard model, non-colour encodings for Status, reduced motion, High Contrast and screen-reader announcements. A manual screen-reader audit is still to do.
12. **Local-first [Built].** The app works offline and saves to IndexedDB, with files in and out through File > Open and Save a copy. There is no login wall, which matters for enterprise privacy reviews.
13. **Navigation aids for large maps [Built, new].** The Trail, Branch view and Zen (3.9) keep you oriented in a big map, and the Branch view in particular turns "zoom and pan back and forth" into one key press.

## 5. Motion system [Built, with the planned moments marked]

**Principles:** continuity (shared-element movement), causality (origin to destination), restraint (under 300 ms for most UI), and interruptibility (any animation can be cancelled by new input).

Tokens live in `motion/`. A layout animator (`canvas/animator.ts`) tweens every layout change outside React, jumps for maps over 1,500 topics, and jumps everywhere under reduced motion. **Deviation:** v0.2 named a spring library. The animator is small and hand-written instead.

| Token | Duration | Easing |
|---|---|---|
| `instant` | 80 ms | linear |
| `quick` | 160 ms | ease-out |
| `standard` | 240 ms | cubic-bezier(.2,.8,.2,1) |
| `layout` | 420 ms | spring (stiffness 260, damping 28) |
| `playful` | 520 ms | spring with overshoot, Playful Look only |

**Choreographed moments**
- **Create topic [Built]:** grows out of its parent along the connector, then peers ease aside (layout spring) and the caret lands in inline edit. The ghost preview becomes the real topic in place.
- **Fold / Unfold [Built]:** children fold into the parent along their connectors. The count-up on the badge and the 20 ms stagger are not built.
- **Flow morph [Planned]:** topics travel along arcs to their new positions, connectors redraw, and stagger runs from the Core outward.
- **View switch (Map, Board, Table, Timeline) [Planned]:** topics travel to their new positions as shared elements, while content that has no counterpart fades.
- **Delete [Built]:** the branch fades and shrinks toward its parent, with an Undo toast that goes away once the map changes again.
  - **Deleting a topic that has sub-topics asks first.** A dialog offers *Delete the topic only* (its direct sub-topics move up to its parent, in the topic's place and in their own order, and everything below them stays), *Delete the whole branch*, and Cancel. The safer first choice has focus, and Esc cancels. With several topics selected it asks once if any of them has sub-topics. Topics with nothing below them are deleted straight away. Both ways can be undone in one step. The commands are also available without the dialog as "Delete the topic and keep its sub-topics" and "Delete the whole branch without asking", and in the right-click menu. Cut does not ask, because the branch goes to the clipboard.
- **Re-parent drag [Built]:** the topic lifts, a drop-target line shows the exact slot, and on drop it settles.
- **Filter and Trail [Built]:** non-matching topics fade, and the camera follows the selection (auto-pan). Smooth camera paths for **Focus / Tour** are **[Planned]**.
- **Selection [Built]:** a ring and a light wash, and the handles fade in after a short delay to avoid flicker.
- **Status change [Planned]:** the status Chip morphs shape and colour, and Done gives a brief confirm pulse. The progress ring and avatar moments went with Progress and People.
- **Stickers [Built]:** land like a stamp.
- **Reduced motion [Built]:** springs become short fades, and layout changes jump. Layout and status changes are still shown, but without travel.

## 6. Accessibility requirements

- WCAG 2.2 AA minimum, and AAA in the High Contrast Look. Automated axe-core checks run in Light and Dark, in every Look × Mode × Voice combination, while editing, and in every panel and dialog. A manual screen-reader pass by a person is still to do, as is a measured 7:1 check for High Contrast.
- **Tree semantics [Built]:** the map is one tab stop exposed as `role="tree"` with `aria-activedescendant`, and each topic is a `treeitem` with `aria-level`, `aria-expanded`, `aria-posinset`, `aria-setsize` and `aria-selected`. Nothing needs DOM focus to move, which also works with viewport culling. **Deviation:** v0.2 said roving tabindex. The **Outline** view, as the canonical accessible representation, is **[Planned]** (M4.1).
- Visible focus ring in every Look (at least 3:1 contrast). Selection has its own colour, an offset halo and a light wash, and editing shows one selection mark.
- Never rely on color alone: Status uses a shape per kind, overdue dates are bold and underlined, and High Contrast carries Level in corner shape.
- Topics have accessible names that include their Properties, for example "Draft launch plan, status In progress, due Oct 9".
- Property Quick-Add, the Filter and every panel are fully keyboard and screen-reader operable.
- Board view keyboard moves (select card, then `⌥+Arrows` to change column) with announcements **[Planned]** with the Board.
- Target size of at least 24×24 px **[Partly]**. The larger option in Settings is **[Cut]**.
- Live-region announcements for create, move, fold, delete, undo, redo, Filter jumps, Branch view and Property changes.
- A `?` cheat sheet with search, built from the shortcut registry. Full shortcut customization is **[Planned]** (M5.6).
- Tab is used for "add sub-topic", so keyboard users can always leave the map: `Esc` (with nothing to cancel) releases focus and `Shift+Tab` moves to the previous control.
- `prefers-reduced-motion` and `prefers-color-scheme` are respected. `prefers-contrast` is **[Planned]**.
- Zoom to 400% without loss of function.

## 7. Key shortcuts (default)

| Action | Shortcut | Status |
|---|---|---|
| Add sub-topic / peer | `Tab` / `Enter` | Built |
| Add peer above | `Shift+Enter` | Built |
| Insert a topic between this and its parent / sub-topics | `W` / `Shift+W` | Built |
| Edit / finish | `Space` or `F2` / `⌘Enter` | Built |
| Delete topic (asks when it has sub-topics) / duplicate branch | `Del` / `⌘D` | Built |
| Fold / unfold | `]` | Built (was `.`) |
| Fold to Level N / unfold all | `1–9` / `0` | Built |
| Fold everything above (Branch view), toggle | `[` | Built |
| Move selection / reorder peers | Arrows / `⌥`+Arrows | Built |
| Select branch | `⌘A` | Built |
| Open Note | `N` | Built |
| Sticker picker | `S` | Built |
| Label the line to the parent | `L` | Built |
| Show or hide the inspector | `I` | Built |
| Property Quick-Add / all properties | `P` / `Shift+P` | Built |
| Set status / due date / tag | `T` / `D` / `G` | Built |
| Find a topic (fuzzy, by title or path) | `⌘F` | Built |
| Advanced filters (Filter panel) | `/` or `F` | Built (was a dialog) |
| Reference another topic (search) | `X` | Built |
| Next / previous Filter match | `.` / `,` | Built (were `]` / `[`) |
| Trail on or off | `R` | Built |
| Zen | `Z` | Built |
| Select / Pan / Zoom tool | `V` / `H` / `Shift+Z` | Built |
| Zoom in / out / fit | `⌘+` / `⌘-` / `⌘0` | Built |
| Command palette | `⌘K` | Built |
| Settings | `⌘,` | Built |
| Cheat sheet | `?` | Built |
| Copy / Cut / Paste as sub-topic / Paste as peer | `⌘C` / `⌘X` / `⌘V` / `⌘⇧V` | Built |
| Undo / Redo | `⌘Z` / `⌘⇧Z` | Built |
| Export | `⌘E` | Built |
| Context menu | Right-click, menu key or `Shift+F10` | Built |
| Focus branch (dim the rest) | `F` in v0.2 | Planned. `F` now opens the Filter and Branch view took `[` |
| Change Flow | `L` in v0.2 | Planned. `L` now labels a line |
| Switch view (Map, Board, Table, Timeline) | `⌘1` to `⌘4` | Planned |
| Toggle Outline | `⌘\` | Planned |
| Assign Owner | `O` in v0.2 | Cut with People |

Note: `1–9` and `0` act on fold levels only when no text field is focused. All of these are read from one registry in `editor/shortcuts.ts`, which the handlers, context menu, hint strip, palette and cheat sheet share.

## 8. Data model (JSON, versioned)

The file keeps schema `canopy/1`. Every change since v0.2 only removed fields or added optional ones, so no migration was needed and older files open as they are. The in-memory form is a normalised topic table, and the file form below is nested (`toFile`, `parseFile`).

```json
{
  "schema": "canopy/1",
  "meta": { "title": "", "created": "", "modified": "" },
  "prefs": {
    "flow": "right", "density": "comfortable", "look": "minimal", "voice": "clean",
    "fontSize": "medium", "connector": "curved", "showLevels": false, "chips": "compact"
  },
  "planning": {
    "statusSet": [
      { "key": "todo", "label": "Not started", "category": "todo" },
      { "key": "doing", "label": "In progress", "category": "active" },
      { "key": "blocked", "label": "Blocked", "category": "active", "flagged": true },
      { "key": "review", "label": "In review", "category": "active" },
      { "key": "done", "label": "Done", "category": "complete" }
    ],
    "tags": [{ "key": "launch", "label": "Launch", "color": "#7C5CFF" }]
  },
  "core": {
    "id": "t_1", "title": "", "folded": false,
    "note": "Markdown text",
    "stickers": [{ "id": "s_1", "key": "star" }],
    "edge": { "label": "depends on", "stickers": [{ "id": "s_2", "key": "flag" }] },
    "referenceTo": "t_9",
    "image": { "src": "data:image/webp;base64,...", "w": 640, "h": 480, "alt": "Login screen" },
    "props": {
      "status": "doing",
      "due": { "start": null, "end": "2026-11-01" },
      "tags": ["launch"]
    },
    "children": []
  },
  "filters": [{ "id": "l_1", "name": "Stars", "mode": "dim", "query": { "stickers": ["star"] } }]
}
```

Notes:
- The colour Mode is a device setting and is not saved in the file.
- `props`, `note`, `stickers`, `edge`, `referenceTo` and `image` are omitted on topics without them, keeping plain maps small.
- `referenceTo` holds the ID of the topic a Reference points to. It must name another topic in the same file. A missing or self-pointing target makes the file fail to open with a clear message.
- Roll-ups are computed, never stored. Fold state is stored. Children are written in order, and their fractional ordering keys are rebuilt on load.
- A Filter query can use `status`, `statusCategory`, `tags`, `stickers`, `due` (`overdue` or `week`), `dueBetween` and `match` (`all` or `any`).
- `image` holds the pasted picture as `src` (an embedded `data:image/png|jpeg|webp|gif;base64,` URL) with its pixel size `w` and `h`, and an optional `alt` description (up to 200 characters). The display size is worked out from these and is not stored. A file whose `image` is not an embedded raster picture of a sensible size fails to open with a message.
- **Removed since v0.2:** `roster`, `planning.roles`, `planning.customProperties`, `planning.rules`, `attachments`, and the `people`, `approval`, `priority`, `progress` and `custom` Properties. Old files that contain them still open, and the fields are dropped on the next save.
- **Not yet present:** `flowOverride`, `style` (branch colour and shape) and `tour`, which belong to planned features.
- Tags are referenced by key so renaming a tag updates every topic.

## 9. Technical approach (as built)

- **Stack [Built]:** React 19, TypeScript 6 (strict) and Vite 8, with Vitest, Playwright and axe-core, ESLint 9 and Prettier. ESLint stays on 9 until the accessibility lint plugin supports 10.
- **Rendering [Built]:** a custom SVG renderer (not React Flow, see 9.1) for topics and connectors, with a DOM overlay for inline editing, handles and menus. Pan and zoom use a small custom viewport controller, not `d3-zoom`. This keeps vector export and the accessible tree straightforward.
- **Scale target: 5,000 topics** (see 9.2 for the performance budget).
- **Layout [Right and Down built]:** a custom tidy-tree implementation with variable-size topics. It is a single O(n) pass (about 4 ms for 5,000 topics), and measurements are cached per topic object, so a separate incremental engine was not needed. Left, Both and Radial are planned.
- **State [Built]:** a Zustand store with Immer. **Deviation:** undo and redo store snapshots with structural sharing and grouping of rapid edits, not patches. A history timeline will need either patches or snapshot browsing. Roll-ups and Filter results are derived values, cached per edit.
- **Planner views [Planned]:** Board, Table and Timeline will be read/write projections over the same store. The table data and the CSV export already exist.
- **Motion [Built, deviation]:** motion tokens in CSS and `motion/`, a small hand-written layout animator and a central reduced-motion gate. No spring library was added.
- **Notes [Built, deviation]:** Markdown in a text field with a safe preview renderer, not TipTap.
- **Export [Built, deviation]:** SVG built from the layout, PNG through a canvas, PDF through the print dialog, CSV from the table data.
- **Persistence [Built]:** IndexedDB (Dexie) written after edits (3.12), plus files in and out with the File System Access API and a download fallback. Patch-based autosave is planned.
- **Theming [Built]:** design tokens (CSS variables) for Mode × Look × Voice, so combinations don't multiply code. Fonts are bundled (`@fontsource`), so the app works offline.
- **Quality [Built, partly]:** unit tests (Vitest, 263 including property-based tree tests), end-to-end tests (Playwright, 173, with axe in every Look × Mode × Voice) and a benchmark script. The visual-regression suite is not set up.

### 9.1 Decision: React Flow vs custom renderer

React Flow (MIT, `@xyflow/react`) is excellent for node-and-edge diagrams, and it has a mind-map tutorial. For Canopy it is more restrictive than helpful:

| Need | React Flow | Impact |
|---|---|---|
| Layout | No built-in layout. Docs point to dagre, d3-hierarchy, d3-flextree, elkjs. d3-hierarchy assumes equal node sizes | We need our own tidy-tree with variable-size topics, per-branch Flow and radial anyway |
| Flow morph and fold animation | Positions live in React state, so animating thousands of nodes means re-rendering them every frame | Conflicts with the motion system at 5k topics |
| Data model | Flat `nodes[]` and `edges[]` graph | Our model is a tree with fold, branch operations, Properties roll-ups. We would maintain a second model and sync it |
| Vector export (SVG, PDF) | Nodes are HTML elements, so export is rasterized (image) | Fails the vector export goal |
| Accessibility | Basic keyboard and ARIA support for nodes | We need `role="tree"` semantics and the Outline as canonical view |
| Growth Handles | `Handle` is a connection port | Ghost-preview add handles are custom regardless |
| Performance | Docs recommend memoization, hiding collapsed subtrees and simple styles. Rich DOM nodes (Chips, Notes, stickers) are costly | Tight at 5k topics with rich nodes |
| Pro features | Edge routing and editable edges are paid | Not needed for trees |

What React Flow would give us for free (pan/zoom, selection box, minimap, fit view) is a small part of the work and is easy to build or borrow from `d3-zoom`. **Decision: custom SVG renderer.** A time-boxed spike with React Flow is only worth it if we later decide to drop vector export and Flow morph.

### 9.2 Performance budget (5,000 topics)

Last measured at the end of Phase 3 (headless Chromium): first paint 323 ms with Properties, 60 fps pan and zoom, create to editor 87 ms, fold 99 ms and unfold 154 ms. The unfold and fold figures are a little above the 100 ms target on the largest map. **The benchmark has not been re-run since the interface rework and the later features**, which is the first item of the remaining work.

- **Interaction:** 60 fps pan and zoom, under 100 ms from keypress to visible result for create, fold and edit.
- **Viewport culling [Built]:** only topics and connectors intersecting the viewport (plus a margin) are mounted.
- **Level of detail [Partly built]:** below 35% zoom text drops out and topics show icons (see section 5). The title-only and dot levels belong to semantic zoom (M4.2).
- **Incremental layout [Not needed so far]:** the single-pass layout is fast enough. A Web Worker above roughly 1,000 topics is **[Planned]** only if measurements say it is needed.
- **Fold on import:** large imports fold deeper than Level 3 by default **[Planned]**.
- **Animation limits [Built]:** maps over 1,500 topics jump instead of animating.
- **Memoized derived data [Built]:** roll-ups and Filter results are cached per edit.
- **Storage [Planned]:** autosave writes patches, not the whole document, with a debounce. Today it writes the whole document after a short pause.
- **CI [Planned]:** a 5,000-topic benchmark with thresholds enforced.

### 9.3 Sticker and icon sourcing (as built)

v0.2 planned vendored open-licence packs (Fluent Emoji, Noto Emoji, Phosphor). The first pass used system emoji, and the interface rework replaced them with an original sticker set, so the plan to vendor third-party artwork is **dropped**.

- **Stickers:** 23 original die-cut SVG stickers drawn in code (`stickers/art.tsx`), with names in `stickers/catalog.ts`. They look the same on every platform and in every export, and need no licence. A larger or themed pack can be added later by extending the catalog.
- **Interface icons:** a small set of icons drawn for the app (`ui/icons.tsx`).
- **Fonts:** bundled through `@fontsource`, so the app works offline: Patrick Hand (Sketch), Source Serif 4 (Editorial), JetBrains Mono (Mono, and the level numbers) and Bricolage Grotesque (the app name). Clean uses the system sans-serif. All are under open licences listed in `THIRD_PARTY_NOTICES.md`.
- **Still to do:** an About screen with the credits list (M5.9). Custom sticker upload, which v0.2 kept in scope, is dropped.

## 10. Delivery phases

1. **Foundation [Done]:** Map data model, Core/Topic CRUD, the Right and Down Flows, full keyboard model, Growth Handles with ghost preview, fold/unfold, copy/paste, autosave, undo/redo, Mode and Minimal Look, JSON import and export.
2. **Expression [Done, simplified]:** Notes, Stickers, all Looks and Voices, Settings, PNG/SVG/PDF export, Command Palette. Attachments were cut.
3. **Planning [Done, reduced]:** Properties (Status, Due date, Tags), Chips, Quick-Add and inline shorthand, roll-ups, Filters, CSV export. People, Roster, Approval, Priority and Progress were cut.
4. **Interface rework and navigation aids [Done, unplanned]:** floating panels, inspector, Trail, Branch view, Zen, pointer tools, lines, insert between, context menu, status bar, text expansion (section 12).
5. **Delight and depth [Not started]:** Outline view, semantic zoom, Flow morph and per-branch Flow, Brain-dump import, Focus, Tour, minimap.
6. **Planner views and polish [Not started]:** Board, Table, Timeline, custom Properties and workflow rules, visual history timeline, accessibility audit, shortcut customization, performance on 5k+ topics, OPML and CSV import, localization.

The plan numbers these as Phases 1 to 5, with the interface rework recorded as unplanned work between 3 and 4. See plan.md, "Remaining work", for the order proposed for what is left.

## 11. Decisions

1. **Product name:** Canopy (confirmed).
2. **Collaboration:** out of scope for v1 (local-first). The data model stays CRDT-friendly: stable IDs, ID-based references, no positional indexes in stored data, and ordered children stored with fractional ordering keys so concurrent edits can merge later.
3. **Stack:** React + TypeScript with a custom SVG renderer, not React Flow (see 9.1).
4. **Sticker art:** original SVG art drawn for Canopy (23 stickers). Open-licence packs were dropped (see 9.3). Changed from v0.2.
5. **Scale target:** 5,000 topics (see 9.2).
6. **Planning depth:** Board, Table and Timeline are enough for v1. Dependencies between topics are out of scope.
7. **Approval model:** **[Cut]** with People. Approval is not part of v1.
8. **Sticker style:** one original flat die-cut style in all Looks. The Fluent 3D idea for Playful is dropped.
9. **Planning scope:** v1 planning is Status, Due date and Tags, plus roll-ups and Filters. People, Roles, Approval, Priority, Progress, custom Properties and workflow rules are out of v1.
10. **Attachments:** out of v1.
11. **Saving:** a map is stored only after it is edited, so opening or creating an untouched map leaves nothing behind.
12. **Shortcut keys:** `[` folds the parents (Branch view) and `]` folds the children, and both toggle, so the two directions of the tree sit on adjacent keys. The Filter's next and previous match moved to `.` and `,` to free the brackets.
13. **Words:** the interface says Fold and Unfold, never Collapse or Expand.

## 12. Changes since v0.2 and what remains

### 12.1 Cut from v1

A scope cut on 2026-10-08 kept planning to Status, Due date, Tags and Stickers. This table records what it removed.

| Feature in v0.2 | Note |
|---|---|
| People, Roles, Roster, "I am" | Removed with the scope cut. The file format ignores old data. Collaboration stays a post-v1 topic, and the data model could carry people again later |
| Approval and workflow rules | Depended on People |
| Priority and Progress | Removed with the scope cut. Roll-ups still count Status and Due date |
| Custom Properties | Not built. Status Set and Tags cover the common cases for now |
| Attachments and link previews | Removed with the scope cut. Link previews also needed network requests, which conflicts with local-first |
| Custom sticker upload | Replaced by a built-in original set |
| Saved-Filter presets such as Mine and Awaiting my approval | Depended on People. The Filter panel covers Status, Tags, Due date and Stickers |
| Larger hit targets, screen-reader verbosity, date and week preferences | Not built, and not currently planned |

### 12.2 Deviations from v0.2

| Area | v0.2 | Now |
|---|---|---|
| Notes | WYSIWYG (TipTap) with a source toggle | Markdown text field with toolbar and preview |
| Stickers | Vendored open packs, drag and rotate | 23 original die-cut stickers on four corners, plus lines |
| PDF export | Vector with multi-page tiling | One page through the print dialog |
| Undo history | Immer patches | Snapshots with structural sharing |
| Motion | Spring library | Hand-written layout animator |
| Accessibility tree | Roving tabindex | One tab stop with `aria-activedescendant` |
| Looks | Playful colours by top-level branch | Playful colours by level |
| Settings | A Preferences dialog with a Planning section | A Settings tab in the left panel. No Status Set editor for now |
| Filter | Saved presets, AND/OR | Ticked groups (AND between groups, OR within), plus saved Filters read from files |
| Fold key | `.` | `]` |
| Filter match keys | `]` and `[` | `.` and `,` |
| Top bar | Flow, Look/Mode, Filter, Share | A slim bar: File menu, title, save indicator, palette. The rest moved to panels |
| Saving | Autosave | Autosave after the first edit only |

### 12.3 Added since v0.2

- Floating left panel (Settings, Filter, Tags, Export) and right inspector with tabs.
- Trail (highlight or isolate) with a status bar path and Copy path.
- Branch view (fold everything above into one dotted node), with a brace button on every topic.
- Zen mode, pointer tools (Select, Pan, Zoom), unfold-everything button.
- Lines with labels and stickers, and the quick sticker bar.
- Insert a topic between levels (`W`, `Shift+W`, the in-line handle).
- Text expansion with `!!`, and removal of empty new topics.
- Auto-pan, context menu, tooltips, searchable cheat sheet, save indicator.
- Font size, level numbers in small faded monospace, and refreshed Minimal (subtle borders, flat shadows) and Playful (flat shadows) Looks.
- Filter by sticker, and the date-range Filter.
- Delete asks whether to remove a branch or only the topic; stickers are one-per-kind switches with a pencil on the line bar; topics become icons when zoomed out; Exit Zen moved to the bottom left; handles follow their topic while it moves; the pointer tool keys (Space, Cmd, Alt) are tracked reliably.
- Pictures pasted from the clipboard onto topics, and drag and drop of pictures and whole map files onto the canvas or a topic (3.5).
- References between topics (Reference Handle with drag-to-connect, search by path, delete icon and line menu), and `⌘F` fuzzy topic search with the Filter panel as its advanced mode.

### 12.4 What remains

Everything tagged **[Planned]** above. In the order proposed in plan.md: re-measure performance, Outline and screen-reader pass, semantic zoom, Flow variants and morph, Brain-dump polish, Focus and Tour, minimap, the planner views (Board, Table, Timeline), a Status Set editor, visual history, shortcut customisation, 5,000-topic performance work and CI thresholds, OPML and CSV import, localisation, an About screen with credits, and release hardening. Small leftovers: `⌘⌥V` paste style, Frame export, manual branch colour, peek card and inline preview for Notes, `prefers-contrast`, and visual-regression baselines.
