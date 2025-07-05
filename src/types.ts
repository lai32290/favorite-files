export type Favorites = {
  [group: string]: {
    files: string[];
    bookmarks: Bookmark[];
  };
};

export type Bookmark = {
  filePath: string;
  line: number;
  description?: string;
  timestamp: number;
};

export type Bookmarks = {
  [filePath: string]: Bookmark[];
};
