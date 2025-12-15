import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { 
  Plus, 
  Settings2, 
  Menu, 
  X,
  Sun,
  Briefcase,
  ShoppingBag,
  Lightbulb,
  Home,
  Star,
  Heart,
  Zap,
  Coffee,
  Music,
  Book,
  BookOpen,
  Code,
  Users,
  Tag as TagIcon,
  Hash,
  Download,
  Upload,
  AlertCircle,
  Info,
  Github,
  Linkedin,
  Trash2,
  GraduationCap,
  Dumbbell,
  Plane,
  Car,
  Utensils,
  Gift,
  Wallet,
  Camera,
  Gamepad2,
  Hammer,
  Palette,
  Smile,
  Clock,
  Calendar,
  Flag,
  MapPin,
  Smartphone,
  PawPrint,
  Leaf,
  Trophy,
  User,
  CircleHelp,
  Rocket
} from 'lucide-react';
import { Todo, TodoList, ThemeColor } from './types';
import { INITIAL_LISTS, THEMES, AVAILABLE_ICONS } from './constants';
import { TodoItem } from './components/TodoItem';

// --- Utils ---

// Fallback UUID generator for environments without secure context (http vs https)
const generateId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {
    // Ignore security errors in non-secure contexts and fall back
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

// Icon mapping helper
const IconMap: Record<string, React.ElementType> = {
  Sun, Briefcase, ShoppingBag, Lightbulb, Home, Star, Heart, Zap, Coffee, Music, Book, BookOpen, Code, Users,
  GraduationCap, Dumbbell, Plane, Car, Utensils, Gift, Wallet, Camera, Gamepad2, Hammer, 
  Palette, Smile, Clock, Calendar, Flag, MapPin, Smartphone, PawPrint, Leaf, Trophy, User, CircleHelp, Rocket
};

// Custom App Icon: Smiley face
const HappyTaskIcon = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2.5" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9 9h.01" />
    <path d="M15 9h.01" />
    <path d="M8 14a4 4 0 0 0 8 0" />
  </svg>
);

