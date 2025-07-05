import * as vscode from 'vscode';
import { FavoritesProvider, FavoriteItem } from './FavoritesProvider';
import { Favorites, Bookmarks, Bookmark } from './types';

function migrateOldFavorites(workspaceState: vscode.Memento): void {
  const oldFavorites = workspaceState.get<{ [group: string]: string[] }>('favorites', {});
  const newFavorites: Favorites = {};
  
  // Convert old structure to new structure
  Object.keys(oldFavorites).forEach(group => {
    newFavorites[group] = {
      files: oldFavorites[group],
      bookmarks: []
    };
  });
  
  // Update with new structure
  workspaceState.update('favorites', newFavorites);
}

function validateAndMigrateImportData(data: any): { favorites: Favorites; bookmarks: Bookmarks } {
  const favorites: Favorites = {};
  const bookmarks: Bookmarks = data.bookmarks || {};

  // Handle old format where favorites was just an array of strings
  if (data.favorites && Array.isArray(data.favorites)) {
    // Convert old array format to new structure
    favorites['Imported Group'] = {
      files: data.favorites,
      bookmarks: []
    };
  } else if (data.favorites && typeof data.favorites === 'object') {
    // Handle new format or old format with groups
    Object.keys(data.favorites).forEach(group => {
      const groupData = data.favorites[group];
      if (Array.isArray(groupData)) {
        // Old format: group was just an array of files
        favorites[group] = {
          files: groupData,
          bookmarks: []
        };
      } else if (groupData && typeof groupData === 'object') {
        // New format: group has files and bookmarks
        favorites[group] = {
          files: groupData.files || [],
          bookmarks: groupData.bookmarks || []
        };
      }
    });
  }

  return { favorites, bookmarks };
}

