import React, { useState, useEffect, useMemo } from 'react';
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
  Code,
  Tag as TagIcon,
  Hash
} from 'lucide-react';
import { Todo, TodoList, ThemeColor } from './types';
import { INITIAL_LISTS, THEMES, AVAILABLE_ICONS } from './constants';
import { TodoItem } from './components/TodoItem';

// Icon mapping helper
const IconMap: Record<string, React.ElementType> = {
  Sun, Briefcase, ShoppingBag, Lightbulb, Home, Star, Heart, Zap, Coffee, Music, Book, Code
};

export default function App() {
  // State
  const [lists, setLists] = useState<TodoList[]>(() => {
    const saved = localStorage.getItem('fundo_lists');
    return saved ? JSON.parse(saved) : INITIAL_LISTS;
  });

  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('fundo_todos');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeListId, setActiveListId] = useState<string>(() => {
    return lists[0]?.id || '1';
  });
  
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListColor, setNewListColor] = useState<ThemeColor>('blue');
  const [newListIcon, setNewListIcon] = useState('Home');

  // Persistence
  useEffect(() => {
    localStorage.setItem('fundo_lists', JSON.stringify(lists));
  }, [lists]);

  useEffect(() => {
    localStorage.setItem('fundo_todos', JSON.stringify(todos));
  }, [todos]);

  // Derived State
  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    todos.forEach(todo => {
      if (todo.tag) tags.add(todo.tag);
    });
    return Array.from(tags).sort();
  }, [todos]);

  // View Logic
  // If activeTag is set, we are in "Tag View". Otherwise, "List View" (activeListId).
  const isTagView = activeTag !== null;
  
  // Theme resolution: If in tag view, use slate, else use list color
  const currentList = lists.find(l => l.id === activeListId) || lists[0];
  const currentTheme = isTagView ? THEMES['slate'] : THEMES[currentList?.color || 'blue'];
  
  // Header Title
  const headerTitle = isTagView ? `# ${activeTag}` : currentList.name;
  const headerIconName = isTagView ? 'Hash' : currentList.icon;

  const activeTodos = useMemo(() => {
    if (isTagView) {
      return todos.filter(t => t.tag === activeTag);
    }
    return todos.filter(t => t.listId === activeListId);
  }, [todos, activeListId, activeTag, isTagView]);

  const completedCount = activeTodos.filter(t => t.completed).length;
  const progress = activeTodos.length > 0 ? (completedCount / activeTodos.length) * 100 : 0;

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handlers
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

  const addTodo = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTodoText.trim()) return;
    
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text: newTodoText.trim(),
      completed: false,
      listId: activeListId, // Always assign to current 'context' list even if in tag view
      isImportant: false,
      tag: isTagView ? (activeTag || undefined) : undefined
    };

    setTodos(prev => [newTodo, ...prev]); // Add to top
    setNewTodoText('');
  };

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const toggleImportant = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, isImportant: !t.isImportant } : t));
  };
  
  const updateTag = (id: string, tag: string) => {
     setTodos(prev => prev.map(t => t.id === id ? { ...t, tag: tag || undefined } : t));
     // If we are in tag view and remove the tag, it will disappear from view, which is expected behaviour.
     // If we are in tag view and change the tag to something else, it also disappears.
  };

  const moveToList = (todoId: string, newListId: string) => {
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, listId: newListId } : t));
  };

  const createList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;

    const newList: TodoList = {
      id: crypto.randomUUID(),
      name: newListTitle.trim(),
      color: newListColor,
      icon: newListIcon,
    };

    setLists([...lists, newList]);
    setActiveListId(newList.id);
    setActiveTag(null); // Switch to list view
    setIsCreatingList(false);
    setNewListTitle('');
    setIsSidebarOpen(false); // Auto close on mobile
  };

  const deleteList = (listId: string) => {
    if (lists.length <= 1) {
      alert("You need at least one list!");
      return;
    }
    const confirm = window.confirm("Are you sure? This will delete all tasks in this list.");
    if (confirm) {
      setLists(prev => prev.filter(l => l.id !== listId));
      setTodos(prev => prev.filter(t => t.listId !== listId));
      if (activeListId === listId) {
        setActiveListId(lists[0].id);
        setActiveTag(null);
      }
    }
  };

  const switchToList = (id: string) => {
    setActiveListId(id);
    setActiveTag(null);
    setIsSidebarOpen(false);
  };

  const switchToTag = (tag: string) => {
    setActiveTag(tag);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-rose-500">
            FunDo
          </h1>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {/* Regular Lists */}
          {lists.map(list => {
            const Icon = IconMap[list.icon] || Home;
            // Active if we are NOT in tag view AND list matches
            const isActive = !isTagView && activeListId === list.id;
            const theme = THEMES[list.color];
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
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm transition-colors'}`}>
                    <Icon size={20} className={isActive ? theme.icon : 'text-slate-500'} />
                  </div>
                  <span className="font-semibold">{list.name}</span>
                </div>
                {count > 0 && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${isActive ? 'bg-white/50' : 'bg-slate-100'}`}>
                    {count}
                  </span>
                )}
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
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full">
        {/* Header */}
        <header className="p-6 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-xl">
              <Menu size={24} />
            </button>
            <div>
              <h2 className={`text-3xl font-bold flex items-center gap-2 ${currentTheme.text}`}>
                {(() => {
                   const Icon = isTagView ? Hash : (IconMap[currentList.icon] || Home);
                   return <Icon size={28} />;
                })()}
                {headerTitle}
                {!isTagView && (
                  <button 
                    onClick={() => deleteList(currentList.id)}
                    className="opacity-0 group-hover:opacity-100 lg:opacity-0 hover:opacity-100 text-slate-300 hover:text-rose-400 transition-opacity ml-2"
                  >
                  </button>
                )}
              </h2>
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
                          const Icon = isTagView ? Hash : (IconMap[currentList.icon] || Home);
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
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none font-medium"
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
    </div>
  );
}
