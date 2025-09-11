# Copilot / AI assistant instructions for `favorite-files`

This file contains focused, actionable guidance for AI agents working on the `favorite-files` VS Code extension so they can be productive immediately.

Working assumptions
- The project is a small VS Code extension written in TypeScript bundled with Webpack.
- Extension state is persisted in `context.workspaceState` (key: `favorites`, `bookmarks`, `favoriteAliases`).
- Tree UI is implemented in `src/FavoritesProvider.ts` and core commands live in `src/extension.ts`.

What to edit and why (big picture)
- `src/extension.ts` — main activation logic, command registrations, import/export, migration and workspace state writes. Most behavioral changes (commands, state migration, persistence) are here.
- `src/FavoritesProvider.ts` — TreeDataProvider and drag-drop controller. UI/tree rendering, context values, and drag/drop handlers live here.
- `src/types.ts` — canonical shape of persisted data: `Favorites`, `Bookmarks`, `Bookmark`.
- `package.json` — contributions (commands, views, menus), activation events, and scripts (build/test/watch).

Key patterns and conventions (from code)
- Workspace state keys
  - `favorites`: { [group: string]: { files: string[], bookmarks: Bookmark[] } }
  - `bookmarks`: { [filePath: string]: Bookmark[] }
  - `favoriteAliases`: { [filePath: string]: alias }
- UI tree item `contextValue`s: `group`, `file`, `bookmark`, `bookmark-file`, `bookmarks-group`, `group-bookmarks`.
  - Use these values to gate `when` clauses in `package.json` menus and to identify items in commands.
- Tree items representing files set `resourceUri` to `vscode.Uri.file(filePath)` and commands like `vscode.open` or `favorite-files.openBookmark`.
- Drag & drop data transfer uses a custom mime type: `application/vnd.favorite-file-path` with payload { filePath, group } (see `FavoritesProvider.ts`). Keep the same mime type when interacting with drag/drop logic.
- Aliases: renaming a favorite does not change the file on disk; it writes to `favoriteAliases` in workspace state.

Developer workflows and commands (how to build, run, test, debug)
- Build bundle: `npm run compile` (runs webpack, writes `dist/extension.js`).
- Watch bundle during development: `npm run watch` (webpack --watch). There is a VS Code task configured to run this.
- Compile tests: `npm run compile-tests` (tsc -> `out`), watch tests: `npm run watch-tests`.
- Run tests: `npm test` (uses `vscode-test`). The test runner expects compiled tests in `out/test/**/*.test.js` (see `.vscode-test.mjs`).
- Debug extension in VS Code: press F5 (uses `.vscode/launch.json`) — ensure `dist/**/*.js` exists (run a build/watch first).
- Recommended VS Code tasks: open Command Palette > Tasks: Run Task > `tasks: watch-tests` (watches both webpack and tsc).

Important files and what they show
- `src/extension.ts` — shows all command registrations (`favorite-files.*`), state migration (`migrateOldFavorites` and `validateAndMigrateImportData`), export/import logic (also creates backups), and menu wiring.
- `src/FavoritesProvider.ts` — tree model and drag-and-drop: `dragMimeTypes`, `dropMimeTypes`, `handleDrag`, `handleDrop`. `getChildren` uses `contextValue` to determine structure.
- `src/types.ts` — data model; use this as source-of-truth for validation and imports.
- `webpack.config.js` — bundling config (target node, externals: `vscode`) and `ts-loader`.
- `.vscode/tasks.json` and `.vscode/launch.json` — helpful quickstart for running and debugging.

Examples and snippets to mirror (copyable guidance)
- Read favorites and update:
  - const favorites = context.workspaceState.get<Favorites>('favorites', {});
  - favorites[group].files.push(filePath);
  - await context.workspaceState.update('favorites', favorites);
  - favoritesProvider.refresh();

- Drag-and-drop payload (used in `handleDrag`):
  - dataTransfer.set('application/vnd.favorite-file-path', new vscode.DataTransferItem(JSON.stringify({ filePath, group })));

- Reordering logic (used in `handleDrop`):
  - const files = favorites[group].files;
  - files.splice(oldIndex, 1);
  - files.splice(newIndex, 0, movedFile);
  - await workspaceState.update('favorites', favorites);

Project-specific rules for AI changes
- Preserve workspace state semantics. When modifying favorites/bookmarks, always read the existing object from `context.workspaceState`, mutate a copy (or its arrays), then call `context.workspaceState.update(...)` and `favoritesProvider.refresh()` so the UI reflects changes.
- Use `vscode.Uri.file(filePath)` for TreeItem `resourceUri`.
- When adding commands, update `package.json` contributions: `commands`, and if they should appear in the view/context menus, add entries to `contributes.menus.view/item/context` with the correct `when` clause using `view == favorite-files-view && viewItem == <contextValue>`.
- Keep the mime type `application/vnd.favorite-file-path` for drag/drop interoperability.

What *not* to change without checking
- `package.json` contribution `activationEvents` and `contributes.views` — changing these affects extension activation and UI integration.
- `webpack.config.js` externals list — removing `vscode` from externals breaks the bundle.

Testing tips (small, specific tests to add)
- Unit test for `validateAndMigrateImportData` covering: old array format, old grouped array format, and new format.
- Integration-style test (manual) to verify drag-and-drop reordering persists across window reloads: add multiple favorites to a group, reorder them in the view, reload the window, assert workspaceState `favorites[group].files` order preserved.

Where to look first when an issue is reported
- UI not updating after state change: check `favoritesProvider.refresh()` calls and `context.workspaceState.update(...)` usage.
- Drag/drop not reordering: confirm `dragMimeTypes` and `dropMimeTypes` match, payload JSON contains both `filePath` and `group`, and `handleDrop` updates the same `favorites` group.
- Import/export issues: check `validateAndMigrateImportData` and the backup logic in the import command.

If you need clarification
- Ask: preferred persistent storage beyond `workspaceState`? Multi-root workspace behavior? (current code uses workspaceState and prefers workspace folder for backup when available)

Please review these instructions and tell me any missing developer workflows or specific conventions you'd like the AI to follow.