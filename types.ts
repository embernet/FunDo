export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  listId: string;
  isImportant: boolean;
  isMyDay?: boolean;
  myDayDate?: string; // ISO Date string (YYYY-MM-DD) for My Day planning
  tag?: string; // Kept for legacy compatibility
  tags: string[]; // New: Multiple tags support
  notes?: string; // New: Optional notes field
  createdAt?: number;
  completedAt?: number;
}

export interface TodoList {
  id: string;
  name: string;
  color: ThemeColor;
  icon: string;
  folderId?: string; // New: ID of the parent folder
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  color: ThemeColor;
  isExpanded: boolean;
}

export interface TagCategory {
  id: string;
  name: string;
  tags: string[];
}

export type ThemeColor = 'rose' | 'blue' | 'green' | 'amber' | 'violet' | 'cyan' | 'slate';

export interface ThemeConfig {
  bg: string;
  bgSoft: string;
  text: string;
  border: string;
  accent: string;
  icon: string;
}