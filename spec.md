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
2. **Structure and expression are separate.** The *Theme* (colour, shape and font) and the stickers never change the data. The same map can be restyled in one click.
3. **Motion explains, never decorates.** Every animation shows cause and effect, such as where a node came from or where it went.
4. **Accessible by default.** The map is a real tree for assistive tech, not just pixels on a canvas.
5. **Local-first and private.** It works offline and autosaves. No account is needed to be productive.
6. **Progressive depth.** The first-run view is a blank map with an editable **Core Idea** node and a Home sticker, so typing starts straight away. The inspector uses a home icon for the Core breadcrumb. Power features (Properties, Filters, Tour) appear through hints and the command palette.
7. **A map is also a plan.** Ideas become work without leaving the map or converting to another tool.

## 2. Terminology and taxonomy

| Concept | Term | Notes |
|---|---|---|
| Whole document | **Map** | `.canopy.json` |
| Root node | **Core** | Exactly one per map |
| Node | **Node** | Title plus optional payload |
| Child / Sibling | **Child node / Peer** | |
| Node + descendants | **Branch** | The unit for fold, copy, move, style and layout |
| Depth | **Level** (L0 = Core) | Optional level badge |
| Fold / Unfold | **Fold / Unfold** | The one pair of words used everywhere in the interface. A folded branch shows a **Fold Badge** with a count |
| Decorative marks | **Stickers** | Original die-cut artwork. Expressive only, and also searchable through the Filter |
| Structured metadata | **Properties** | Typed fields on a node: Due date and Tags |
| Visible form of a Property | **Chip** | Compact pill on the node (due date, tags) |
| Hover add-buttons | **Growth Handles** | Child to the right or below, a peer below, and one that inserts a node between two levels. The handle above the node is the **Reference Handle** |
| Link to another node | **Reference** | A dashed arrow from one node to an existing node elsewhere in the map, so a shared branch is linked instead of copied. A node can have several, and a node can be pointed at by several |
| The line from a node up to its parent | **Line** | Can carry a label and up to three stickers |
| The way from a node up to the Core | **Trail** | Highlighted, or isolated, with a status bar that shows it as a path |
| One branch with everything above it folded | **Branch view** | The rest of the map becomes one dotted node |
| Horizontal / Vertical / Radial | **Flow** (Right, Down built. Left, Both, Radial planned) | Settable per map. Per-branch override is planned |
| Light / dark | **Colour mode** | Light, Dark, Auto. A device setting, in the top bar |
| Standard / High contrast / Playful | **Theme** | A preset of colour, shape and font. Independent of the colour mode |
| Global settings | **Settings** | Map-level (saved in the file) and device-level (kept in this browser) |
| Plain-text alternate view | **Outline** | Live-synced with the canvas |
| Pick out nodes by Property or sticker | **Filter** | Dims non-matching nodes (for example "Blocked", "Due this week", the Love sticker) |
| Planner alternate views | **Board / Table / Timeline** | Projections of the same Properties |
| Presentation | **Tour** | Walks branches in a chosen order |
| Spotlight | **Focus** | Dims everything outside the selected branch |

### Information architecture

