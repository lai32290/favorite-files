import * as vscode from 'vscode';
import { Favorites, Bookmarks, Bookmark } from './types';

export class FavoritesProvider implements vscode.TreeDataProvider<FavoriteItem> {
  private dragAndDropController: vscode.TreeDragAndDropController<FavoriteItem>;

  constructor(private workspaceState: vscode.Memento) {
    this.dragAndDropController = {
      dragMimeTypes: ['application/vnd.favorite-file-path'],
      dropMimeTypes: ['application/vnd.favorite-file-path'],
      handleDrag: async (source, dataTransfer, token) => {
        const fileItems = source.filter(item => item.contextValue === 'file' && item.resourceUri);
        if (fileItems.length > 0) {
          const filePath = fileItems[0].resourceUri!.fsPath;
          const favorites = this.workspaceState.get<Favorites>('favorites', {});
          const group = Object.keys(favorites).find(g => favorites[g].files.includes(filePath));
          if (group) {
            dataTransfer.set('application/vnd.favorite-file-path', new vscode.DataTransferItem(JSON.stringify({ filePath, group })));
          }
        }
      },
      handleDrop: async (target, dataTransfer, token) => {
        if (!target || target.contextValue !== 'file' || !target.resourceUri) {
          return;
        }
        const dropData = dataTransfer.get('application/vnd.favorite-file-path');
        if (!dropData) {
          return;
        }
        let parsed;
        try {
          parsed = JSON.parse(await dropData.asString());
        } catch {
          return;
        }
        const { filePath: draggedFilePath, group: draggedGroup } = parsed;
        const targetFilePath = target.resourceUri.fsPath;
        const favorites = this.workspaceState.get<Favorites>('favorites', {});
        const targetGroup = Object.keys(favorites).find(g => favorites[g].files.includes(targetFilePath));
        if (!targetGroup || targetGroup !== draggedGroup) {
          return;
        }
        const files = favorites[targetGroup].files;
        const draggedIdx = files.indexOf(draggedFilePath);
        const targetIdx = files.indexOf(targetFilePath);
        if (draggedIdx === -1 || targetIdx === -1 || draggedIdx === targetIdx) {
          return;
        }
        files.splice(draggedIdx, 1);
        files.splice(targetIdx, 0, draggedFilePath);
        await this.workspaceState.update('favorites', favorites);
        this.refresh();
      },
    };
  }

