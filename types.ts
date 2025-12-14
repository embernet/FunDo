export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  listId: string;
  isImportant: boolean;
  tag?: string;
}

export interface TodoList {
  id: string;
  name: string;
  color: ThemeColor;
  icon: string;
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