export function activate(context: vscode.ExtensionContext) {
  // Migrate old favorites structure if needed
  const oldFavorites = context.workspaceState.get<{ [group: string]: string[] }>('favorites', {});
  if (Object.keys(oldFavorites).length > 0 && typeof oldFavorites[Object.keys(oldFavorites)[0]] === 'string') {
    migrateOldFavorites(context.workspaceState);
  }

  const favoritesProvider = new FavoritesProvider(context.workspaceState);
  vscode.window.registerTreeDataProvider('favorite-files-view', favoritesProvider);

  context.subscriptions.push(
    vscode.commands.registerCommand('favorite-files.add', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const favorites = context.workspaceState.get<Favorites>('favorites', {});
        const groups = Object.keys(favorites);
        const group = await vscode.window.showQuickPick(groups, { placeHolder: 'Select a group or enter a new one' });

        if (group) {
          if (!favorites[group]) {
            favorites[group] = { files: [], bookmarks: [] };
          }
          if (!favorites[group].files.includes(activeEditor.document.uri.fsPath)) {
            favorites[group].files.push(activeEditor.document.uri.fsPath);
            context.workspaceState.update('favorites', favorites);
            favoritesProvider.refresh();
          }
        }
      }
    }),
    vscode.commands.registerCommand('favorite-files.refresh', () => {
      favoritesProvider.refresh();
    }),
    vscode.commands.registerCommand('favorite-files.createGroup', async () => {
      const groupName = await vscode.window.showInputBox({ prompt: 'Enter a new group name' });
      if (groupName) {
        const favorites = context.workspaceState.get<Favorites>('favorites', {});
        if (!favorites[groupName]) {
          favorites[groupName] = { files: [], bookmarks: [] };
          context.workspaceState.update('favorites', favorites);
          favoritesProvider.refresh();
        } else {
          vscode.window.showWarningMessage(`Group "${groupName}" already exists.`);
        }
      }
    }),
    vscode.commands.registerCommand('favorite-files.renameGroup', async (item: FavoriteItem) => {
      const newGroupName = await vscode.window.showInputBox({ value: item.label });
      if (newGroupName) {
        const favorites = context.workspaceState.get<Favorites>('favorites', {});
        favorites[newGroupName] = favorites[item.label];
        delete favorites[item.label];
        context.workspaceState.update('favorites', favorites);
        favoritesProvider.refresh();
      }
    }),
    vscode.commands.registerCommand('favorite-files.deleteGroup', async (item: FavoriteItem) => {
      const favorites = context.workspaceState.get<Favorites>('favorites', {});
      delete favorites[item.label];
      context.workspaceState.update('favorites', favorites);
      favoritesProvider.refresh();
    }),
    vscode.commands.registerCommand('favorite-files.removeFavorite', async (item: FavoriteItem) => {
      if (item.resourceUri) {
        const favorites = context.workspaceState.get<Favorites>('favorites', {});
        const group = Object.keys(favorites).find(group => favorites[group].files.includes(item.resourceUri!.fsPath));
        if (group) {
          favorites[group].files = favorites[group].files.filter(fav => fav !== item.resourceUri!.fsPath);
          context.workspaceState.update('favorites', favorites);
          favoritesProvider.refresh();
        }
      }
    }),
    vscode.commands.registerCommand('favorite-files.addActiveFileToGroup', async (item: FavoriteItem) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const favorites = context.workspaceState.get<Favorites>('favorites', {});
        if (!favorites[item.label].files.includes(activeEditor.document.uri.fsPath)) {
          favorites[item.label].files.push(activeEditor.document.uri.fsPath);
          context.workspaceState.update('favorites', favorites);
          favoritesProvider.refresh();
        }
      }
    }),
    // Bookmark commands
    vscode.commands.registerCommand('favorite-files.addBookmark', async () => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const position = activeEditor.selection.active;
        const line = position.line + 1; // Convert to 1-based line number
        const filePath = activeEditor.document.uri.fsPath;
        
        // Get the line text for context
        const lineText = activeEditor.document.lineAt(position.line).text.trim();
        const description = await vscode.window.showInputBox({ 
          prompt: 'Enter bookmark description (optional)',
          value: lineText.length > 50 ? lineText.substring(0, 50) + '...' : lineText
        });

        const bookmarks = context.workspaceState.get<Bookmarks>('bookmarks', {});
        if (!bookmarks[filePath]) {
          bookmarks[filePath] = [];
        }

        const newBookmark: Bookmark = {
          filePath,
          line,
          description: description || undefined,
          timestamp: Date.now()
        };

        bookmarks[filePath].push(newBookmark);
        context.workspaceState.update('bookmarks', bookmarks);
        favoritesProvider.refresh();
        
        vscode.window.showInformationMessage(`Bookmark added at line ${line}`);
      }
    }),
    vscode.commands.registerCommand('favorite-files.addBookmarkToGroup', async (item: FavoriteItem) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && item.contextValue === 'group') {
        const position = activeEditor.selection.active;
        const line = position.line + 1; // Convert to 1-based line number
        const filePath = activeEditor.document.uri.fsPath;
        
        // Get the line text for context
        const lineText = activeEditor.document.lineAt(position.line).text.trim();
        const description = await vscode.window.showInputBox({ 
          prompt: 'Enter bookmark description (optional)',
          value: lineText.length > 50 ? lineText.substring(0, 50) + '...' : lineText
        });

        const favorites = context.workspaceState.get<Favorites>('favorites', {});
        if (!favorites[item.label]) {
          favorites[item.label] = { files: [], bookmarks: [] };
        }

        const newBookmark: Bookmark = {
          filePath,
          line,
          description: description || undefined,
          timestamp: Date.now()
        };

        favorites[item.label].bookmarks.push(newBookmark);
        context.workspaceState.update('favorites', favorites);
        favoritesProvider.refresh();
        
        vscode.window.showInformationMessage(`Bookmark added to group "${item.label}" at line ${line}`);
      }
    }),
    vscode.commands.registerCommand('favorite-files.removeBookmark', async (item: FavoriteItem) => {
      if (item.contextValue === 'bookmark' && item.filePath) {
        // Check if it's a group bookmark
        if (item.groupName) {
          const favorites = context.workspaceState.get<Favorites>('favorites', {});
          const groupData = favorites[item.groupName];
          if (groupData) {
            const bookmarkIndex = groupData.bookmarks.findIndex(b => 
              b.filePath === item.filePath && (b.description || `Line ${b.line}`) === item.label
            );
            
            if (bookmarkIndex !== -1) {
              groupData.bookmarks.splice(bookmarkIndex, 1);
              context.workspaceState.update('favorites', favorites);
              favoritesProvider.refresh();
              vscode.window.showInformationMessage('Bookmark removed from group');
            }
          }
        } else {
          // Global bookmark
          const bookmarks = context.workspaceState.get<Bookmarks>('bookmarks', {});
          const fileBookmarks = bookmarks[item.filePath] || [];
          
          // Find the bookmark by description and line
          const bookmarkIndex = fileBookmarks.findIndex(b => 
            (b.description || `Line ${b.line}`) === item.label
          );
          
          if (bookmarkIndex !== -1) {
            fileBookmarks.splice(bookmarkIndex, 1);
            if (fileBookmarks.length === 0) {
              delete bookmarks[item.filePath];
            }
            context.workspaceState.update('bookmarks', bookmarks);
            favoritesProvider.refresh();
            vscode.window.showInformationMessage('Bookmark removed');
          }
        }
      }
    }),
    vscode.commands.registerCommand('favorite-files.renameBookmark', async (item: FavoriteItem) => {
      if (item.contextValue === 'bookmark' && item.filePath) {
        // Prompt for new description
        const newDescription = await vscode.window.showInputBox({
          prompt: 'Enter new bookmark description',
          value: item.label
        });
        if (!newDescription) {
          return;
        }
        if (item.groupName) {
          // Group bookmark
          const favorites = context.workspaceState.get<Favorites>('favorites', {});
          const groupData = favorites[item.groupName];
          if (groupData) {
            const bookmark = groupData.bookmarks.find(b => b.filePath === item.filePath && (b.description || `Line ${b.line}`) === item.label);
            if (bookmark) {
              bookmark.description = newDescription;
              context.workspaceState.update('favorites', favorites);
              favoritesProvider.refresh();
              vscode.window.showInformationMessage('Bookmark renamed');
            }
          }
        } else {
          // Global bookmark
          const bookmarks = context.workspaceState.get<Bookmarks>('bookmarks', {});
          const fileBookmarks = bookmarks[item.filePath] || [];
          const bookmark = fileBookmarks.find(b => (b.description || `Line ${b.line}`) === item.label);
          if (bookmark) {
            bookmark.description = newDescription;
            context.workspaceState.update('bookmarks', bookmarks);
            favoritesProvider.refresh();
            vscode.window.showInformationMessage('Bookmark renamed');
          }
        }
      }
    }),
    vscode.commands.registerCommand('favorite-files.clearBookmarks', async (item: FavoriteItem) => {
      if (item.contextValue === 'bookmark-file' && item.filePath) {
        const bookmarks = context.workspaceState.get<Bookmarks>('bookmarks', {});
        delete bookmarks[item.filePath];
        context.workspaceState.update('bookmarks', bookmarks);
        favoritesProvider.refresh();
        vscode.window.showInformationMessage('All bookmarks cleared for this file');
      }
    }),
    vscode.commands.registerCommand('favorite-files.clearAllBookmarks', async () => {
      const result = await vscode.window.showWarningMessage(
        'Are you sure you want to clear all bookmarks?',
        { modal: true },
        'Yes'
      );
      
      if (result === 'Yes') {
        context.workspaceState.update('bookmarks', {});
        favoritesProvider.refresh();
        vscode.window.showInformationMessage('All bookmarks cleared');
      }
    }),
    vscode.commands.registerCommand('favorite-files.clearGroupBookmarks', async (item: FavoriteItem) => {
      if (item.contextValue === 'group-bookmarks' && item.groupName) {
        const favorites = context.workspaceState.get<Favorites>('favorites', {});
        if (favorites[item.groupName]) {
          favorites[item.groupName].bookmarks = [];
          context.workspaceState.update('favorites', favorites);
          favoritesProvider.refresh();
          vscode.window.showInformationMessage('All bookmarks cleared for this group');
        }
      }
    }),
    // Custom command to open bookmarks with proper focus
    vscode.commands.registerCommand('favorite-files.openBookmark', async (filePath: string, line: number) => {
      try {
        const uri = vscode.Uri.file(filePath);
        const document = await vscode.workspace.openTextDocument(uri);
        const editor = await vscode.window.showTextDocument(document, { 
          viewColumn: vscode.ViewColumn.Active,
          selection: new vscode.Range(line - 1, 0, line - 1, 0)
        });
        
        // Ensure the line is visible and focused
        editor.revealRange(new vscode.Range(line - 1, 0, line - 1, 0), vscode.TextEditorRevealType.InCenter);
        editor.selection = new vscode.Selection(line - 1, 0, line - 1, 0);
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to open bookmark: ${error}`);
      }
    }),
    // Settings menu command
    vscode.commands.registerCommand('favorite-files.showSettings', async () => {
      const options = [
        { label: 'Export Favorites and Bookmarks', value: 'export' },
        { label: 'Import Favorites and Bookmarks', value: 'import' }
      ];
      
      const selected = await vscode.window.showQuickPick(options, {
        placeHolder: 'Select an option',
        title: 'Favorites Settings'
      });
      
      if (selected) {
        if (selected.value === 'export') {
          vscode.commands.executeCommand('favorite-files.exportData');
        } else if (selected.value === 'import') {
          vscode.commands.executeCommand('favorite-files.importData');
        }
      }
    }),
    // Export and Import commands
    vscode.commands.registerCommand('favorite-files.exportData', async () => {
      const favorites = context.workspaceState.get<Favorites>('favorites', {});
      const bookmarks = context.workspaceState.get<Bookmarks>('bookmarks', {});
      
      // Calculate statistics
      const totalGroups = Object.keys(favorites).length;
      const totalFiles = Object.values(favorites).reduce((sum, group) => sum + group.files.length, 0);
      const totalGroupBookmarks = Object.values(favorites).reduce((sum, group) => sum + group.bookmarks.length, 0);
      const totalGlobalBookmarks = Object.values(bookmarks).reduce((sum, fileBookmarks) => sum + fileBookmarks.length, 0);
      
      const exportData = {
        favorites,
        bookmarks,
        exportDate: new Date().toISOString(),
        version: '1.0',
        statistics: {
          groups: totalGroups,
          files: totalFiles,
          groupBookmarks: totalGroupBookmarks,
          globalBookmarks: totalGlobalBookmarks,
          totalBookmarks: totalGroupBookmarks + totalGlobalBookmarks
        }
      };

      const uri = await vscode.window.showSaveDialog({
        title: 'Export Favorites and Bookmarks',
        filters: {
          'JSON Files': ['json']
        },
        defaultUri: vscode.Uri.file('favorites-export.json')
      });

      if (uri) {
        try {
          const jsonContent = JSON.stringify(exportData, null, 2);
          await vscode.workspace.fs.writeFile(uri, Buffer.from(jsonContent, 'utf8'));
          vscode.window.showInformationMessage(
            `Export successful! Groups: ${totalGroups}, Files: ${totalFiles}, Bookmarks: ${totalGroupBookmarks + totalGlobalBookmarks}`
          );
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to export data: ${error}`);
        }
      }
    }),
    vscode.commands.registerCommand('favorite-files.importData', async () => {
      const uris = await vscode.window.showOpenDialog({
        title: 'Import Favorites and Bookmarks',
        filters: {
          'JSON Files': ['json']
        },
        canSelectMany: false
      });

      if (uris && uris.length > 0) {
        try {
          const fileContent = await vscode.workspace.fs.readFile(uris[0]);
          const importData = JSON.parse(fileContent.toString());
          
          // Validate the import data structure
          if (!importData.favorites) {
            throw new Error('Invalid file format. Expected favorites data.');
          }

          // Create automatic backup before import
          const currentFavorites = context.workspaceState.get<Favorites>('favorites', {});
          const currentBookmarks = context.workspaceState.get<Bookmarks>('bookmarks', {});
          
          if (Object.keys(currentFavorites).length > 0 || Object.keys(currentBookmarks).length > 0) {
            const backupData = {
              favorites: currentFavorites,
              bookmarks: currentBookmarks,
              backupDate: new Date().toISOString(),
              version: '1.0'
            };

            // Prefer workspace folder, fallback to home directory
            let backupPath: string;
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
              backupPath = vscode.Uri.joinPath(workspaceFolders[0].uri, `favorites-backup-${Date.now()}.json`).fsPath;
            } else {
              const homeDir = process.env.HOME || process.env.USERPROFILE || '.';
              backupPath = require('path').join(homeDir, `favorites-backup-${Date.now()}.json`);
            }
            const backupUri = vscode.Uri.file(backupPath);
            const backupContent = JSON.stringify(backupData, null, 2);
            await vscode.workspace.fs.writeFile(backupUri, Buffer.from(backupContent, 'utf8'));
          }

          // Show confirmation dialog
          const result = await vscode.window.showWarningMessage(
            'This will replace all existing favorites and bookmarks. A backup has been created. Are you sure?',
            { modal: true },
            'Yes', 'No'
          );

          if (result === 'Yes') {
            const { favorites, bookmarks } = validateAndMigrateImportData(importData);
            context.workspaceState.update('favorites', favorites);
            context.workspaceState.update('bookmarks', bookmarks);
            favoritesProvider.refresh();
            
            // Calculate and show import statistics
            const totalGroups = Object.keys(favorites).length;
            const totalFiles = Object.values(favorites).reduce((sum, group) => sum + group.files.length, 0);
            const totalGroupBookmarks = Object.values(favorites).reduce((sum, group) => sum + group.bookmarks.length, 0);
            const totalGlobalBookmarks = Object.values(bookmarks).reduce((sum, fileBookmarks) => sum + fileBookmarks.length, 0);
            
            vscode.window.showInformationMessage(
              `Import successful! Groups: ${totalGroups}, Files: ${totalFiles}, Bookmarks: ${totalGroupBookmarks + totalGlobalBookmarks}`
            );
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to import data: ${error}`);
        }
      }
    })
  );
}

export function deactivate() {}
