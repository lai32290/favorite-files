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
    })
  );
}

export function deactivate() {}
