# Buleks Todo

A **standalone todo / requirement board** plugin for SiYuan. It does not scan checkboxes in your notes — tasks live in the plugin's own storage, inside a dedicated tab.

Create tasks, move them through statuses, organize them by groups and tags, archive closed items by year, and see what was finished in the last 7 days at a glance. Every task can generate its own SiYuan document and jump straight to it.

## Features

| Feature | Description |
| --- | --- |
| Tab UI | The board opens as a SiYuan tab, not a dialog |
| Create tasks | Top-right "New task" button or the `⌥⌘T` shortcut |
| Status flow | Todo → Doing → Done / Closed / Cancelled, reopen any time |
| Timestamps | Done time, close time and cancel time are recorded automatically |
| Groups | Organize by feature/module on the left rail; hover a group to rename or recolor, right-click for more |
| Sorting | Unfinished tasks first (priority → due date → created), finished tasks by finish time, newest first |
| Tags | Any number of tags per task; the tag panel follows the selected group and supports multi-select (union) filtering |
| 7-day summary | Collapsible header block listing tasks done **and** closed in the last 7 days, grouped by day, with a status tag per item |
| Pagination | 50 items per page, auto-loads on scroll (or click "Load more") — stays smooth with thousands of tasks |
| Archive by year | One click archives **closed** tasks into `archive-YYYY.json` per close year; the main list stays lean |
| Browse archive | The "Include archived" switch merges archived tasks back into the list with group / tag / search filtering; archived tasks are read-only until unarchived |
| Batch operations | Batch mode: select many tasks and set them to Doing / Done / Closed / Cancelled, or delete them in bulk |
| Import history | Paste a markdown checklist (`- [X]`, `- [ ]`, `- [-]`) to import historical todos; SiYuan block refs `((id "title"))` become links that open the source document |
| SiYuan documents | Create a document per task under `base path / group / YYYYMM / task title` |
| Linked docs | The 📄 icon on a card opens the generated document or the imported block reference |
| History | Per-task change log (status, group, tags, title, description, archive) shown in the detail panel |
| Detail panel | Edit title, description, group, priority and due date in place |
| Bilingual | Chinese and English UI |

## Install

- From the SiYuan marketplace (after this plugin is listed), or
- Manual: download `package.zip` from the latest release, unzip it into `{workspace}/data/plugins/buleks-todo/`, then restart SiYuan and enable the plugin in **Settings → Marketplace → Downloaded**.

## Usage

1. Click the todo icon in the top bar (or run the `⌥⌘T` command) to open the board tab.
2. Create a group first (left rail), then add tasks and assign them to that group.
3. Use tags for cross-cutting views; combine group + tags to narrow down requirements.
4. Set a document folder in Settings if you want per-task documents.
5. When closed items pile up, click 📥 in the header to archive them by year.

## Data

All data is stored in the workspace under `data/storage/petal/buleks-todo/` (`board.json` plus `archive-YYYY.json` per year). Deleting that folder removes all plugin data — back it up if needed.

## License

MIT
