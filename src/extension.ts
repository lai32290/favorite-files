import * as vscode from 'vscode';
import { FavoritesProvider, FavoriteItem } from './FavoritesProvider';
import { Favorites } from './types';

export function activate(context: vscode.ExtensionContext) {
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
            favorites[group] = [];
          }
          favorites[group].push(activeEditor.document.uri.fsPath);
          context.workspaceState.update('favorites', favorites);
          favoritesProvider.refresh();
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
          favorites[groupName] = [];
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
        const group = Object.keys(favorites).find(group => favorites[group].includes(item.resourceUri!.fsPath));
        if (group) {
          favorites[group] = favorites[group].filter(fav => fav !== item.resourceUri!.fsPath);
          context.workspaceState.update('favorites', favorites);
          favoritesProvider.refresh();
        }
      }
    }),
    vscode.commands.registerCommand('favorite-files.addFileToGroup', async (item: FavoriteItem) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const favorites = context.workspaceState.get<Favorites>('favorites', {});
        if (!favorites[item.label].includes(activeEditor.document.uri.fsPath)) {
          favorites[item.label].push(activeEditor.document.uri.fsPath);
          context.workspaceState.update('favorites', favorites);
          favoritesProvider.refresh();
        }
      }
    })
  );
}

export function deactivate() {}
