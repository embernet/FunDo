import { ThemeConfig, ThemeColor, TodoList } from './types';

export const THEMES: Record<ThemeColor, ThemeConfig> = {
  rose: {
    bg: 'bg-rose-500',
    bgSoft: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    accent: 'bg-rose-500 hover:bg-rose-600',
    icon: 'text-rose-500',
  },
  blue: {
    bg: 'bg-blue-500',
    bgSoft: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    accent: 'bg-blue-500 hover:bg-blue-600',
    icon: 'text-blue-500',
  },
  green: {
    bg: 'bg-emerald-500',
    bgSoft: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    accent: 'bg-emerald-500 hover:bg-emerald-600',
    icon: 'text-emerald-500',
  },
  amber: {
    bg: 'bg-amber-500',
    bgSoft: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    accent: 'bg-amber-500 hover:bg-amber-600',
    icon: 'text-amber-500',
  },
  violet: {
    bg: 'bg-violet-500',
    bgSoft: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    accent: 'bg-violet-500 hover:bg-violet-600',
    icon: 'text-violet-500',
  },
  cyan: {
    bg: 'bg-cyan-500',
    bgSoft: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    accent: 'bg-cyan-500 hover:bg-cyan-600',
    icon: 'text-cyan-500',
  },
  slate: {
    bg: 'bg-slate-500',
    bgSoft: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    accent: 'bg-slate-500 hover:bg-slate-600',
    icon: 'text-slate-500',
  },
};

export const INITIAL_LISTS: TodoList[] = [
  { id: '1', name: 'My Day', color: 'rose', icon: 'Sun' },
  { id: '2', name: 'Work', color: 'blue', icon: 'Briefcase' },
  { id: '3', name: 'Groceries', color: 'green', icon: 'ShoppingBag' },
  { id: '5', name: 'Health & Fitness', color: 'cyan', icon: 'Heart' },
  { id: '4', name: 'Ideas', color: 'amber', icon: 'Lightbulb' },
];

export const AVAILABLE_ICONS = ['Sun', 'Briefcase', 'ShoppingBag', 'Lightbulb', 'Home', 'Star', 'Heart', 'Zap', 'Coffee', 'Music', 'Book', 'Code'];