export default function App() {
  // --- State Initialization ---
  
  const [lists, setLists] = useState<TodoList[]>(() => {
    try {
      const saved = localStorage.getItem('fundo_lists');
      return saved ? JSON.parse(saved) : INITIAL_LISTS;
    } catch (e) {
      console.warn("Failed to load lists from storage, using default.", e);
      return INITIAL_LISTS;
    }
  });

  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const saved = localStorage.getItem('fundo_todos');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Failed to load todos from storage, starting empty.", e);
      return [];
    }
  });

  // Ensure activeListId points to a valid list, defaulting to the first one available
  const [activeListId, setActiveListId] = useState<string>(() => {
    return lists[0]?.id || '1';
  });
  
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  
  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Icon Picker State
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  
  // Modals
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [restoreData, setRestoreData] = useState<{ lists: TodoList[], todos: Todo[] } | null>(null);

  // New List Form State
  const [newListTitle, setNewListTitle] = useState('');
  const [newListColor, setNewListColor] = useState<ThemeColor>('blue');
  const [newListIcon, setNewListIcon] = useState('Home');

  // Refs
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const listFileInputRef = useRef<HTMLInputElement>(null);
  const newTodoInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence ---
  
  useEffect(() => {
    localStorage.setItem('fundo_lists', JSON.stringify(lists));
  }, [lists]);

  useEffect(() => {
    localStorage.setItem('fundo_todos', JSON.stringify(todos));
  }, [todos]);

  // Reset editing state when switching lists/tags
  useEffect(() => {
    setIsEditingTitle(false);
    setIsIconPickerOpen(false);
  }, [activeListId, activeTag]);

  // --- Derived State ---

  // Calculate unique tags from current todos
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    todos.forEach(todo => {
      if (todo.tag) tags.add(todo.tag);
    });
    return Array.from(tags).sort();
  }, [todos]);

  const isTagView = activeTag !== null;
  
  // Safe retrieval of current list to prevent crashes during state updates or restores
  const currentList = useMemo(() => {
    return lists.find(l => l.id === activeListId) || lists[0] || { 
      id: 'fallback', 
      name: 'My List', 
      color: 'blue' as ThemeColor, 
      icon: 'Home' 
    };
  }, [lists, activeListId]);

  // Safe theme retrieval
  const currentTheme = useMemo(() => {
    if (isTagView) return THEMES['slate'];
    return THEMES[currentList.color] || THEMES['blue'];
  }, [currentList, isTagView]);
  
  const headerTitle = isTagView ? `# ${activeTag}` : currentList.name;

  const activeTodos = useMemo(() => {
    if (isTagView) {
      return todos.filter(t => t.tag === activeTag);
    }
    return todos.filter(t => t.listId === activeListId);
  }, [todos, activeListId, activeTag, isTagView]);

  const completedCount = activeTodos.filter(t => t.completed).length;
  const progress = activeTodos.length > 0 ? (completedCount / activeTodos.length) * 100 : 0;

  // --- Drag and Drop ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Add distance constraint for smoother clicking
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setTodos((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // --- Actions ---

  const addTodo = (e?: React.FormEvent) => {
    e?.preventDefault();
    const rawText = newTodoText.trim();
    if (!rawText) return;
    
    let text = rawText;
    let finalTag = isTagView ? (activeTag || undefined) : undefined;

    // Hashtag extraction
    // Match hash followed by alphanumeric, underscore or hyphen
    // Uses lookahead or boundary to ensure we catch clean tags
    const tagRegex = /(?:^|\s)(#[a-zA-Z0-9_\-]+)(?=\s|$)/g;
    const matches = [...rawText.matchAll(tagRegex)];
    
    if (matches.length > 0) {
      // Use the last tag found as the primary tag
      const lastMatch = matches[matches.length - 1];
      if (lastMatch && lastMatch[1]) {
          finalTag = lastMatch[1].substring(1); // Remove '#'
      }
      
      // Clean tags from text to avoid duplication with the badge
      text = rawText.replace(tagRegex, ' ').replace(/\s+/g, ' ').trim();
    }
    
    const newTodo: Todo = {
      id: generateId(),
      text: text,
      completed: false,
      listId: activeListId, // Assign to current active list ID
      isImportant: false,
      tag: finalTag,
      createdAt: Date.now(),
    };

    setTodos(prev => [newTodo, ...prev]);
    setNewTodoText('');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        const newCompleted = !t.completed;
        return { 
          ...t, 
          completed: newCompleted,
          completedAt: newCompleted ? Date.now() : undefined
        };
      }
      return t;
    }));
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const toggleImportant = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, isImportant: !t.isImportant } : t));
  };
  
  const updateTag = (id: string, tag: string) => {
     setTodos(prev => prev.map(t => t.id === id ? { ...t, tag: tag || undefined } : t));
  };

  const moveToList = (todoId: string, newListId: string) => {
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, listId: newListId } : t));
  };

  // --- Title & Icon Editing Actions ---

  const handleTitleClick = () => {
    const initialTitle = isTagView ? (activeTag || '') : currentList.name;
    setTitleInput(initialTitle);
    setIsEditingTitle(true);
    // Use timeout to ensure input is rendered before attempting to select
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
        titleInputRef.current.select();
      }
    }, 0);
  };

  const handleTitleSave = () => {
    const trimmed = titleInput.trim();
    if (!trimmed) {
      setIsEditingTitle(false);
      return;
    }

    if (isTagView && activeTag) {
      // Rename Tag: Update all todos with this tag
      if (trimmed !== activeTag) {
        setTodos(prev => prev.map(t => t.tag === activeTag ? { ...t, tag: trimmed } : t));
        setActiveTag(trimmed);
      }
    } else {
      // Rename List
      setLists(prev => prev.map(l => l.id === activeListId ? { ...l, name: trimmed } : l));
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setIsEditingTitle(false);
    }
  };

  const updateListIcon = (iconName: string) => {
    if (isTagView) return;
    setLists(prev => prev.map(l => l.id === activeListId ? { ...l, icon: iconName } : l));
    setIsIconPickerOpen(false);
  };

  // --- List Management ---

  const createList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    const newList: TodoList = {
      id: generateId(),
      name: newListTitle.trim(),
      color: newListColor,
      icon: newListIcon,
    };

    setLists([...lists, newList]);
    setActiveListId(newList.id);
    setActiveTag(null);
    setIsCreatingList(false);
    setNewListTitle('');
    setIsSidebarOpen(false);
  };

  const deleteList = (listId: string) => {
    if (lists.length <= 1) {
      return;
    }
    setListToDelete(listId);
  };

  const confirmDeleteList = () => {
    if (!listToDelete) return;
    
    setLists(prev => prev.filter(l => l.id !== listToDelete));
    setTodos(prev => prev.filter(t => t.listId !== listToDelete));
    
    if (activeListId === listToDelete) {
      // Switch to the first available list after deletion
      const remainingLists = lists.filter(l => l.id !== listToDelete);
      const nextListId = remainingLists[0]?.id || INITIAL_LISTS[0].id;
      setActiveListId(nextListId);
      setActiveTag(null);
    }
    
    setListToDelete(null);
  };

  const switchToList = (id: string) => {
    setActiveListId(id);
    setActiveTag(null);
    setIsSidebarOpen(false);
    setTimeout(() => newTodoInputRef.current?.focus(), 50);
  };

  const switchToTag = (tag: string) => {
    setActiveTag(tag);
    setIsSidebarOpen(false);
    setTimeout(() => newTodoInputRef.current?.focus(), 50);
  };

  // --- Import / Export ---

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  const exportAllData = () => {
    const data = {
      version: 1,
      type: 'fundo-backup',
      timestamp: new Date().toISOString(),
      lists,
      todos
    };
    downloadJson(data, `fundo-backup-${new Date().toISOString().split('T')[0]}.json`);
  };

  const importAllData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target?.result;
        if (typeof content !== 'string') return;
        
        const data = JSON.parse(content);
        
        // Basic structure validation
        if (!data.lists || !Array.isArray(data.lists) || data.lists.length === 0) {
          alert("Backup file invalid: No lists found.");
          return;
        }
        if (!data.todos || !Array.isArray(data.todos)) {
           alert("Backup file invalid: No todos found.");
           return;
        }

        setRestoreData({ lists: data.lists, todos: data.todos });

      } catch (error) {
        console.error("Restore failed", error);
        alert("Failed to parse backup file.");
      } finally {
         if (globalFileInputRef.current) {
            globalFileInputRef.current.value = '';
         }
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!restoreData) return;
    
    setLists(restoreData.lists);
    setTodos(restoreData.todos);
    setActiveListId(restoreData.lists[0]?.id || '1');
    setActiveTag(null);
    setRestoreData(null);
  };

  const exportCurrentList = () => {
    if (isTagView) return;
    const data = {
      version: 1,
      type: 'fundo-list-export',
      listInfo: currentList,
      todos: activeTodos
    };
    const dateStr = new Date().toISOString().split('T')[0];
    const cleanName = currentList.name.replace(/\s+/g, '-');
    downloadJson(data, `FunDo-${cleanName}-${dateStr}.json`);
  };

  const importIntoList = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isTagView) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const importedTodos = json.todos || (Array.isArray(json) ? json : []);
        
        if (!Array.isArray(importedTodos)) {
          alert('No tasks found in file.');
          return;
        }

        const newTodos: Todo[] = importedTodos.map((t: any) => ({
          ...t,
          id: generateId(),
          listId: activeListId,
          createdAt: t.createdAt || Date.now()
        }));

        setTodos(prev => [...prev, ...newTodos]);
        alert(`Imported ${newTodos.length} tasks.`);
      } catch (err) {
        alert('Failed to parse file.');
      }
      if (listFileInputRef.current) listFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={globalFileInputRef} 
        onChange={importAllData} 
        className="hidden" 
        accept=".json"
      />
      <input 
        type="file" 
        ref={listFileInputRef} 
        onChange={importIntoList} 
        className="hidden" 
        accept=".json"
      />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="text-violet-600">
            <HappyTaskIcon size={32} />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-rose-500">
            FunDo
          </h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden ml-auto p-2 text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {/* Regular Lists */}
          {lists.map(list => {
            const Icon = IconMap[list.icon] || Home;
            const isActive = !isTagView && activeListId === list.id;
            const theme = THEMES[list.color] || THEMES['blue'];
            const count = todos.filter(t => t.listId === list.id && !t.completed).length;

            return (
              <div 
                key={list.id}
                onClick={() => switchToList(list.id)}
                className={`
                  group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-200
                  ${isActive ? `${theme.bgSoft} ${theme.text}` : 'hover:bg-slate-50 text-slate-600'}
                `}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm transition-colors'}`}>
                    <Icon size={20} className={isActive ? theme.icon : 'text-slate-500'} />
                  </div>
                  <span className="font-semibold truncate">{list.name}</span>
                </div>
                
                <div className="flex items-center gap-1">
                    {/* Delete Button - only if more than 1 list */}
                    {lists.length > 1 && (
                      <button
                         onClick={(e) => {
                            e.stopPropagation();
                            deleteList(list.id);
                         }}
                         className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                         title="Delete List"
                      >
                         <Trash2 size={16} />
                      </button>
                    )}
                    
                    {count > 0 && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${isActive ? 'bg-white/50' : 'bg-slate-100'}`}>
                        {count}
                      </span>
                    )}
                </div>
              </div>
            );
          })}

          {/* New List Button */}
          <div className="py-2">
             <button 
              onClick={() => setIsCreatingList(true)}
              className="flex items-center justify-center gap-2 w-full p-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all font-medium text-sm"
            >
              <Plus size={16} />
              New List
            </button>
          </div>

          {/* Tags Section */}
          {uniqueTags.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="px-3 mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <TagIcon size={12} />
                Smart Tags
              </div>
              <div className="space-y-1">
                {uniqueTags.map(tag => {
                  const isActive = isTagView && activeTag === tag;
                  const count = todos.filter(t => t.tag === tag && !t.completed).length;
                  return (
                    <div
                      key={tag}
                      onClick={() => switchToTag(tag)}
                      className={`
                        group flex items-center justify-between p-2 px-3 rounded-xl cursor-pointer transition-all duration-200
                        ${isActive ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-500'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Hash size={16} className={isActive ? 'text-slate-600' : 'text-slate-400'} />
                        <span className="font-medium text-sm">{tag}</span>
                      </div>
                      {count > 0 && (
                        <span className="text-xs font-medium text-slate-400">
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Global Footer Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <div className="flex gap-2">
            <button 
              onClick={exportAllData}
              className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all text-xs font-semibold"
              title="Save all lists"
            >
              <Download size={18} />
              Backup
            </button>
            <button 
              onClick={() => globalFileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-slate-500 hover:bg-white hover:text-emerald-600 hover:shadow-sm transition-all text-xs font-semibold"
              title="Load backup"
            >
              <Upload size={18} />
              Restore
            </button>
          </div>
          <button 
            onClick={() => setIsAboutOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-slate-400 hover:bg-white hover:text-violet-600 hover:shadow-sm transition-all text-xs font-semibold"
          >
            <Info size={16} />
            About FunDo
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <header className="p-6 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl">
              <Menu size={24} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                
                {/* Editable Title Section */}
                <div className={`flex items-center gap-2 text-3xl font-bold ${currentTheme.text}`}>
                   {/* Icon with Picker */}
                   <div className="relative">
                      <button
                        onClick={() => !isTagView && setIsIconPickerOpen(!isIconPickerOpen)}
                        className={`p-2 -ml-2 rounded-xl transition-colors ${
                           !isTagView ? 'hover:bg-black/5 cursor-pointer' : 'cursor-default'
                        }`}
                        disabled={isTagView}
                        title={!isTagView ? "Change Icon" : undefined}
                      >
                         {(() => {
                          const iconName = currentList.icon;
                          const Icon = isTagView ? Hash : (IconMap[iconName] || Home);
                          return <Icon size={28} className="flex-shrink-0" />;
                        })()}
                      </button>

                      {isIconPickerOpen && !isTagView && (
                        <>
                           <div className="fixed inset-0 z-20" onClick={() => setIsIconPickerOpen(false)} />
                           <div className="absolute top-full left-0 mt-2 z-30 p-4 bg-white rounded-2xl shadow-xl border border-slate-100 w-72 animate-in fade-in zoom-in-95 duration-100">
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Select Icon</div>
                              <div className="grid grid-cols-5 gap-2">
                                 {AVAILABLE_ICONS.map(iconName => {
                                    const Icon = IconMap[iconName];
                                    const isSelected = currentList.icon === iconName;
                                    return (
                                       <button
                                         key={iconName}
                                         onClick={() => updateListIcon(iconName)}
                                         className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                                            isSelected 
                                              ? `${currentTheme.bgSoft} ${currentTheme.text} ring-2 ring-offset-1 ring-${currentTheme.bg.split('-')[1]}-200` 
                                              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                                         }`}
                                       >
                                          <Icon size={20} />
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>
                        </>
                      )}
                   </div>
                  
                  {isEditingTitle ? (
                    <input
                      ref={titleInputRef}
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={handleTitleKeyDown}
                      className="bg-transparent outline-none border-b-2 border-current min-w-[150px] w-full max-w-md"
                      autoFocus
                    />
                  ) : (
                    <h2 
                      onClick={handleTitleClick}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      title="Click to rename"
                    >
                      {headerTitle}
                    </h2>
                  )}
                </div>
                
                {/* List Actions (Export/Import) - Hidden in Tag View */}
                {!isTagView && (
                  <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                     <button
                        onClick={exportCurrentList}
                        className={`p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors`}
                        title="Export this list"
                     >
                       <Download size={18} />
                     </button>
                     <button
                        onClick={() => listFileInputRef.current?.click()}
                        className={`p-1.5 rounded-lg text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 transition-colors`}
                        title="Import tasks to this list"
                     >
                       <Upload size={18} />
                     </button>
                  </div>
                )}
                
                {!isTagView && lists.length > 1 && (
                  <button 
                    onClick={() => deleteList(currentList.id)}
                    className="opacity-0 group-hover:opacity-100 md:opacity-0 hover:opacity-100 text-slate-300 hover:text-rose-400 transition-opacity"
                    title="Delete List"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <div className="text-sm text-slate-500 font-medium mt-1">
                {activeTodos.length === 0 
                  ? "No tasks found." 
                  : `${completedCount} of ${activeTodos.length} completed`
                }
              </div>
            </div>
          </div>
          
          <div className="hidden sm:block w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full ${currentTheme.bg} transition-all duration-500 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </header>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto px-4 pb-32 sm:px-8">
          <div className="max-w-3xl mx-auto space-y-3">
             <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
              >
              <SortableContext 
                items={activeTodos.map(t => t.id)} 
                strategy={verticalListSortingStrategy}
                disabled={isTagView} // Disable sorting in tag view
              >
                {activeTodos.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                     <div className={`p-6 rounded-3xl ${currentTheme.bgSoft} mb-4`}>
                        {(() => {
                          const iconName = currentList.icon;
                          const Icon = isTagView ? Hash : (IconMap[iconName] || Home);
                          return <Icon size={48} className={currentTheme.icon} />;
                        })()}
                     </div>
                     <p className="text-xl font-medium">It's quiet here...</p>
                     <p>{isTagView ? "No tasks with this tag." : "Add a task to get started!"}</p>
                   </div>
                ) : (
                  activeTodos.map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      theme={currentTheme}
                      allLists={lists}
                      isSortable={!isTagView}
                      onToggle={toggleTodo}
                      onDelete={deleteTodo}
                      onToggleImportant={toggleImportant}
                      onMoveToList={moveToList}
                      onUpdateTag={updateTag}
                    />
                  ))
                )}
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Add Todo Input */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pointer-events-none flex justify-center">
          <form 
            onSubmit={addTodo}
            className="w-full max-w-3xl pointer-events-auto relative group"
          >
            <input
              ref={newTodoInputRef}
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder={isTagView ? `Add a task to #${activeTag}...` : "Add a new task..."}
              className="w-full pl-6 pr-14 py-4 rounded-3xl shadow-lg border-2 border-transparent focus:border-white focus:ring-4 focus:ring-violet-100 bg-white text-lg font-medium placeholder-slate-400 transition-all outline-none"
            />
            <button 
              type="submit"
              disabled={!newTodoText.trim()}
              className={`absolute right-2 top-2 bottom-2 aspect-square rounded-2xl flex items-center justify-center text-white transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${currentTheme.accent}`}
            >
              <Plus size={24} strokeWidth={3} />
            </button>
          </form>
        </div>
      </main>

      {/* New List Modal */}
      {isCreatingList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Create New List</h3>
              <button onClick={() => setIsCreatingList(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={createList} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">List Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none font-medium text-slate-800 bg-slate-50 placeholder-slate-400"
                  placeholder="e.g. Travel Plans"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Color Theme</label>
                <div className="flex gap-3 overflow-x-auto py-2">
                  {Object.keys(THEMES).filter(k => k !== 'slate').map((color) => {
                     const c = color as ThemeColor;
                     const isSelected = newListColor === c;
                     return (
                       <button
                         key={c}
                         type="button"
                         onClick={() => setNewListColor(c)}
                         className={`w-10 h-10 rounded-full flex-shrink-0 border-4 transition-all ${
                           THEMES[c].bg
                         } ${isSelected ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                       />
                     );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVAILABLE_ICONS.map(iconName => {
                    const Icon = IconMap[iconName];
                    const isSelected = newListIcon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewListIcon(iconName)}
                        className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                           isSelected 
                             ? `${THEMES[newListColor].bgSoft} ${THEMES[newListColor].text} ring-2 ring-offset-2 ring-${newListColor}-400` 
                             : 'text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        <Icon size={20} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!newListTitle.trim()}
                  className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Create List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About Modal */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 relative">
              <button 
                onClick={() => setIsAboutOpen(false)}
                className="absolute right-4 top-4 p-2 text-slate-300 hover:text-slate-500 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex flex-col items-center text-center space-y-4 pt-4">
                <div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center">
                  <HappyTaskIcon size={32} />
                </div>
                
                <div>
                   <h3 className="text-xl font-bold text-slate-800">FunDo</h3>
                   <p className="text-sm text-slate-400 font-medium">Version 1.0.0</p>
                </div>

                <div className="text-slate-600 text-sm leading-relaxed px-4">
                  <p>
                    FunDo is free to use and copy under the MIT license. 
                    Built with React and Tailwind CSS.
                  </p>
                  <p className="mt-2 text-slate-500 font-medium">
                    Created by Mark Burnett &copy; 2025
                  </p>
                </div>

                <div className="flex flex-col gap-2 w-full pt-2">
                   <a 
                     href="https://www.linkedin.com/in/markburnett/" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 rounded-xl bg-[#0077b5]/10 text-[#0077b5] hover:bg-[#0077b5] hover:text-white transition-all font-bold text-sm"
                   >
                     <Linkedin size={18} />
                     Connect on LinkedIn
                   </a>
                   <a 
                     href="https://github.com/embernet/FunDo" 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-800 hover:text-white transition-all font-bold text-sm"
                   >
                     <Github size={18} />
                     View on GitHub
                   </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete List Confirmation Modal */}
      {listToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
                   <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Delete List?</h3>
                <p className="text-slate-500 mb-6">
                  Are you sure you want to delete this list? This action cannot be undone and all tasks within it will be lost.
                </p>
                
                <div className="flex gap-3">
                   <button 
                     onClick={() => setListToDelete(null)}
                     className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={confirmDeleteList}
                     className="flex-1 py-3 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                   >
                     Delete
                   </button>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                   <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Restore Backup?</h3>
                <p className="text-slate-500 mb-4">
                  This will replace all your current lists and tasks with the data from the backup file.
                </p>
                <div className="bg-slate-50 rounded-xl p-3 mb-6 space-y-2">
                   <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Lists found:</span>
                      <span className="font-bold text-slate-800">{restoreData.lists.length}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Tasks found:</span>
                      <span className="font-bold text-slate-800">{restoreData.todos.length}</span>
                   </div>
                </div>
                
                <div className="flex gap-3">
                   <button 
                     onClick={() => setRestoreData(null)}
                     className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleConfirmRestore}
                     className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                   >
                     Restore
                   </button>
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}