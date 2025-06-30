import * as vscode from 'vscode';
import { Favorites } from './types';

export class FavoritesProvider implements vscode.TreeDataProvider<FavoriteItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<FavoriteItem | undefined | null | void> = new vscode.EventEmitter<FavoriteItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FavoriteItem | undefined | null | void> = this._onDidChangeTreeData.event;

  constructor(private workspaceState: vscode.Memento) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FavoriteItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FavoriteItem): Thenable<FavoriteItem[]> {
    if (element) {
      // Children of a group
      return Promise.resolve(this.getGroupItems(element.label));
    } else {
      // Root level items (groups)
      return Promise.resolve(this.getGroupList());
    }
  }

  private getGroupList(): FavoriteItem[] {
    const favorites = this.workspaceState.get<Favorites>('favorites', {});
    return Object.keys(favorites).map(group => new FavoriteItem(group, vscode.TreeItemCollapsibleState.Collapsed, 'group'));
  }

  private getGroupItems(group: string): FavoriteItem[] {
    const favorites = this.workspaceState.get<Favorites>('favorites', {});
    const groupItems = favorites[group] || [];
    return groupItems.map((item: string) => {
      const uri = vscode.Uri.file(item);
      const treeItem = new FavoriteItem(vscode.workspace.asRelativePath(uri), vscode.TreeItemCollapsibleState.None, 'file');
      treeItem.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [uri],
      };
      treeItem.resourceUri = uri;
      return treeItem;
    });
  }
}

export class FavoriteItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: 'group' | 'file'
  ) {
    super(label, collapsibleState);
  }
}
