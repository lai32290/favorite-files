# Favorite Files VS Code Extension

Favorite Files is a powerful VS Code extension that lets you organize, access, and manage your favorite files, folders, and bookmarks directly from the sidebar. Group files, add bookmarks to specific lines, and quickly jump to important code locations with ease.

## Features

- Add files to favorites and organize them into custom groups
- Create, rename, and delete groups for better organization
- Add bookmarks to specific lines in files, with optional descriptions
- Organize bookmarks globally or within groups
- Quickly open favorite files or bookmarked lines from the sidebar
- Rename favorites (set an alias) without renaming the file on disk
- Remove favorites, bookmarks, or entire groups with context menu actions
- Export and import all favorites and bookmarks (with statistics and backup)
- Automatic migration and backup for old data formats
- All actions available via context menus and the command palette

## Usage

### Adding Files to Favorites
1. Right-click a file in the Explorer or use the command palette (`Cmd+Shift+P` > "Add to Favorites")
2. Select an existing group or create a new one
3. The file appears in the Favorites sidebar under the chosen group

### Creating and Managing Groups
- Use the sidebar or command palette to create, rename, or delete groups
- Add the active file to a group via the context menu on a group

### Adding Bookmarks
1. Place your cursor on the line you want to bookmark
2. Click the bookmark icon in the editor title bar or use the command palette (`Add Bookmark`)
3. Optionally add a description for the bookmark
4. The bookmark appears in the sidebar under "Bookmarks" or within a group

### Adding Bookmarks to Groups
1. Place your cursor on the line you want to bookmark
2. Right-click a group in the sidebar and select "Add Bookmark to Group"
3. Optionally add a description
4. The bookmark appears under the group's "Bookmarks" section

### Managing Favorites and Bookmarks
- Right-click a favorite to rename (set alias) or remove it
- Right-click a bookmark to rename or remove it
- Right-click a file with bookmarks to clear all bookmarks for that file
- Right-click the "Bookmarks" group to clear all bookmarks
- Right-click a group's "Bookmarks" section to clear all bookmarks for that group
- Click a bookmark to open the file at that line

### Exporting and Importing Data
- Click the gear icon in the Favorites sidebar or use the command palette
- Select "Export Favorites and Bookmarks" to save all data to a JSON file (includes statistics)
- Select "Import Favorites and Bookmarks" to restore data from a JSON file
- Import automatically creates a backup before replacing existing data
- Supports both old and new data formats with automatic migration

## Commands

All commands are available via the command palette (`Cmd+Shift+P`) or context menus:

- `Add to Favorites`
- `Refresh Favorites`
- `Create Group`
- `Rename Group`
- `Delete Group`
- `Delete Favorite`
- `Rename Favorite`
- `Add Active File to Group`
- `Add Bookmark`
- `Remove Bookmark`
- `Rename Bookmark`
- `Clear Bookmarks for File`
- `Clear All Bookmarks`
- `Add Bookmark to Group`
- `Clear Group Bookmarks`
- `Open Bookmark`
- `Favorites Settings` (gear icon)
- `Export Favorites and Bookmarks`
- `Import Favorites and Bookmarks`

## Development

This extension is written in TypeScript and uses Webpack for bundling. See `vsc-extension-quickstart.md` for setup and development instructions.

## License

MIT