- **Top bar [Built]:** a File menu (New, Open, Save a copy, the built-in SpecKit example, your maps, and confirmed map deletion), the map title with a save indicator, undo and redo as icon buttons, the colour mode switch (Auto, Light, Dark), and the Search (⌘F) and shortcut sheet buttons. Theme and Flow live in the left panel.
- **Canvas [Built]:** the infinite map.
- **Left panel [Built]:** a strip of four tabs that opens into a floating panel: Settings (theme, layout and behaviour), Filter, Tags and Export. Its tabs sit on the header line, each with its icon and name, and a bar under the open one slides in. The Outline is planned to join it.
- **Right inspector [Built]:** floating details panel that opens when a node is clicked and closes with its own button. Tabs: Details and Tasks, set and animated like the left panel's. Details orders controls as Color, Picture, Stickers, then Planning (due date and tags). The Tasks tab manages checklist items; adding the first task makes the node a Tasklist, and removing the last restores its standard appearance. The node title is editable from the panel heading. Image add, replace and remove controls are also in Details.
- **Bottom-left toolbar [Built]:** pointer tools (Select, Pan, Zoom), unfold everything (which also fits the whole map in view), Zen. There is no separate fit button or shortcut. A minimap is planned.
- **Bottom-center [Built]:** a transient shortcut hint strip that adapts to the current selection, and a Trail pill.
- **Readable panels [Built]:** both side panels follow one rhythm: content 20px from the edge, groups 20px apart, related things 8px apart, names 13 to 13.5px, labels and small print 12px, and panels 372px wide. Explanations are not printed under every control. They sit behind a small **"i"** beside the name (shown on hover or keyboard focus, and read out as the button's name), so a panel reads as names and controls first and needs less scrolling. This covers every Settings row, the Behaviour note, the Filter's search hint and the sticker hint.
- **Details panel heading [Built]:** the node's editable name is shown in full at 18px, wrapping to at most two lines and then ending in an ellipsis (hovering shows the whole name). The `Level 3 · 3.2` line under it appears only when Level numbers is turned on in Settings.
- **Status bar [Built]:** the Trail as a path from the Core to the focused node, with Copy path and, in a Branch view, Unfold everything.
- **View switcher [Planned]:** Map | Board | Table | Timeline.

## 3. Feature specification

### 3.1 Canvas and node creation [Built, with Brain-dump partly planned]

- **Growth Handles:** hovering or focusing a node shows `+` handles on its right (child node) and bottom (peer below) edges, and one on the line above it that inserts a node between the node and its parent (hold `Shift` to take all its peers along). The handle on the top edge is the Reference Handle (see 3.10). "Add peer above" stays available as `Shift+Enter`, the context menu and the palette.
  - **Ghost preview:** dragging a handle shows a translucent ghost node at its exact landing position, and surrounding nodes shift slightly to make room. Merely pointing at a handle does the same only when the device setting **Preview on hover** is on (off by default, because the shifting layout can get in the way).
  - **Click** creates the node and enters inline edit.
  - **Drag from a handle** creates a node at the drop point with a magnetic snap to valid slots.
  - Handle visibility is a device setting: on hover, always or never. So is **Preview on hover** (off by default).
- **Keyboard:**
  - `Tab` adds a child node, `Enter` adds a peer, `Shift+Enter` adds a peer above, `⌘Enter` finishes editing.
  - `W` inserts a node between this one and its parent, and `Shift+W` between it and its child nodes.
  - `Space` edits, `F2` renames, `Del` deletes the branch, `⌘D` duplicates.
  - Arrow keys move spatially, and `⌥+Arrows` reorders peers.
  - `1–9` folds the map to Level N, and `0` unfolds all.
- **Text expansion [Built, replaces part of Brain-dump]:** a title that starts with `!!` expands into nodes when it is finished: `!!a>b>c` makes a chain of children and `!!a, b, c` makes peers. A guide under the editor says what the result will be, one undo puts the text back, and a single expansion is capped at 200 nodes. It can be turned off in Settings.
- **Brain-dump [Partly built]:** pasting an indented text outline or Markdown bullets onto a node unfurls a branch. OPML paste, the unfurl animation and token recognition on paste are planned.
- **Empty nodes [Built]:** a new node left without a title or details is removed when you move on (a device setting).
- **Multi-select [Built]:** marquee, `Shift`-click and `⌘A` within a branch.
- **Drag to re-parent [Built]:** a drop-target indicator shows the exact insertion line. Dropping on a node makes it a child node, and dropping between two nodes makes it a peer.
- **Auto-pan [Built]:** the view keeps the node you are working on in view as the map changes (a device setting).
- **Pointer tools [Built]:** Select (`V`, the default), Pan (`H`, or hold `Space` and drag) and Zoom (`Shift+Z`, or hold `⌘`). With Zoom, click zooms in, `Alt`-click zooms out, and dragging an area fills the view with it. The middle button always pans.
- **Context menu [Built]:** right-click a node, a line or empty canvas for the actions that otherwise need a shortcut, with the shortcut shown. It opens from the keyboard with the menu key or `Shift+F10`.
- **Search (⌘F, also ⌘K, `F` and `/`) [Built]:** one dialog for nodes, commands and filters. See 3.9.

### 3.2 Flow (layout) [Right and Down built, the rest planned]

- **Flows:** Right and Down are built. Left, Both (balanced) and Radial are planned.
- **Per-branch Flow override [Planned]:** for example, a Radial Core with a Down branch for a timeline.
- **Spacing density [Built]:** Compact, Comfortable, Airy.
- **Flow morph [Planned]:** switching Flow animates every node along an arc to its new position (see section 5). Today a change of Flow animates through the ordinary layout tween.

### 3.3 Copy, paste, fold [Built, except paste style]

- Copy and paste a node or a branch as JSON (in-app, preserves everything including Properties, Tasks and Stickers) and as Markdown (to other apps). Pasted plain text is read as an outline.
- **Paste modes:** `⌘V` pastes as a child node and `⌘⇧V` pastes as a peer. `⌘⌥V` (style only) is not built.
- **Fold:** press `]`, click the fold button, or click the Fold Badge. The fold button is a circle with a curly brace, shown on the side where the child nodes are, when you hover or select a node. `0` unfolds everything, and so does the Unfold everything button in the bottom-left toolbar.
- **Fold Badge:** shows the hidden count and a **peek** of the first children on hover. `⌥`-click to fold all peers is not built.
- **Fold memory:** fold state persists in the file.

### 3.4 Properties (metadata for planning) [Built, reduced scope]

Every node can carry optional Due date and Tags Properties, a color override and Tasklist items. A node with one or more tasks is displayed as a Tasklist; a node with no tasks uses the standard appearance. People, Roles, Approval, Priority, Progress and custom Properties are not in scope.

The Details panel orders its controls as Color, Picture, Stickers, then Planning (Due date and Tags). This keeps stickers ahead of other marking mechanisms while making each control easy to find. Due dates are chosen in the date picker; tags remain structured metadata for filtering and shorthand.

**Built-in Properties**

| Property | Type | Notes |
|---|---|---|
| Due date | Date (optional start date) | Shows as a compact date, bold and underlined when overdue |
| Tags | Multi-choice | User-defined and coloured, managed in the Tags tab of the left panel |
| Custom | Text, number, date, single or multi choice, checkbox, link | **[Cut]** |

**Adding Properties**
- `P` opens the **Property Quick-Add** popover on the selected node. Type to filter, with fuzzy matching and keyboard-only operation. `D` goes straight to Due date and `G` to Tags. `Shift+P` opens the Properties tab.
- Inline shorthand while editing a title: `#launch` adds a tag and `^fri` sets a due date (`today`, `tomorrow`, weekdays, `+3d`, `eow`, `nov1`, `11/1`, `2026-11-01`). A preview shows under the node while typing, and finishing the title turns it into Properties and removes it from the text. Undo brings the shorthand back. Words that only look like shorthand (emails, `C#`, paths, bad dates) stay in the title. Conversion happens when the title is finished, not on every key.
- The Properties fields in the details panel are the full editor, including bulk edit when several nodes are selected. Mixed values show as "Mixed" and are left alone until changed.
- The Markdown outline export can write Properties as the same shorthand. Recognising shorthand while pasting is **[Planned]** with Brain-dump.

**Chips (how Properties show on the canvas)**
- **Due date:** compact date, emphasised when overdue.
- **Tags:** a dot per tag in the tag's colour.
- **Chip density** (Settings): Off, Compact, Full. It is measured into the layout, so nodes grow to hold their chips.
- Chips are also drawn in SVG, PNG and PDF exports.
- Chips that fade with semantic zoom are **[Planned]** with M4.2. Today, zoomed far out, text and chips give way to icons for what a node holds.
- Each node's accessible name includes its Properties and Tasklist items.

**Color and Tasklists [Built]**
- Nodes with tasks show the title at the top, followed by all checklist items and a subtle divider. The title editor stays in the title area; task rows are not interactive on the canvas.
- Add, edit, complete and remove tasks in the Tasks tab. A task's checked state is shown on the node and included in JSON, copy/paste, and exports.
- The color row uses circular presets that stay on one line. Foreground text color is chosen automatically for contrast.

**Roll-ups [Built]**
- Parent nodes summarise their branch with earliest and latest due date, and overdue count. They are computed in one pass and cached per edit.
- Date roll-ups show in the Properties tab. They will also show in the Outline when it exists.

**Roster (Members) [Cut]**
- The local list of people, Roles and "I am this person" went with People. Old files that still contain them open normally, and those fields are ignored.

**Find a node and Filters [Built]**
- **Search (`⌘F`, `⌘K`, `F`, `/`, or the Search button in the top bar):** one box that searches across nodes, commands, tags, stickers and due dates. Results come in two groups. **Filter the map** holds the nodes that match (by title or full path; choosing one unfolds the path to it, selects it and scrolls it into view), then tag, sticker and due date choices that match, and last a set-apart *Highlight nodes matching “text”* button. A name that is exactly what was typed leads its group and is marked **Exact match**. **Commands** holds every action, with its shortcut, plus map and device settings. With no node or choice to go to, the matching commands lead, so `Enter` runs one. Each group is capped, so it stays fast on large maps.
- **Empty search:** shows **Recent searches** (the last six queries, one click to ask again, and a Clear all button), **Quick filters** in three groups (Due date: overdue, this week, a date range; Tags; Stickers), and **Common commands**: Add child node, Add peer below, Unfold everything (which also fits the map in view) and a switch to the layout not in use. Choices inside a group are alternatives, and the groups combine (AND). Only the stickers that are on the map are offered. A choice applies at once, and a count with a Clear button shows how many nodes match.
- There is no Filter tab. A Filter that is on shows as a pill over the map with Highlight and Isolate, Previous and Next match, and a button to turn it off. Clicking its name opens the search again.
- **Filter modes:** *Highlight* (non-matching nodes fade) or *Isolate* (non-matching nodes are hidden, with the paths to matches kept).
- A Filter tells you how many nodes match, and `.` and `,` jump to the next and previous match, opening folded branches on the way and announcing each jump. A pill over the map shows the active Filter with its mode and a switch off.
- Filters are also used by the export ("only what the Filter picks out").
- **Saved Filters [Partly built]:** a map file can carry named Filters and they are read and kept, but there is no editor for them yet.
- Filters following you into the Outline and Board, Table and Timeline views are **[Planned]** with those views.

**Planner views (projections of the same data) [Planned]**
- **Board:** columns grouped by a chosen Tag. Dragging a card changes its Tag.
- **Table:** one row per node with sortable and editable columns, and a path breadcrumb for context. The data side exists today as the CSV export.
- **Timeline:** a lightweight bar chart by Due date and Start date, grouped by branch. Dragging bars changes dates.
- Grouping by Owner or Priority is cut with those Properties.
- Switching views keeps the selection and animates nodes between positions (see section 5).
- Out of scope for v1: dependencies, resource levelling, critical path.

### 3.5 Stickers [Built], Attachments [Cut]
- **Pictures [Built, new]**
  - Pasting an image from the clipboard (`⌘V`, or Paste in the node's context menu) puts it on the focused node, above the title. Text or Canopy nodes on the clipboard still paste as nodes, so a picture is used only when no text was copied with it.
  - The node sizes itself to the picture: it shows at its own size, scaled down (never up) to fit at most 280 × 200 units, with the title below. A node with a picture and no title shows no placeholder text.
  - On paste the image is scaled so its longest side is at most 1280 px and stored in the map as a WebP data URL (PNG where the browser cannot write WebP); further steps down are tried if it is still large. If it cannot be made small enough, a message says so and nothing changes.
  - Pasting also works while the title is being edited: the picture goes on that node, the typed text is kept and editing carries on. A new, otherwise empty node that gets a picture is not removed as blank.
  - One picture per node; pasting another replaces it (and clears its description). Undo restores the old one.
  - **Controls:** pointing at or selecting a node with a picture shows two round buttons on the picture's top-right corner: **Alt** and **✕**. ✕ removes the picture. Alt opens a one-line field over the picture's lower edge to type a description (up to 200 characters; Enter saves, Esc cancels, an empty text clears it). The Alt button is outlined in the accent colour when a description exists. The same actions are in the context menu ("Describe picture…", "Remove picture") and the palette (`topic.imageAlt`, `topic.imageRemove`).
  - **Alt text:** the description is saved as `image.alt`, read out after the node's title ("picture: …", or "has a picture" when there is none), shown as a tooltip on the picture, and written into SVG exports as the image's `<title>`.
  - The picture is part of the node, so it travels with Copy, Cut, Paste, Duplicate and the file, and is drawn in SVG, PNG and PDF exports. Markdown and CSV exports skip it.
  - Only embedded PNG, JPEG, WebP and GIF pictures are accepted from a file or the clipboard, up to about 4.5 MB each. Links to outside images and SVG are refused, so opening a map never loads anything from the web or runs script.
- **Drag and drop [Built, new]**
  - **A picture dropped on empty canvas** becomes a new, untitled node under the Core, with the picture on it.
  - **A picture dropped on a node** puts the picture on that node (replacing any it had). Several pictures dropped on one node: the first goes on it, and the others become child nodes, each with its own picture. Several on empty canvas each become a new node under the Core.
  - **A Canopy map file (`.json` or `.canopy.json`) dropped on a node** adds the whole map as a new last branch under it, or under the Core when dropped on empty canvas. The other map's Core becomes the top of the branch (named by the Core's title, or by the map's title when the Core still has the default name). It can be dropped any number of times.
    - Every node gets a new ID, so nothing clashes with the map it joins. Stickers, pictures, lines, properties, tasks, style and fold state come along, and so do tags its nodes use that this map lacks. References between its own nodes are kept; a reference to anything else cannot be, and is dropped. Its own Looks, preferences and saved Filters are not imported.
    - Files over 40 MB are refused.
  - Pictures and maps can be dropped together. Everything in one drop is one undo step, and the new nodes are selected.
  - **Feedback:** while files are dragged over the map, the node they would land on is outlined (or the whole canvas, for the Core), and a label says what will happen, such as "Add picture to “Beta”". Dropping outside the map does nothing, and the browser never opens the file in place of the map. A file that is neither a picture nor a map is refused with a message, and a map file that cannot be read says why.
  - **Without a mouse:** pasting a picture and the command "Add a map file as a branch of the selected node" (File menu, palette) cover the same ground from the keyboard.
- **Attachments [Cut]**
  - Files and unfurled links were removed from v1 (see 12.1). Old files that contain attachments still open, and the attachments are ignored. Pasted pictures (above) are the one exception.
- **Stickers (expressive) [Built, redesigned]**
  - A picker opens with `S`, or from the Stickers section of the Details panel. It shows all 28 original die-cut stickers, grouped as Home, Idea, Bug; Love, Celebrate, Thumbs up, Thumbs down; Check, Cross, Warning, Question; Pause, Delay; Flag, Pin; Arrow up, Arrow down; Priority 1–4; and Monday–Sunday. The seven weekday stickers form the final row. Priority and weekday labels use bold handwritten Kalam lettering; weekday cutouts have individual three-stop gradients and no badge background. New maps put Home on the Core. Synonyms stay concise and screen-reader friendly. **Deviation:** v0.2 planned vendored open-licence packs (Fluent Emoji) and custom upload. The set is original SVG art instead, so it looks identical on every platform and in exports, and needs no third-party licence. Custom upload was dropped.
  - Stickers stick to the four corners of a node (up to four per node), and land with a short stamp animation (instant under reduced motion).
  - **Each sticker is on a node or line at most once.** The sheet in the Stickers section shows every sticker as a switch: one that is on is ringed and tinted with a tick, and pressing a sticker puts it on, or takes it off when it is already on. There is no separate list of what is on the node. When the node or line is full (four, or three), the stickers that are off wait, and the ones that are on can still be pressed to take off. Files and the clipboard that repeat a sticker are read with one of each kind, keeping the first.
  - Stickers can also stick to a **Line** (see 3.10), up to three per line.
  - Stickers are the primary expressive marker and can also be used in Filters (3.4). Due dates and tags provide structured planning metadata.
  - Dragging and rotating stickers, a Fluent-style 3D set for Playful and a high-contrast set are not planned for v1.

### 3.6 Themes and colour modes [Built]

- **Colour mode:** Light, Dark, Auto (follows the OS). It is a device setting, kept in this browser and set from the top bar. In Dark mode the canvas is the darkest surface, so nodes and panels read as lighter layers on it.
- **Themes** (set in Settings). Each theme is a preset of colour, shape and font. The font, text size and line style are not separate settings.
  - *Standard:* a clean system sans-serif, a neutral palette, very subtle card borders and a flat, hard-edged shadow under each card for elevation, one accent. The Core is a solid block in the accent colour with light text (inverted in Dark mode). In Dark mode the canvas dots are very faint.
  - *High Contrast:* a serif font (Source Serif 4), black on white or white on black, thicker strokes, and a different corner shape per level, so level is not carried by colour. Colour contrast passes the automated check in both modes. A strict 7:1 measurement is not automated.
  - *Playful:* a handwritten font (Kalam). Every node is a **sticker** rather than a card: a light face tinted with the level's colour, inside a wavy white rim, over a flat offset shadow like the one under the sticker set. The title is set in the level's colour, which follows the level (the Core, then five colours that repeat). In Dark mode the rim becomes charcoal and the face a dark tint, both lighter than the canvas. Lines are drawn with a slight hand-drawn wobble, stable per line so they do not shimmer, and the layout settles with a small overshoot. The sticker covers the title and the chip row under it as one blob.
- **Text:** one weight for every level, with the level shown by size (18, 15 and 14 px). The Playful theme sets its text a little larger. The app chrome stays in the system font.
- **Lines:** always curved, in every theme, drawn at the same thickness in all of them and unchanged by zoom.
- **Level numbers:** an optional number such as `2.3` before each title, set small, faded and in a monospace face so it reads as a label.
- **Colour by level:** only Playful colours by level. A manual per-branch colour override is **[Planned, low priority]**.
- **Selection:** the selected node is marked with the interactive colour. In Playful its outline, tinted face and text all switch to the interactive colour instead of keeping the level colour.
- **Trail:** the nodes on the way up to the Core keep their normal borders and set their text in the interactive colour, and the lines on the way march toward the Core.
- Chips adopt the active theme: soft and flat in Standard, bordered with shapes in High Contrast, rounded and tactile in Playful.

### 3.7 Settings (global settings) [Built, reduced]

Settings live in the Settings tab of the left panel, in a theme choice and two groups. The map-level choices are saved in the file, and the device-level ones are kept in this browser and labelled as such.

- **Theme** (map), at the top with no title of its own, each name set in its own font.
- **Map:** Layout (Flow), Spacing, Property chips (Off, Compact, Full) (map), Handles (on hover, always, never; the add and reference buttons around a node; device).
- **Behaviour:** switches. Level numbers (map), then on this device: Trail, Shortcut hints, Preview on hover, Auto-pan, Text expansion, Remove empty new nodes.
- Each group title is followed by a line, the first group holds only segmented choices and the last only switches, and each setting is one line with its name set in semi-bold, dimmed text and its explanation behind a small "i" beside it. Animation follows the system's reduced-motion setting, and there is no separate setting for it. On a tall window the tab fits without scrolling, and on a shorter one it scrolls.
- **[Cut or deferred]:** typography scale per level, node shape, snap and grid, larger hit targets, screen-reader verbosity, date format and first day of the week, overdue behaviour, default export settings and anything about attachments or Roles. **[Planned]:** shortcut customisation (M5.6).

### 3.8 Import / Export [Built, simplified]

- **Export** (the Export tab of the left panel, or `⌘E`, with a live preview)
  - **PNG** at 1×, 2× and 4×, with an optional transparent background. The scale drops on its own when a map would be too large for a canvas.
  - **SVG**, vector, built from the layout and following the Theme, level numbers and folds, with the map's font embedded.
  - **PDF** through the browser's print dialog: one page sized to the map, vector, with selectable text. **Deviation:** no multi-page tiling and no bundled PDF writer.
  - **Compact layout for A4** (PNG, SVG and PDF): moves nodes so the map fills one A4 page, portrait, landscape or best fit. Each branch picks the arrangement that wastes least room (a column beside its parent, a row under it, or indented under it like an outline), and the top node can split its branches onto both sides. The picture takes the page's size and is shrunk only as far as needed. A map that already fits at full size is left as drawn. The map on screen is not changed.
  - **JSON**, versioned (`canopy/1`), round-trippable. Saved with File > Save a copy as a file.
  - **Markdown outline**, with tasks and links, and Properties written as the inline shorthand from 3.4.
  - **CSV**, one row per node with its path and Properties, defusing spreadsheet formulas.
  - **Selection export [Built]:** only the selected branches. **Frame export [Planned, low priority].**
- **Export options:** toggles for Stickers and Chips, and a **Filter-aware export** that includes only what the active Filter picks out.
- **Import:** JSON (File > Open), and pasted indented text or Markdown. **[Planned]:** OPML and CSV import with column mapping (M5.8). FreeMind and XMind stay stretch goals.
- **Round-trip guarantee [Built]:** JSON export followed by import is lossless. Old files that contain people, approvals, priority, progress or attachments open normally and ignore those fields.

### 3.9 Navigation aids: Trail, Branch view, Zen [Built, new]

These were not in v0.2. They exist to help someone work inside a big map without losing their place.

- **Trail:** the way up from the focused node to the Core. It is either highlighted (nodes and lines on the way, the rest left alone) or isolated (everything else hidden). The nodes on it set their text in the interactive colour, and its lines march toward the Core. A pill at the bottom chooses None, Highlight or Isolate, `R` turns it on or off, and a setting makes it the default. A status bar at the bottom shows the Trail as a path of node names, each one clickable, with **Copy path** just after it. The path is shown **in full while the bar has room for it**, however many levels it has. Only when it does not fit are the middle levels folded into an ellipsis (hovering it names them), and as few as possible, keeping the first level and the most recent ones. Names are shortened only after that, the earlier levels before the node you are on. Copy path writes the path as `!!A>B>C` (separators inside a name are turned into spaces), so pasting it into a new node rebuilds the same chain through text expansion (3.1).
- **Branch view:** `[`, the Fold everything above item in the context menu, or the brace button on the parent side of any node shows only that branch. Everything above it, all the parents and their peers, becomes one dotted node ("12 nodes above", with the path) at the root, so a subtree can be worked on without panning and zooming back and forth. Clicking the dotted node, pressing `[` again, or choosing Unfold everything (the status bar button, the toolbar button or `0`) returns to the whole map, so Unfold everything opens folded children and the parents together. The view fits itself when it starts and ends, and it is dropped when another map opens.
- **Zen (`Z`):** hides every panel and bar, leaving only the map, until you press `Esc` or the Exit Zen button. The button sits in the bottom left, in the corner the toolbar (and its Zen button) occupies when it is shown.
- **Pointer tools:** see 3.1.

### 3.10 Lines (edge labels and stickers) [Built, new]

- The line from a node to its parent can be picked (click it, or press `L` on the node). A small bar offers quick stickers, and the Stickers section then edits the line instead of the node. The bar's stickers are switches, like the sheet's: each is ringed while it is on the line, and a press puts it on or takes it off. Stickers that are on the line but not among the usual few are listed after them, so every one can be taken off from the bar. A **pencil** at the start of the bar opens the details panel and puts the cursor in its Label field.
- A line can carry a short label (up to 80 characters), such as "depends on", shown on the line, and up to three stickers.
- Lines are drawn with their label and stickers in exports.

### 3.10a References [Built, new]

A Reference links a node to an existing node anywhere in the map, so two branches that share the same sub-tree can point at one copy instead of repeating it. A node can make **several** References (many out) and several nodes can point at the same one (many in). A Reference does not move or copy anything and never changes the tree.

- **Drawn as:** a dashed line in the accent colour, drawn above the nodes, so it reads differently from the solid parent-child lines. It ends in an open "V" arrowhead, which reads well at any angle. Each line is one gentle arc, the shortest curve between the two nodes, like a flight path: it leaves the edge of one node and reaches the edge of the other, bowing a little to the left of the way it travels. Two nodes that reference each other therefore get two arcs on opposite sides, instead of one drawn over the other.
- **Faded:** lines are drawn faded, so one that passes over a node does not make its text hard to read. A line is shown in full when the pointer is over it, when it is picked, or when a node at either end of it is pointed at, picked or being edited.
- **Create by dragging:** the link-icon Reference Handle sits above a selected node (not shown on the Core). Drag it onto any other node: a dashed line follows the pointer and the node under it is highlighted. Release to connect. Releasing on empty canvas, or `Esc`, cancels.
- **Create by search:** click the handle, press `X`, or choose "Reference to…" in the node's context menu. A search over every node by name or full path (for example "Case Types › Workflow › Templates") picks the target. Nodes the source already points at are not offered again.
- **Add more:** making another Reference from the same node adds a line and keeps the others. Pointing at a node it already references does nothing.
- **Remove:** click a line to pick it and a red delete icon appears on its middle. Click the icon to remove that one Reference (undo restores it) and leave the others. Right-clicking a line offers *Go to referenced node*, *Go to the node it leaves*, *Add another reference…* and *Remove reference*. The *Remove node references* command takes away every Reference a node makes. Clicking elsewhere puts the icon away.
- **Integrity:** deleting a node (or its branch) removes every Reference that pointed into it and keeps the rest. A Reference to a missing node or to itself is rejected when a file is opened. Copy and paste keeps the References whose targets are in the same map and drops the others.

### 3.11 Editing aids [Built, new]

- **Insert between levels:** `W`, `Shift+W` and the in-line handle insert a node between two levels, so a missing parent or middle step can be added without dragging.
- **Text expansion, empty-node clean-up, auto-pan, context menu:** see 3.1.
- **Shortcut hint strip and cheat sheet:** the strip at the bottom adapts to what is selected. `?` opens a searchable cheat sheet built from the same registry as the handlers, so the two cannot drift apart.
- **Tooltips:** small labels with the shortcut on controls and on the fold and add buttons.

### 3.12 Saving [Built, changed]

- A map is stored in IndexedDB shortly after it is edited, and when the page is hidden. A map that has only been opened or just created is **not** stored, so reloading an untouched Untitled map does not leave empty maps behind. The first edit, including giving it a title, stores it.
- The File menu's **Examples** section opens a fresh, editable copy of the built-in SpecKit map. The bundled example itself is never changed.
- Saved maps can be deleted from the File menu after confirmation. Deleting the open map flushes pending autosaves, removes its stored record, then opens a new blank map.
- Opening or starting a different map finishes saving the one that was being edited, under its own identity.
- The title bar shows a save indicator with the time of the last save.
- File > Open and Save a copy move maps in and out as `.canopy.json` files, with a download fallback when the browser cannot choose a file.
- Patch-based writes (rather than whole documents) are still planned with performance work (M5.7).

## 4. Strongest and most unique differentiators

These are where we should beat Miro, XMind, MindMeister, Coggle and Whimsical. Tags show how far each one is.

1. **Ghost-Growth Handles [Built].** Hovering a handle previews the new node and its layout shift before you commit. Most tools only show a `+` icon. Ours shows the outcome.
2. **Outline and Map dual view, live-synced [Planned].** Edit in either view and the other updates, with an animated cross-highlight. This is both an accessibility feature and a power-user feature. Competitors are canvas-only.
3. **Semantic zoom (levels of detail) [Partly built].** Zoomed out, you see structure only. Zoomed in, Tasklists and Chips reveal themselves in place. Today there are two levels: full, and an icon level below 35% zoom, plus viewport culling. In the icon level text is not drawn. The Core shows a house; a picture shows a picture mark; Tasklists show a checklist, and text-only nodes show a **T**; tags show as dots in their colours and a due date as a small square (in the warning colour when late). Fold buttons stay on maps of up to 600 nodes, and the add and reference handles step aside, since they would be larger than the nodes.
4. **Flow morphing and per-branch Flow [Planned].** Layouts are animated transformations, not jumps, and each branch can use a different Flow. Few competitors support mixed layouts.
5. **Map-native planning with shorthand entry [Built].** Type `Draft launch plan #launch ^fri` and you get a node with a tag and due date, without opening a form. Tasklists keep checkable work inline with the map. Most planners have no free-form thinking space.
6. **Filters that follow you across views [Partly built].** One Filter applies to the map, the Trail, the next-match jumps and the exports, and the map dims instead of rearranging, so spatial memory is preserved. The Outline, Board, Table and Timeline are the views still to join.
7. **One data model, many projections [Planned].** Map, Board, Table and Timeline are animated views of the same nodes. Dragging a card in Board changes the map, and no sync or duplication is involved.
8. **Tour mode with camera choreography [Planned].** Present the map as a story. Each step focuses a branch, dims the rest, and moves the camera smoothly with an optional narration note. Tour order can differ from tree order. The Branch view and Trail (3.9) cover part of the "focus" half already.
9. **Brain-dump paste [Partly built].** Paste any outline and watch it become a tree. Pasted outlines and `!!` text expansion work today. Recognising shorthand while pasting, OPML, and the unfurl animation are planned.
10. **Visual history (time-scrub) [Planned].** Undo and redo as a scrubbable timeline instead of only a linear stack, and you can restore a single branch from the past. Today there is ordinary undo and redo.
11. **Accessible by design [Built, audit pending].** ARIA tree semantics, a full keyboard model, reduced motion, High Contrast and screen-reader announcements. A manual screen-reader audit is still to do.
12. **Local-first [Built].** The app works offline and saves to IndexedDB, with files in and out through File > Open and Save a copy. There is no login wall, which matters for enterprise privacy reviews.
13. **Navigation aids for large maps [Built, new].** The Trail, Branch view and Zen (3.9) keep you oriented in a big map, and the Branch view in particular turns "zoom and pan back and forth" into one key press.

## 5. Motion system [Built, with the planned moments marked]

**Principles:** continuity (shared-element movement), causality (origin to destination), restraint (under 300 ms for most UI), and interruptibility (any animation can be cancelled by new input).

Tokens live in `motion/`. A layout animator (`canvas/animator.ts`) tweens every layout change outside React, jumps for maps over 1,500 nodes, and jumps everywhere under reduced motion. **Deviation:** v0.2 named a spring library. The animator is small and hand-written instead.

| Token | Duration | Easing |
|---|---|---|
| `instant` | 80 ms | linear |
| `quick` | 160 ms | ease-out |
| `standard` | 240 ms | cubic-bezier(.2,.8,.2,1) |
| `layout` | 420 ms | spring (stiffness 260, damping 28) |
| `playful` | 520 ms | spring with overshoot, Playful theme only |

**Choreographed moments**
- **Create node [Built]:** grows out of its parent along the connector, then peers ease aside (layout spring) and the caret lands in inline edit. The ghost preview becomes the real node in place.
- **Fold / Unfold [Built]:** children fold into the parent along their connectors. The count-up on the badge and the 20 ms stagger are not built.
- **Flow morph [Planned]:** nodes travel along arcs to their new positions, connectors redraw, and stagger runs from the Core outward.
- **View switch (Map, Board, Table, Timeline) [Planned]:** nodes travel to their new positions as shared elements, while content that has no counterpart fades.
- **Delete [Built]:** the branch fades and shrinks toward its parent, with an Undo toast that goes away once the map changes again.
  - **Deleting a node that has child nodes asks first.** A dialog offers *Delete the node only* (its direct child nodes move up to its parent, in the node's place and in their own order, and everything below them stays), *Delete the whole branch*, and Cancel. The safer first choice has focus, and Esc cancels. With several nodes selected it asks once if any of them has child nodes. Nodes with nothing below them are deleted straight away. Both ways can be undone in one step. The commands are also available without the dialog as "Delete the node and keep its child nodes" and "Delete the whole branch without asking", and in the right-click menu. Cut does not ask, because the branch goes to the clipboard.
- **Re-parent drag [Built]:** the node lifts, a drop-target line shows the exact slot, and on drop it settles.
- **Filter and Trail [Built]:** non-matching nodes fade, and the camera follows the selection (auto-pan). Smooth camera paths for **Focus / Tour** are **[Planned]**.
- **Selection [Built]:** a ring and a light wash, and the handles fade in after a short delay to avoid flicker.
- **Task completion [Built]:** marking a task complete updates its checkmark and label in the node and Details panel.
- **Stickers [Built]:** land like a stamp.
- **Reduced motion [Built]:** springs become short fades, and layout changes jump. Changes are still shown, but without travel.

## 6. Accessibility requirements

- WCAG 2.2 AA minimum, and AAA in the High Contrast theme. Automated axe-core checks run in Light and Dark, in every theme, while editing, and in every panel and dialog. A manual screen-reader pass by a person is still to do, as is a measured 7:1 check for High Contrast.
- **Tree semantics [Built]:** the map is one tab stop exposed as `role="tree"` with `aria-activedescendant`, and each node is a `treeitem` with `aria-level`, `aria-expanded`, `aria-posinset`, `aria-setsize` and `aria-selected`. Nothing needs DOM focus to move, which also works with viewport culling. **Deviation:** v0.2 said roving tabindex. The **Outline** view, as the canonical accessible representation, is **[Planned]** (M4.1).
- Visible focus ring in every theme (at least 3:1 contrast). Selection has its own colour, an offset halo and a light wash, and editing shows one selection mark.
- Never rely on color alone: overdue dates are bold and underlined, task completion has a checkmark and strikethrough, and High Contrast carries Level in corner shape.
- Nodes have accessible names that include their Properties and tasks.
- Property Quick-Add, the Filter and every panel are fully keyboard and screen-reader operable.
- Board view keyboard moves (select card, then `⌥+Arrows` to change column) with announcements **[Planned]** with the Board.
- Target size of at least 24×24 px **[Partly]**. The larger option in Settings is **[Cut]**.
- Live-region announcements for create, move, fold, delete, undo, redo, Filter jumps, Branch view and Property changes.
- A `?` cheat sheet with search, built from the shortcut registry. Full shortcut customization is **[Planned]** (M5.6).
- Tab is used for "add child node", so keyboard users can always leave the map: `Esc` (with nothing to cancel) releases focus and `Shift+Tab` moves to the previous control.
- `prefers-reduced-motion` and `prefers-color-scheme` are respected. `prefers-contrast` is **[Planned]**.
- Zoom to 400% without loss of function.

## 7. Key shortcuts (default)

| Action | Shortcut | Status |
|---|---|---|
| Add child node / peer | `Tab` / `Enter` | Built |
| Add peer above | `Shift+Enter` | Built |
| Insert a node between this and its parent / child nodes | `W` / `Shift+W` | Built |
| Edit / finish | `Space` or `F2` / `⌘Enter` | Built |
| Delete node (asks when it has child nodes) / duplicate branch | `Del` / `⌘D` | Built |
| Fold / unfold | `]` | Built (was `.`) |
| Fold to Level N / unfold all | `1–9` / `0` | Built |
| Fold everything above (Branch view), toggle | `[` | Built |
| Move selection / reorder peers | Arrows / `⌥`+Arrows | Built |
| Select branch | `⌘A` | Built |
| Manage tasks | `T` | Built |
| Sticker picker | `S` | Built |
| Label the line to the parent | `L` | Built |
| Show or hide the inspector | `I` | Built |
| Property Quick-Add / all properties | `P` / `Shift+P` | Built |
| Set due date / tag | `D` / `G` | Built |
| Search nodes, commands and filters | `⌘F`, `⌘K` | Built |
| Search with quick filters | `/` or `F` | Built (the Filter tab was merged into Search) |
| Reference another node (search) | `X` | Built |
| Next / previous Filter match | `.` / `,` | Built (were `]` / `[`) |
| Trail on or off | `R` | Built |
| Zen | `Z` | Built |
| Select / Pan / Zoom tool | `V` / `H` / `Shift+Z` | Built |
| Zoom in / out | `⌘+` / `⌘-` | Built |
| Search (opens the same dialog) | `⌘K` | Built |
| Settings | `⌘,` | Built |
| Cheat sheet | `?` | Built |
| Copy / Cut / Paste as child node / Paste as peer | `⌘C` / `⌘X` / `⌘V` / `⌘⇧V` | Built |
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

The file keeps schema `canopy/1`. Every change since v0.2 only removed fields or added optional ones, so no migration was needed and older files open as they are. The in-memory form is a normalised node table, and the file form below is nested (`toFile`, `parseFile`).

```json
{
  "schema": "canopy/1",
  "meta": { "title": "", "created": "", "modified": "" },
  "prefs": {
    "flow": "right", "density": "comfortable", "look": "minimal",
    "showLevels": false, "chips": "compact"
  },
  "planning": {
    "tags": [{ "key": "launch", "label": "Launch", "color": "#7C5CFF" }]
  },
  "core": {
    "id": "t_1", "title": "", "folded": false,
    "style": { "color": "purple" },
    "tasks": [{ "id": "task_1", "text": "Write release notes", "done": false }],
    "stickers": [{ "id": "s_1", "key": "love" }],
    "edge": { "label": "depends on", "stickers": [{ "id": "s_2", "key": "flag" }] },
    "references": ["t_9", "t_12"],
    "image": { "src": "data:image/webp;base64,...", "w": 640, "h": 480, "alt": "Login screen" },
    "props": { "due": { "end": "2026-11-01" }, "tags": ["launch"] },
    "children": []
  },
  "filters": [{ "id": "l_1", "name": "Love", "mode": "dim", "query": { "stickers": ["love"] } }]
}
```

Notes:
- The colour mode is a device setting and is not saved in the file. The theme's font and line style come from the theme, so the file does not store them.
- `props`, `stickers`, `edge`, `references` and `image` are omitted on nodes without them, keeping plain maps small.
- `references` holds the IDs of the nodes a node points to, in the order they were made. Each must name another node in the same file. A missing or self-pointing target makes the file fail to open with a clear message. A single `referenceTo` ID, as written by older files, is read as a one-item list.
- Roll-ups are computed, never stored. Fold state is stored. Children are written in order, and their fractional ordering keys are rebuilt on load.
- A Filter query can use `tags`, `stickers`, `due` (`overdue` or `week`), `dueBetween` and `match` (`all` or `any`).
- `image` holds the pasted picture as `src` (an embedded `data:image/png|jpeg|webp|gif;base64,` URL) with its pixel size `w` and `h`, and an optional `alt` description (up to 200 characters). The display size is worked out from these and is not stored. A file whose `image` is not an embedded raster picture of a sensible size fails to open with a message.
- **Removed:** workflow statuses and status filters. Legacy `planning.statusSet`, `props.status`, and status-only filter data are discarded when a file is opened. Attachments and other removed fields are also dropped on the next save.
- **Node styling and tasks:** optional `style.color` (a preset name) and `tasks` (items with an ID, text and completion state) are stored per node. Older `style.type` fields are ignored; task presence determines whether a node is rendered as a Tasklist.
- **Not yet present:** `flowOverride` and `tour`, which belong to planned features.
- Tags are referenced by key so renaming a tag updates every node.

## 9. Technical approach (as built)

- **Stack [Built]:** React 19, TypeScript 6 (strict) and Vite 8, with Vitest, Playwright and axe-core, ESLint 9 and Prettier. ESLint stays on 9 until the accessibility lint plugin supports 10.
- **Rendering [Built]:** a custom SVG renderer (not React Flow, see 9.1) for nodes and connectors, with a DOM overlay for inline editing, handles and menus. Pan and zoom use a small custom viewport controller, not `d3-zoom`. This keeps vector export and the accessible tree straightforward.
- **Scale target: 5,000 nodes** (see 9.2 for the performance budget).
- **Layout [Right and Down built]:** a custom tidy-tree implementation with variable-size nodes. It is a single O(n) pass (about 4 ms for 5,000 nodes), and measurements are cached per node object, so a separate incremental engine was not needed. Left, Both and Radial are planned.
- **State [Built]:** a Zustand store with Immer. **Deviation:** undo and redo store snapshots with structural sharing and grouping of rapid edits, not patches. A history timeline will need either patches or snapshot browsing. Roll-ups and Filter results are derived values, cached per edit.
- **Planner views [Planned]:** Board, Table and Timeline will be read/write projections over the same store. The table data and the CSV export already exist.
- **Motion [Built, deviation]:** motion tokens in CSS and `motion/`, a small hand-written layout animator and a central reduced-motion gate. No spring library was added.
- **Export [Built, deviation]:** SVG built from the layout, PNG through a canvas, PDF through the print dialog, CSV from the table data.
- **Persistence [Built]:** IndexedDB (Dexie) written after edits (3.12), plus files in and out with the File System Access API and a download fallback. Patch-based autosave is planned.
- **Theming [Built]:** design tokens (CSS variables) for colour mode × theme, so combinations don't multiply code. Fonts are bundled (`@fontsource`), so the app works offline.
- **Quality [Built, partly]:** unit tests (Vitest, 263 including property-based tree tests), end-to-end tests (Playwright, with axe in every theme and colour mode) a benchmark script, and a script that makes the README screenshots again (`npm run screenshots`). The visual-regression suite is not set up.

### 9.1 Decision: React Flow vs custom renderer

React Flow (MIT, `@xyflow/react`) is excellent for node-and-edge diagrams, and it has a mind-map tutorial. For Canopy it is more restrictive than helpful:

| Need | React Flow | Impact |
|---|---|---|
| Layout | No built-in layout. Docs point to dagre, d3-hierarchy, d3-flextree, elkjs. d3-hierarchy assumes equal node sizes | We need our own tidy-tree with variable-size nodes, per-branch Flow and radial anyway |
| Flow morph and fold animation | Positions live in React state, so animating thousands of nodes means re-rendering them every frame | Conflicts with the motion system at 5k nodes |
| Data model | Flat `nodes[]` and `edges[]` graph | Our model is a tree with fold, branch operations, Properties roll-ups. We would maintain a second model and sync it |
| Vector export (SVG, PDF) | Nodes are HTML elements, so export is rasterized (image) | Fails the vector export goal |
| Accessibility | Basic keyboard and ARIA support for nodes | We need `role="tree"` semantics and the Outline as canonical view |
| Growth Handles | `Handle` is a connection port | Ghost-preview add handles are custom regardless |
| Performance | Docs recommend memoization, hiding collapsed subtrees and simple styles. Rich DOM nodes (Chips, Tasks, stickers) are costly | Tight at 5k nodes with rich nodes |
| Pro features | Edge routing and editable edges are paid | Not needed for trees |

What React Flow would give us for free (pan/zoom, selection box, minimap, fit view) is a small part of the work and is easy to build or borrow from `d3-zoom`. **Decision: custom SVG renderer.** A time-boxed spike with React Flow is only worth it if we later decide to drop vector export and Flow morph.

### 9.2 Performance budget (5,000 nodes)

Last measured at the end of Phase 3 (headless Chromium): first paint 323 ms with Properties, 60 fps pan and zoom, create to editor 87 ms, fold 99 ms and unfold 154 ms. The unfold and fold figures are a little above the 100 ms target on the largest map. **The benchmark has not been re-run since the interface rework and the later features**, which is the first item of the remaining work.

- **Interaction:** 60 fps pan and zoom, under 100 ms from keypress to visible result for create, fold and edit.
- **Viewport culling [Built]:** only nodes and connectors intersecting the viewport (plus a margin) are mounted.
- **Level of detail [Partly built]:** below 35% zoom text drops out and nodes show icons (see section 5). The title-only and dot levels belong to semantic zoom (M4.2).
- **Incremental layout [Not needed so far]:** the single-pass layout is fast enough. A Web Worker above roughly 1,000 nodes is **[Planned]** only if measurements say it is needed.
- **Fold on import:** large imports fold deeper than Level 3 by default **[Planned]**.
- **Animation limits [Built]:** maps over 1,500 nodes jump instead of animating.
- **Memoized derived data [Built]:** roll-ups and Filter results are cached per edit.
- **Storage [Planned]:** autosave writes patches, not the whole document, with a debounce. Today it writes the whole document after a short pause.
- **CI [Planned]:** a 5,000-node benchmark with thresholds enforced.

### 9.3 Sticker and icon sourcing (as built)

v0.2 planned vendored open-licence packs (Fluent Emoji, Noto Emoji, Phosphor). The first pass used system emoji, and the interface rework replaced them with an original sticker set, so the plan to vendor third-party artwork is **dropped**.

- **Stickers:** 28 original die-cut SVG stickers drawn in code (`stickers/art.tsx`), with clear names and searchable aliases in `stickers/catalog.ts`. The set includes Home, idea/work, reaction, status, timing, weekday, marker, direction and priority stickers. Weekdays use bold handwritten three-letter text cutouts with individual three-stop gradients and no badge background; priorities use the same handwritten style. New maps put Home on the Core, and layout spacing accounts for sticker artwork. They look the same on every platform and in every export, and need no third-party artwork or licence.
- **Interface icons:** a small set of icons drawn for the app (`ui/icons.tsx`).
- **Fonts:** bundled through `@fontsource`, so the app works offline: Kalam (Playful), Source Serif 4 (High Contrast), JetBrains Mono (the level numbers) and Bricolage Grotesque (the app name). Standard uses the system sans-serif. All are Google Fonts under the SIL Open Font License, listed with their copyright holders in `THIRD_PARTY_NOTICES.md`.
- **Still to do:** an About screen with the credits list (M5.9). Custom sticker upload, which v0.2 kept in scope, is dropped.

## 10. Delivery phases

1. **Foundation [Done]:** Map data model, Core/Node CRUD, the Right and Down Flows, full keyboard model, Growth Handles with ghost preview, fold/unfold, copy/paste, autosave, undo/redo, colour mode and the Standard theme, JSON import and export.
2. **Expression [Done, simplified]:** Stickers, all Themes, Settings, PNG/SVG/PDF export, Command Palette. Topic notes were removed; attachments were cut.
3. **Planning [Done, reduced]:** Properties (Due date, Tags), Tasklists, Chips, Quick-Add and inline shorthand, roll-ups, Filters, CSV export. Workflow statuses and other planner fields were removed.
4. **Interface rework and navigation aids [Done, unplanned]:** floating panels, inspector, Trail, Branch view, Zen, pointer tools, lines, insert between, context menu, status bar, text expansion (section 12).
5. **Delight and depth [Not started]:** Outline view, semantic zoom, Flow morph and per-branch Flow, Brain-dump import, Focus, Tour, minimap.
6. **Planner views and polish [Not started]:** Board, Table, Timeline, custom Properties and workflow rules, visual history timeline, accessibility audit, shortcut customization, performance on 5k+ nodes, OPML and CSV import, localization.

The plan numbers these as Phases 1 to 5, with the interface rework recorded as unplanned work between 3 and 4. See plan.md, "Remaining work", for the order proposed for what is left.

## 11. Decisions

1. **Product name:** Canopy (confirmed).
2. **Collaboration:** out of scope for v1 (local-first). The data model stays CRDT-friendly: stable IDs, ID-based references, no positional indexes in stored data, and ordered children stored with fractional ordering keys so concurrent edits can merge later.
3. **Stack:** React + TypeScript with a custom SVG renderer, not React Flow (see 9.1).
4. **Sticker art:** original SVG art drawn for Canopy (28 stickers). Open-licence packs were dropped (see 9.3). Changed from v0.2.
5. **Scale target:** 5,000 nodes (see 9.2).
6. **Planning depth:** Board, Table and Timeline are enough for v1. Dependencies between nodes are out of scope.
7. **Approval model:** **[Cut]** with People. Approval is not part of v1.
8. **Sticker style:** one original flat die-cut style in every theme. The Playful theme sets its nodes in the same sticker style.
9. **Planning scope:** v1 planning is Due date, Tags and Tasklists, plus roll-ups and Filters. People, Roles, Approval, Priority, Progress, custom Properties and workflow rules are out of v1.
10. **Attachments:** out of v1.
11. **Saving:** a map is stored only after it is edited, so opening or creating an untouched map leaves nothing behind.
12. **Shortcut keys:** `[` folds the parents (Branch view) and `]` folds the children, and both toggle, so the two directions of the tree sit on adjacent keys. The Filter's next and previous match moved to `.` and `,` to free the brackets.
13. **Words:** the interface says Fold and Unfold, never Collapse or Expand.

## 12. Changes since v0.2 and what remains

### 12.1 Cut from v1

A scope cut on 2026-10-08 removed several planner concepts; a later cleanup also removed workflow statuses and their saved data.

| Feature in v0.2 | Note |
|---|---|
| People, Roles, Roster, "I am" | Removed with the scope cut. The file format ignores old data. Collaboration stays a post-v1 node, and the data model could carry people again later |
| Approval and workflow rules | Depended on People |
| Workflow statuses | Removed from the model, UI, filters and exports. Legacy status fields are discarded when files are opened |
| Topic notes | Removed from the model, UI and exports. Legacy `note` fields are ignored when files are opened |
| Priority and Progress | Removed with the scope cut. Roll-ups count due dates |
| Custom Properties | Not built. Tags and Tasklists cover common needs |
| Attachments and link previews | Removed with the scope cut. Link previews also needed network requests, which conflicts with local-first |
| Custom sticker upload | Replaced by a built-in original set |
| Saved-Filter presets such as Mine and Awaiting my approval | Depended on People. Filters cover Tags, Due date and Stickers |
| Larger hit targets, screen-reader verbosity, date and week preferences | Not built, and not currently planned |

### 12.2 Deviations from v0.2

| Area | v0.2 | Now |
|---|---|---|
| Topic notes | Markdown text field with toolbar and preview | Removed; tasks remain as the node's inline structured content |
| Stickers | Vendored open packs, drag and rotate | 28 original die-cut stickers on four corners, plus lines |
| PDF export | Vector with multi-page tiling | One page through the print dialog |
| Undo history | Immer patches | Snapshots with structural sharing |
| Motion | Spring library | Hand-written layout animator |
| Accessibility tree | Roving tabindex | One tab stop with `aria-activedescendant` |
| Themes | Playful colours by top-level branch | Playful colours by level, with sticker nodes |
| Settings | A Preferences dialog with a Planning section | A Settings tab in the left panel |
| Filter | Saved presets, AND/OR | Ticked groups (AND between groups, OR within), plus saved Filters read from files |
| Fold key | `.` | `]` |
| Filter match keys | `]` and `[` | `.` and `,` |
| Top bar | Flow, Look/Mode, Filter, Share | A slim bar: File menu, title, save indicator, undo and redo, colour mode, search. The rest moved to panels |
| Saving | Autosave | Autosave after the first edit only |

### 12.3 Added since v0.2

- Floating left panel (Settings, Filter, Tags, Export) and right details panel with tabs.
- Trail (highlight or isolate) with a status bar path and Copy path.
- Branch view (fold everything above into one dotted node), with a brace button on every node.
- Zen mode, pointer tools (Select, Pan, Zoom), unfold-everything button.
- Lines with labels and stickers, and the quick sticker bar.
- Insert a node between levels (`W`, `Shift+W`, the in-line handle).
- Text expansion with `!!`, and removal of empty new nodes.
- Auto-pan, context menu, tooltips, searchable cheat sheet, save indicator.
- Level numbers in small faded monospace, and the three themes (Standard with subtle borders and flat shadows, High Contrast, and Playful with sticker nodes).
- Filter by sticker, and the date-range Filter.
- Delete asks whether to remove a branch or only the node; stickers are one-per-kind switches with a pencil on the line bar; nodes become icons when zoomed out; Exit Zen moved to the bottom left; handles follow their node while it moves; the pointer tool keys (Space, Cmd, Alt) are tracked reliably.
- Pictures pasted from the clipboard onto nodes, and drag and drop of pictures and whole map files onto the canvas or a node (3.5).
- References between nodes (Reference Handle with drag-to-connect, search by path, delete icon and line menu), and `⌘F` fuzzy node search with the Filter panel as its advanced mode.

### 12.4 What remains

Everything tagged **[Planned]** above. In the order proposed in plan.md: re-measure performance, Outline and screen-reader pass, semantic zoom, Flow variants and morph, Brain-dump polish, Focus and Tour, minimap, the planner views (Board, Table, Timeline), visual history, shortcut customisation, 5,000-node performance work and CI thresholds, OPML and CSV import, localisation, an About screen with credits, and release hardening. Small leftovers: `⌘⌥V` paste style, Frame export, manual branch colour, `prefers-contrast`, and visual-regression baselines.