  getDragAndDropController() {
    return this.dragAndDropController;
  }
  private _onDidChangeTreeData: vscode.EventEmitter<FavoriteItem | undefined | null | void> = new vscode.EventEmitter<FavoriteItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<FavoriteItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: FavoriteItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: FavoriteItem): Thenable<FavoriteItem[]> {
    if (element) {
      if (element.contextValue === 'group') {
        // Children of a group (files and bookmarks)
        return Promise.resolve(this.getGroupItems(element.label));
      } else if (element.contextValue === 'bookmark-file' && element.filePath) {
        // Children of a bookmark file (the bookmarks)
        return Promise.resolve(this.getBookmarkItems(element.filePath));
      } else if (element.contextValue === 'group-bookmarks' && element.groupName) {
        // Children of group bookmarks section
        return Promise.resolve(this.getGroupBookmarkItems(element.groupName));
      } else if (element.contextValue === 'bookmarks-group') {
        // Children of bookmarks group (the files with bookmarks)
        return Promise.resolve(this.getBookmarkFiles());
      }
    } else {
      // Root level items (groups and bookmarks)
      return Promise.resolve(this.getRootItems());
    }
    return Promise.resolve([]);
  }

  private getRootItems(): FavoriteItem[] {
    const items: FavoriteItem[] = [];
    
    // Add groups
    const favorites = this.workspaceState.get<Favorites>('favorites', {});
    const groups = Object.keys(favorites).map(group => new FavoriteItem(group, vscode.TreeItemCollapsibleState.Collapsed, 'group'));
    items.push(...groups);
    
    // Add bookmarks section
    const bookmarks = this.workspaceState.get<Bookmarks>('bookmarks', {});
    const bookmarkFiles = Object.keys(bookmarks);
    if (bookmarkFiles.length > 0) {
      const bookmarksGroup = new FavoriteItem('Bookmarks', vscode.TreeItemCollapsibleState.Collapsed, 'bookmarks-group');
      bookmarksGroup.iconPath = new vscode.ThemeIcon('bookmark');
      items.push(bookmarksGroup);
    }
    
    return items;
  }

  private getGroupList(): FavoriteItem[] {
    const favorites = this.workspaceState.get<Favorites>('favorites', {});
    return Object.keys(favorites).map(group => new FavoriteItem(group, vscode.TreeItemCollapsibleState.Collapsed, 'group'));
  }

  private getGroupItems(group: string): FavoriteItem[] {
    const favorites = this.workspaceState.get<Favorites>('favorites', {});
    const groupData = favorites[group] || { files: [], bookmarks: [] };
    const items: FavoriteItem[] = [];

    // Add files
    const favoriteAliases = this.workspaceState.get<{ [filePath: string]: string }>('favoriteAliases', {});
    groupData.files.forEach((filePath: string) => {
      const uri = vscode.Uri.file(filePath);
      const alias = favoriteAliases[filePath];
      const label = alias || vscode.workspace.asRelativePath(uri);
      const treeItem = new FavoriteItem(label, vscode.TreeItemCollapsibleState.None, 'file');
      treeItem.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [uri],
      };
      treeItem.resourceUri = uri;
      items.push(treeItem);
    });

    // Add bookmarks section if there are bookmarks
    if (groupData.bookmarks.length > 0) {
      const bookmarksItem = new FavoriteItem('Bookmarks', vscode.TreeItemCollapsibleState.Collapsed, 'group-bookmarks');
      bookmarksItem.iconPath = new vscode.ThemeIcon('bookmark');
      bookmarksItem.groupName = group;
      items.push(bookmarksItem);
    }

    return items;
  }

  private getGroupBookmarkItems(groupName: string): FavoriteItem[] {
    const favorites = this.workspaceState.get<Favorites>('favorites', {});
    const groupData = favorites[groupName] || { files: [], bookmarks: [] };
    
    return groupData.bookmarks.map((bookmark: Bookmark) => {
      const uri = vscode.Uri.file(bookmark.filePath);
      const description = bookmark.description || `Line ${bookmark.line}`;
      const treeItem = new FavoriteItem(description, vscode.TreeItemCollapsibleState.None, 'bookmark');
      treeItem.command = {
        command: 'favorite-files.openBookmark',
        title: 'Open File at Bookmark',
        arguments: [bookmark.filePath, bookmark.line],
      };
      treeItem.resourceUri = uri;
      treeItem.tooltip = `${vscode.workspace.asRelativePath(uri)}:${bookmark.line}`;
      treeItem.iconPath = new vscode.ThemeIcon('bookmark');
      treeItem.filePath = bookmark.filePath;
      treeItem.groupName = groupName;
      return treeItem;
    });
  }

  private getBookmarkItems(filePath: string): FavoriteItem[] {
    const bookmarks = this.workspaceState.get<Bookmarks>('bookmarks', {});
    const fileBookmarks = bookmarks[filePath] || [];
    return fileBookmarks.map((bookmark: Bookmark) => {
      const uri = vscode.Uri.file(bookmark.filePath);
      const description = bookmark.description || `Line ${bookmark.line}`;
      const treeItem = new FavoriteItem(description, vscode.TreeItemCollapsibleState.None, 'bookmark');
      treeItem.command = {
        command: 'favorite-files.openBookmark',
        title: 'Open File at Bookmark',
        arguments: [bookmark.filePath, bookmark.line],
      };
      treeItem.resourceUri = uri;
      treeItem.tooltip = `${vscode.workspace.asRelativePath(uri)}:${bookmark.line}`;
      treeItem.iconPath = new vscode.ThemeIcon('bookmark');
      treeItem.filePath = bookmark.filePath;
      return treeItem;
    });
  }

  getBookmarkFiles(): FavoriteItem[] {
    const bookmarks = this.workspaceState.get<Bookmarks>('bookmarks', {});
    return Object.keys(bookmarks).map(filePath => {
      const uri = vscode.Uri.file(filePath);
      const treeItem = new FavoriteItem(vscode.workspace.asRelativePath(uri), vscode.TreeItemCollapsibleState.Collapsed, 'bookmark-file');
      treeItem.resourceUri = uri;
      treeItem.iconPath = new vscode.ThemeIcon('file');
      treeItem.tooltip = `${bookmarks[filePath].length} bookmark(s)`;
      treeItem.filePath = filePath;
      return treeItem;
    });
  }
}

export class FavoriteItem extends vscode.TreeItem {
  public filePath?: string;
  public groupName?: string;

  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: 'group' | 'file' | 'bookmark' | 'bookmark-file' | 'bookmarks-group' | 'group-bookmarks'
  ) {
    super(label, collapsibleState);
  }
}
