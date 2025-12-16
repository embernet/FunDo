import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  Rocket,
  GripVertical,
  Folder,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  ArrowUp,
  History,
  Archive,
  ChevronUp,
  Moon,
  Cloud,
  Umbrella,
  Banknote,
  CreditCard,
  PiggyBank,
  Ticket,
  Film,
  Tv,
  Headphones,
  Mic,
  Bike,
  Bus,
  Flower2,
  TreePine,
  Frown,
  Meh,
  Handshake,
  ThumbsUp,
  ThumbsDown,
  Hand,
  HandHeart,
  FolderPlus
} from 'lucide-react';
import { Todo, TodoList, ThemeColor, ThemeConfig, TagCategory, Folder as FolderType } from './types';
import { INITIAL_LISTS, INITIAL_FOLDERS, THEMES, AVAILABLE_ICONS } from './constants';
import { TodoItem } from './components/TodoItem';

// --- IndexedDB Helpers for File Handle Persistence ---
const DB_NAME = 'FunDo_DB';
const STORE_NAME = 'file_handles';

const initDB = () => {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const storeFileHandleInDB = async (handle: any) => {
  try {
    const db = await initDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(handle, 'project_handle');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("IndexedDB not supported or failed", e);
  }
};

const getFileHandleFromDB = async () => {
  try {
    const db = await initDB();
    return new Promise<any>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get('project_handle');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn("IndexedDB not supported or failed", e);
    return null;
  }
};

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

const getTodayDateString = () => new Date().toISOString().split('T')[0];

// Icon mapping helper
const IconMap: Record<string, React.ElementType> = {
  Sun, Briefcase, ShoppingBag, Lightbulb, Home, Star, Heart, Zap, Coffee, Music, Book, BookOpen, Code, Users,
  GraduationCap, Dumbbell, Plane, Car, Utensils, Gift, Wallet, Camera, Gamepad2, Hammer, 
  Palette, Smile, Clock, Calendar, Flag, MapPin, Smartphone, PawPrint, Leaf, Trophy, User, CircleHelp, Rocket,
  Moon, Cloud, Umbrella, Banknote, CreditCard, PiggyBank, Ticket, Film, Tv, Headphones, Mic, Bike, Bus,
  Flower2, TreePine, Frown, Meh, Handshake,
  ThumbsUp, ThumbsDown, Hand, HandHeart
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

// --- Sub Components ---

interface SidebarItemProps {
  list: TodoList;
  isActive: boolean;
  theme: ThemeConfig;
  count: number;
  onClick: () => void;
  onDelete: () => void;
  showDelete: boolean;
  isNested?: boolean;
}

// Static version for My Day or non-draggable items
const StaticSidebarItem: React.FC<SidebarItemProps> = ({ list, isActive, theme, count, onClick, onDelete, showDelete, isNested }) => {
  const Icon = IconMap[list.icon] || Home;

  return (
    <div
      onClick={onClick}
      className={`
        group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-200 select-none touch-none
        ${isActive ? `${theme.bgSoft} ${theme.text}` : 'hover:bg-slate-50 text-slate-600'}
        ${isNested ? 'ml-6 border-l-2 border-slate-100 rounded-l-none' : ''}
      `}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={`p-2 rounded-xl flex-shrink-0 ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm transition-colors'}`}>
          <Icon size={20} className={isActive ? theme.icon : 'text-slate-500'} />
        </div>
        <span className="font-semibold truncate text-sm">{list.name}</span>
      </div>
      
      <div className="flex items-center gap-1">
          {/* Delete Button */}
          {showDelete && (
            <button
               onPointerDown={(e) => e.stopPropagation()} 
               onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
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
};

const SortableSidebarItem: React.FC<SidebarItemProps> = ({ list, isActive, theme, count, onClick, onDelete, showDelete, isNested }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: list.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
    position: 'relative' as 'relative',
  };

  const Icon = IconMap[list.icon] || Home;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        group flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all duration-200 select-none touch-none
        ${isActive ? `${theme.bgSoft} ${theme.text}` : 'hover:bg-slate-50 text-slate-600'}
        ${isDragging ? 'shadow-lg bg-white ring-2 ring-slate-200' : ''}
        ${isNested ? 'ml-6 border-l-2 border-slate-100 rounded-l-none' : ''}
      `}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className={`p-2 rounded-xl flex-shrink-0 ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100 group-hover:bg-white group-hover:shadow-sm transition-colors'}`}>
          <Icon size={20} className={isActive ? theme.icon : 'text-slate-500'} />
        </div>
        <span className="font-semibold truncate text-sm">{list.name}</span>
      </div>
      
      <div className="flex items-center gap-1">
          {/* Delete Button */}
          {showDelete && (
            <button
               onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on button click
               onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
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
};

interface SidebarFolderProps {
  folder: FolderType;
  lists: TodoList[];
  todos: Todo[];
  activeListId: string;
  isTagView: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onListClick: (id: string) => void;
  onListDelete: (id: string) => void;
  onAddList: (folderId: string) => void;
}

const SidebarFolder: React.FC<SidebarFolderProps> = ({ 
   folder, lists, todos, activeListId, isTagView, onToggle, onDelete, onListClick, onListDelete, onAddList 
}) => {
   const { setNodeRef, isOver } = useDroppable({
      id: folder.id,
      data: { type: 'folder', id: folder.id }
   });
   
   const Icon = IconMap[folder.icon] || Folder;
   const theme = THEMES[folder.color] || THEMES.slate;

   return (
      <div className="mb-2">
         <div 
            ref={setNodeRef}
            onClick={() => onToggle(folder.id)}
            className={`
               group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all duration-200 select-none
               ${isOver ? 'bg-violet-50 ring-2 ring-violet-200' : 'hover:bg-slate-50 text-slate-700'}
            `}
         >
            <div className="flex items-center gap-2 overflow-hidden w-full">
               <button className="p-1 text-slate-400">
                  {folder.isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
               </button>
               <div className={`p-1.5 rounded-lg flex-shrink-0 bg-slate-100 text-slate-500`}>
                  <Icon size={18} />
               </div>
               <span className="font-bold text-sm truncate flex-1">{folder.name}</span>
            </div>
            
            <div className="flex items-center gap-1">
               <button
                  onClick={(e) => {
                     e.stopPropagation();
                     onAddList(folder.id);
                  }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-violet-50 hover:text-violet-600 transition-all text-slate-400"
                  title="Add List to Folder"
               >
                  <Plus size={16} />
               </button>
               <button
                  onClick={(e) => {
                     e.stopPropagation();
                     onDelete(folder.id);
                  }}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 transition-all text-slate-400"
                  title="Delete Folder"
               >
                  <Trash2 size={16} />
               </button>
            </div>
         </div>
         
         {folder.isExpanded && (
            <div className="mt-1 space-y-1">
               <SortableContext 
                  items={lists.map(l => l.id)}
                  strategy={verticalListSortingStrategy}
               >
                  {lists.map(list => {
                     const isActive = !isTagView && activeListId === list.id;
                     const listTheme = THEMES[list.color] || THEMES['blue'];
                     const count = todos.filter(t => !t.completed && t.listId === list.id).length;
                     
                     return (
                        <SortableSidebarItem
                           key={list.id}
                           list={list}
                           isActive={isActive}
                           theme={listTheme}
                           count={count}
                           onClick={() => onListClick(list.id)}
                           onDelete={() => onListDelete(list.id)}
                           showDelete={true}
                           isNested={true}
                        />
                     );
                  })}
                  {lists.length === 0 && (
                     <div 
                        onClick={(e) => { e.stopPropagation(); onAddList(folder.id); }}
                        className="pl-12 py-2 text-xs text-slate-400 italic cursor-pointer hover:text-slate-600"
                     >
                        Empty folder. Click + to add lists.
                     </div>
                  )}
               </SortableContext>
            </div>
         )}
      </div>
   );
};

interface SidebarTagProps {
  tag: string;
  isActive: boolean;
  count: number;
  onClick: () => void;
}

const SidebarTag: React.FC<SidebarTagProps> = ({ tag, isActive, count, onClick }) => {
  const {attributes, listeners, setNodeRef, transform, isDragging} = useDraggable({
    id: `tag-${tag}`,
    data: { type: 'tag', tag }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    zIndex: 100,
    position: 'relative' as 'relative'
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`
        group flex items-center justify-between p-2 px-3 rounded-xl cursor-pointer transition-all duration-200 touch-none
        ${isActive ? 'bg-slate-100 text-slate-800' : 'hover:bg-slate-50 text-slate-500'}
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        <Hash size={16} className={isActive ? 'text-slate-600' : 'text-slate-400'} />
        <span className="font-medium text-sm truncate max-w-[120px]">{tag}</span>
      </div>
      {count > 0 && (
        <span className="text-xs font-medium text-slate-400">
          {count}
        </span>
      )}
    </div>
  );
};

interface SidebarCategoryProps {
  category: TagCategory;
  isExpanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}

const SidebarCategory: React.FC<SidebarCategoryProps> = ({ category, isExpanded, onToggle, onDelete, children }) => {
  const {setNodeRef, isOver} = useDroppable({
    id: `cat-${category.id}`,
    data: { type: 'category', id: category.id }
  });

  return (
    <div className="mb-1">
      <div 
        ref={setNodeRef}
        onClick={onToggle}
        className={`
          group flex items-center justify-between p-2 px-2 rounded-xl cursor-pointer transition-all duration-200
          ${isOver ? 'bg-violet-50 ring-1 ring-violet-200' : 'hover:bg-slate-50 text-slate-600'}
        `}
      >
        <div className="flex items-center gap-2 overflow-hidden">
           <button 
             onClick={(e) => { e.stopPropagation(); onToggle(); }}
             className="p-1 rounded hover:bg-slate-200 text-slate-400"
           >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
           </button>
           <div className="text-slate-400">
              {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
           </div>
           <span className="font-semibold text-sm truncate select-none">{category.name}</span>
        </div>
        
        <button
           onClick={(e) => {
              e.stopPropagation();
              onDelete();
           }}
           className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 transition-all text-slate-400"
           title="Delete Category"
        >
           <Trash2 size={14} />
        </button>
      </div>
      
      {isExpanded && (
        <div className="pl-4 border-l-2 border-slate-100 ml-3 mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
};

// Data type for pending loads
type PendingLoadData = {
   lists: TodoList[];
   todos: Todo[];
   folders?: FolderType[];
   tagCategories?: TagCategory[];
   handle?: any;
};

const STORAGE_VERSION = '1.5'; // Increment to trigger migration

export default function App() {
  // --- State Initialization ---
  
  const [folders, setFolders] = useState<FolderType[]>(() => {
     try {
       const saved = localStorage.getItem('fundo_folders');
       if (saved) return JSON.parse(saved);
       return INITIAL_FOLDERS;
     } catch {
       return INITIAL_FOLDERS;
     }
  });

  const [lists, setLists] = useState<TodoList[]>(() => {
    try {
      const saved = localStorage.getItem('fundo_lists');
      const savedVersion = localStorage.getItem('fundo_version');
      
      if (saved) {
        let parsedLists: TodoList[] = JSON.parse(saved);
        
        // --- MIGRATION LOGIC for Pet Projects ---
        // If migrating from < 1.4, check Pet Projects list
        if (!savedVersion || parseFloat(savedVersion) < 1.4) {
           const petListIndex = parsedLists.findIndex(l => l.name === 'Pet Projects');
           if (petListIndex !== -1) {
              const petList = parsedLists[petListIndex];
              parsedLists[petListIndex] = {
                 ...petList,
                 name: 'My Projects', // Rename list
                 folderId: 'folder-pet'
              };
           }
        }
        
        // Add new default lists if they don't exist (except removed ones like Fun App Ideas)
        const existingIds = new Set(parsedLists.map(l => l.id));
        const newDefaults = INITIAL_LISTS.filter(l => !existingIds.has(l.id));
        if (newDefaults.length > 0) {
          parsedLists = [...parsedLists, ...newDefaults];
        }
        
        return parsedLists;
      }
      return INITIAL_LISTS;
    } catch (e) {
      console.warn("Failed to load lists from storage, using default.", e);
      return INITIAL_LISTS;
    }
  });

  const [todos, setTodos] = useState<Todo[]>(() => {
    try {
      const saved = localStorage.getItem('fundo_todos');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.map((t: any) => ({
        ...t,
        tags: Array.isArray(t.tags) ? t.tags : (t.tag ? [t.tag] : [])
      }));
    } catch (e) {
      console.warn("Failed to load todos from storage, starting empty.", e);
      return [];
    }
  });
  
  // Tag Categories State
  const [tagCategories, setTagCategories] = useState<TagCategory[]>(() => {
    try {
      const saved = localStorage.getItem('fundo_tag_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Auto-Save / File Handle State
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [savedFileName, setSavedFileName] = useState<string>(() => {
    return localStorage.getItem('fundo_last_filename') || '';
  });
  const isFirstRender = useRef(true);

  // Initialize with all categories expanded by default
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(() => {
     try {
       const saved = localStorage.getItem('fundo_tag_categories');
       if (saved) {
         const parsed: TagCategory[] = JSON.parse(saved);
         return new Set(parsed.map(c => c.id));
       }
     } catch {}
     return new Set();
  });

  // Ensure activeListId points to a valid list, defaulting to the first one available
  const [activeListId, setActiveListId] = useState<string>(() => {
    return lists[0]?.id || '1';
  });
  
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newTodoText, setNewTodoText] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  
  // Icon Picker State
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  
  // Modals
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [restoreData, setRestoreData] = useState<PendingLoadData | null>(null);

  // New List Form State
  const [newListTitle, setNewListTitle] = useState('');
  const [newListColor, setNewListColor] = useState<ThemeColor>('blue');
  const [newListIcon, setNewListIcon] = useState('Home');
  const [newListFolderId, setNewListFolderId] = useState<string>(''); // '' means root
  
  // New Folder Form State
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<ThemeColor>('slate');
  const [newFolderIcon, setNewFolderIcon] = useState('Folder');

  // New Category Form State
  const [newCategoryName, setNewCategoryName] = useState('');

  // Refs
  const globalFileInputRef = useRef<HTMLInputElement>(null);
  const listFileInputRef = useRef<HTMLInputElement>(null);
  const newTodoInputRef = useRef<HTMLInputElement>(null);

  // --- Persistence ---
  
  useEffect(() => {
    localStorage.setItem('fundo_lists', JSON.stringify(lists));
  }, [lists]);
  
  useEffect(() => {
    localStorage.setItem('fundo_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('fundo_todos', JSON.stringify(todos));
  }, [todos]);
  
  useEffect(() => {
    localStorage.setItem('fundo_tag_categories', JSON.stringify(tagCategories));
  }, [tagCategories]);

  // Save version on mount to ensure subsequent loads know we are up to date
  useEffect(() => {
    localStorage.setItem('fundo_version', STORAGE_VERSION);
  }, []);

  // Track unsaved changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setHasUnsavedChanges(true);
  }, [lists, todos, tagCategories, folders]);

  // Restore file handle from IndexedDB on mount
  useEffect(() => {
     const restoreHandle = async () => {
        try {
           const handle = await getFileHandleFromDB();
           if (handle) {
              setFileHandle(handle);
           }
        } catch (e) {
           console.log("Could not restore file handle", e);
        }
     };
     restoreHandle();
  }, []);

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
      // Check new tags array
      if (todo.tags) {
        todo.tags.forEach(t => tags.add(t));
      } else if (todo.tag) {
        // Fallback for any legacy data not migrated
        tags.add(todo.tag);
      }
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
  
  const headerTitle = isTagView ? (activeTag || '') : currentList.name;

  const activeTodos = useMemo(() => {
    if (isTagView) {
      // Filter if the todo has the active tag in its tags array
      return todos.filter(t => t.tags && t.tags.includes(activeTag));
    }
    // "My Day" List Logic (ID '1')
    if (activeListId === '1') {
       return todos.filter(t => t.listId === '1' || t.isMyDay);
    }
    return todos.filter(t => t.listId === activeListId);
  }, [todos, activeListId, activeTag, isTagView]);

  const completedCount = activeTodos.filter(t => t.completed).length;
  const progress = activeTodos.length > 0 ? (completedCount / activeTodos.length) * 100 : 0;
  
  // Derived Tags Categorization
  const categorizedTagsSet = useMemo(() => {
    const set = new Set<string>();
    tagCategories.forEach(c => c.tags.forEach(t => set.add(t)));
    return set;
  }, [tagCategories]);

  const uncategorizedTags = useMemo(() => {
    return uniqueTags.filter(t => !categorizedTagsSet.has(t));
  }, [uniqueTags, categorizedTagsSet]);

  // My Day Specific Groups
  const myDayGroups = useMemo(() => {
    if (activeListId !== '1' || isTagView) return null;
    
    const todayStr = getTodayDateString();
    
    const today: Todo[] = [];
    const overdue: Todo[] = [];
    const history: Todo[] = [];
    
    activeTodos.forEach(t => {
      if (t.completed) {
        history.push(t);
      } else {
        // If it doesn't have a date, assume today for UI purposes, or if date matches
        if (!t.myDayDate || t.myDayDate === todayStr) {
          today.push(t);
        } else if (t.myDayDate < todayStr) {
          overdue.push(t);
        } else {
           // Future tasks also go to today view for now to avoid losing them
           today.push(t);
        }
      }
    });

    return { today, overdue, history };
  }, [activeTodos, activeListId, isTagView]);

  // Organized sidebar items
  const myDayList = useMemo(() => lists.find(l => l.id === '1'), [lists]);
  const rootLists = useMemo(() => lists.filter(l => !l.folderId && l.id !== '1'), [lists]);
  const nestedLists = useMemo(() => lists.filter(l => l.folderId), [lists]);

  // --- Drag and Drop ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Add distance constraint for smoother clicking
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    if (active.id !== over.id) {
       setTodos((items) => {
          const oldIndex = items.findIndex((i) => i.id === active.id);
          const newIndex = items.findIndex((i) => i.id === over.id);
          // Only reorder if found
          if (oldIndex !== -1 && newIndex !== -1) {
             return arrayMove(items, oldIndex, newIndex);
          }
          return items;
       });
    }
  };

  const handleListDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    // Check if dropping a list onto a folder
    if (over.data.current?.type === 'folder') {
       const folderId = over.id as string;
       const listId = active.id as string;
       
       // Update list to belong to this folder
       setLists(prev => prev.map(l => {
          if (l.id === listId) {
             // If already in this folder, do nothing (or move to end?)
             if (l.folderId === folderId) return l;
             // Expand the folder if dropped into it
             toggleFolder(folderId, true);
             return { ...l, folderId };
          }
          return l;
       }));
       return;
    }
    
    // Normal sorting logic
    if (active.id !== over.id) {
      setLists((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const handleTagDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const tag = active.data.current?.tag as string;
    if (!tag) return;
    
    const overId = over.id as string;
    
    // Check if dropped on a category
    if (overId.startsWith('cat-')) {
       const catId = overId.replace('cat-', '');
       moveTagToCategory(tag, catId);
       // Expand the target category
       setExpandedCategoryIds(prev => new Set(prev).add(catId));
    } else if (overId === 'uncategorized-zone') {
       moveTagToCategory(tag, null); // Move to uncategorized
    }
  };

  // --- Actions ---
  
  const moveTagToCategory = (tag: string, targetCatId: string | null) => {
     setTagCategories(prev => {
        const newCategories = prev.map(cat => ({
           ...cat,
           tags: cat.tags.filter(t => t !== tag) // Remove from existing
        }));
        
        if (targetCatId) {
           const targetCat = newCategories.find(c => c.id === targetCatId);
           if (targetCat) {
              targetCat.tags.push(tag);
              targetCat.tags.sort(); // Keep sorted
           }
        }
        return newCategories;
     });
  };

  const createCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    const newCat: TagCategory = {
       id: generateId(),
       name: newCategoryName.trim(),
       tags: []
    };
    
    setTagCategories(prev => [...prev, newCat]);
    setExpandedCategoryIds(prev => new Set(prev).add(newCat.id));
    setNewCategoryName('');
    setIsCreatingCategory(false);
  };
  
  const deleteCategory = (id: string) => {
     if (confirm("Delete this category? Tags inside will become uncategorized.")) {
        setTagCategories(prev => prev.filter(c => c.id !== id));
     }
  };
  
  const toggleCategory = (id: string) => {
     setExpandedCategoryIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
     });
  };

  // Folder Actions
  const createFolder = (e: React.FormEvent) => {
     e.preventDefault();
     if (!newFolderTitle.trim()) return;
     
     const newFolder: FolderType = {
        id: generateId(),
        name: newFolderTitle.trim(),
        color: newFolderColor,
        icon: newFolderIcon,
        isExpanded: true
     };
     
     setFolders(prev => [...prev, newFolder]);
     setNewFolderTitle('');
     setIsCreatingFolder(false);
  };

  const deleteFolder = (id: string) => {
     // Check if folder has lists
     const hasLists = lists.some(l => l.folderId === id);
     if (hasLists) {
        if (!confirm("This folder contains lists. Deleting it will move these lists to the root level. Continue?")) return;
        // Move lists to root
        setLists(prev => prev.map(l => l.folderId === id ? { ...l, folderId: undefined } : l));
     }
     setFolders(prev => prev.filter(f => f.id !== id));
  };

  const toggleFolder = (id: string, forceState?: boolean) => {
     setFolders(prev => prev.map(f => {
        if (f.id === id) {
           return { ...f, isExpanded: forceState !== undefined ? forceState : !f.isExpanded };
        }
        return f;
     }));
  };

  const handleAddListToFolder = (folderId: string) => {
     setNewListFolderId(folderId);
     setNewListTitle('');
     setIsCreatingList(true);
  };

  const addTodo = (e?: React.FormEvent) => {
    e?.preventDefault();
    const rawText = newTodoText.trim();
    if (!rawText) return;
    
    let text = rawText;
    const extractedTags: string[] = [];

    // Hashtag extraction - find all matches
    const tagRegex = /(?:^|\s)(#[a-zA-Z0-9_\-]+)(?=\s|$)/g;
    const matches = [...rawText.matchAll(tagRegex)];
    
    if (matches.length > 0) {
      matches.forEach(match => {
        if (match[1]) {
          extractedTags.push(match[1].substring(1)); // Remove '#'
        }
      });
      // Remove tags from text
      text = rawText.replace(tagRegex, ' ').replace(/\s+/g, ' ').trim();
    }

    // Auto-add active tag if in tag view and not already typed
    if (isTagView && activeTag && !extractedTags.includes(activeTag)) {
       extractedTags.push(activeTag);
    }
    
    const isMyDay = activeListId === '1';

    const newTodo: Todo = {
      id: generateId(),
      text: text,
      completed: false,
      listId: activeListId,
      isImportant: false,
      isMyDay: isMyDay,
      myDayDate: isMyDay ? getTodayDateString() : undefined,
      tags: extractedTags,
      tag: extractedTags[0], // Legacy compat
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
  
  const toggleMyDay = (id: string) => {
    const today = getTodayDateString();
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
         const isMyDay = !t.isMyDay;
         return { 
            ...t, 
            isMyDay,
            myDayDate: isMyDay ? today : undefined 
         };
      }
      return t;
    }));
  };
  
  const moveOverdueToToday = () => {
    const today = getTodayDateString();
    setTodos(prev => prev.map(t => {
       // Only update if it is in My Day, Incomplete, and date is old
       if (t.isMyDay && !t.completed && t.myDayDate && t.myDayDate < today) {
          return { ...t, myDayDate: today };
       }
       return t;
    }));
  };

  const archiveHistory = () => {
     // Filter completed items in My Day
     const itemsToArchive = todos.filter(t => t.isMyDay && t.completed);
     if (itemsToArchive.length === 0) return;
     
     // Save file
     const data = {
        type: 'fundo-archive',
        exportDate: new Date().toISOString(),
        tasks: itemsToArchive
     };
     const dateStr = getTodayDateString();
     downloadJson(data, `FunDo-Archive-${dateStr}.json`);
     
     // Clear from My Day view (keep task, remove flag)
     if (confirm("History saved. Clear these items from 'My Day'?")) {
        setTodos(prev => prev.map(t => {
           if (t.isMyDay && t.completed) {
              return { ...t, isMyDay: false, myDayDate: undefined };
           }
           return t;
        }));
     }
  };
  
  const updateTags = (id: string, newTags: string[]) => {
     setTodos(prev => prev.map(t => t.id === id ? { ...t, tags: newTags, tag: newTags[0] } : t));
  };

  const updateNote = (id: string, note: string) => {
     setTodos(prev => prev.map(t => t.id === id ? { ...t, notes: note } : t));
  };

  const moveToList = (todoId: string, newListId: string) => {
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, listId: newListId } : t));
  };

  // --- Title & Icon Editing Actions ---

  const handleTitleClick = () => {
    const initialTitle = isTagView ? (activeTag || '') : currentList.name;
    setTitleInput(initialTitle);
    setIsEditingTitle(true);
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
      if (trimmed !== activeTag) {
        // Rename tag across all todos
        setTodos(prev => prev.map(t => {
           if (t.tags && t.tags.includes(activeTag)) {
              const newTags = t.tags.map(tag => tag === activeTag ? trimmed : tag);
              return { ...t, tags: newTags, tag: newTags[0] };
           }
           return t;
        }));
        
        setActiveTag(trimmed);
        
        // Also update the tag in categories if present
        setTagCategories(prev => prev.map(cat => ({
           ...cat,
           tags: cat.tags.map(t => t === activeTag ? trimmed : t)
        })));
      }
    } else {
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
      folderId: newListFolderId || undefined
    };
    
    // If adding to a folder, expand it
    if (newList.folderId) {
       toggleFolder(newList.folderId, true);
    }

    setLists([...lists, newList]);
    setActiveListId(newList.id);
    setActiveTag(null);
    setIsCreatingList(false);
    setNewListTitle('');
    setIsSidebarOpen(false);
  };

  const deleteList = (listId: string) => {
    if (listId === '1') return; // Prevent deleting My Day
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

  // --- Import / Export / Auto-Save ---

  const downloadJson = async (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    
    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'JSON File',
            accept: { 'application/json': ['.json'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(jsonString);
        await writable.close();
        return;
      }
    } catch (err) {
       // Silent fail or unsupported in iframe
    }

    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(href);
  };

  // Main Project Save / Export
  const saveProject = async (manual: boolean = false): Promise<boolean> => {
    const data = {
      version: 1,
      type: 'fundo-backup',
      timestamp: new Date().toISOString(),
      lists,
      todos,
      folders,
      tagCategories
    };

    try {
      let handle = fileHandle;
      
      // If no handle exists, and it's a manual save, try to get one
      if (!handle) {
         if (manual && 'showSaveFilePicker' in window) {
             try {
               handle = await (window as any).showSaveFilePicker({
                  suggestedName: 'FunDo.json',
                  types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }],
               });
               setFileHandle(handle);
               setSavedFileName(handle.name);
               localStorage.setItem('fundo_last_filename', handle.name);
               await storeFileHandleInDB(handle); // Persist handle
             } catch (pickerErr) {
               // User cancelled or not allowed
               if (manual && (pickerErr as Error).name !== 'AbortError') {
                 downloadJson(data, 'FunDo.json');
               }
               return false;
             }
         } else {
             // Fallback for manual save without File System Access API support
             if (manual) downloadJson(data, 'FunDo.json');
             return true; // Technically saved (downloaded)
         }
      }

      // If we have a handle (either existing or just created), write to it
      if (handle) {
          // Check for permissions if not fresh
          const opts = { mode: 'readwrite' };
          // Only check permission if we have a handle from DB (persisted) that might be stale
          // If we just created it, permission is granted.
          if ((await handle.queryPermission(opts)) === 'granted') {
             const writable = await handle.createWritable();
             await writable.write(JSON.stringify(data, null, 2));
             await writable.close();
             setHasUnsavedChanges(false);
             return true;
          } else {
             // Permission lost or needed re-prompt. 
             // If manual, we can request permission. If auto-save, we fail silently.
             if (manual) {
                if ((await handle.requestPermission(opts)) === 'granted') {
                   const writable = await handle.createWritable();
                   await writable.write(JSON.stringify(data, null, 2));
                   await writable.close();
                   setHasUnsavedChanges(false);
                   return true;
                }
             }
          }
      }
      return false;
    } catch (err) {
       console.error("Save failed:", err);
       // If manual save failed heavily, fallback
       if (manual && !fileHandle) downloadJson(data, 'FunDo.json');
       return false;
    }
  };

  // Main Project Load / Import
  const loadProject = async () => {
    // Try File System Access API first for auto-save capability
    if ('showOpenFilePicker' in window) {
        try {
            const [handle] = await (window as any).showOpenFilePicker({
                types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }],
                multiple: false
            });
            
            const file = await handle.getFile();
            const text = await file.text();
            processLoadedData(text, handle);
        } catch (e) {
            // Check if it was a user cancellation
            if ((e as Error).name !== 'AbortError') {
                console.warn("File System API failed, falling back to legacy input", e);
                globalFileInputRef.current?.click();
            }
        }
    } else {
        // Fallback to basic file input
        globalFileInputRef.current?.click();
    }
  };

  const processLoadedData = (jsonString: string, newHandle?: any) => {
      try {
        const data = JSON.parse(jsonString);
        
        if (!data.lists || !Array.isArray(data.lists) || data.lists.length === 0) {
          alert("Backup file invalid: No lists found.");
          return;
        }
        
        const migratedTodos = (data.todos || []).map((t: any) => ({
           ...t,
           tags: Array.isArray(t.tags) ? t.tags : (t.tag ? [t.tag] : [])
        }));

        const pendingData: PendingLoadData = { 
            lists: data.lists, 
            todos: migratedTodos, 
            folders: data.folders, 
            tagCategories: data.tagCategories,
            handle: newHandle 
        };

        if (hasUnsavedChanges) {
            setRestoreData(pendingData);
        } else {
            confirmRestore(pendingData);
        }

      } catch (error) {
        console.error("Restore failed", error);
        alert("Failed to parse backup file.");
      }
  };

  // Fallback file input handler
  const importAllData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
            processLoadedData(event.target.result);
        }
        if (globalFileInputRef.current) globalFileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const confirmRestore = (data: PendingLoadData) => {
    if (!data) return;
    
    setLists(data.lists);
    setTodos(data.todos);
    if (data.folders) setFolders(data.folders);
    if (data.tagCategories) setTagCategories(data.tagCategories);
    
    setActiveListId(data.lists[0]?.id || '1');
    setActiveTag(null);
    
    // Handle File Handle updates
    if (data.handle) {
        setFileHandle(data.handle);
        setSavedFileName(data.handle.name);
        localStorage.setItem('fundo_last_filename', data.handle.name);
        storeFileHandleInDB(data.handle);
    } else {
        // If loaded via import (no handle), clear current handle so we don't overwrite previous file
        setFileHandle(null);
        setSavedFileName('');
        localStorage.removeItem('fundo_last_filename');
        storeFileHandleInDB(null);
    }
    
    setHasUnsavedChanges(false);
    setRestoreData(null);
  };

  // Auto-Save Effect
  useEffect(() => {
    const interval = setInterval(async () => {
        if (fileHandle && hasUnsavedChanges) {
           // Check permission silently
           try {
             const perm = await fileHandle.queryPermission({ mode: 'readwrite' });
             if (perm === 'granted') {
                saveProject(false); // Silent auto-save
             }
           } catch (e) {
             // Ignore permission check errors
           }
        }
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [fileHandle, hasUnsavedChanges, lists, todos, tagCategories, folders]);


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
          tags: Array.isArray(t.tags) ? t.tags : (t.tag ? [t.tag] : []),
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
  
  // Uncategorized Drop Zone (for dropping tags back to top level)
  const {setNodeRef: setUncategorizedDropRef, isOver: isOverUncategorized} = useDroppable({
     id: 'uncategorized-zone'
  });

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
          
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-rose-500 flex-1">
            FunDo
          </h1>
          
          <span className="text-xs font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-full border border-rose-100">
            {todos.filter(t => !t.completed).length}
          </span>
          
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 -mr-2 text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          
          {/* My Day (Fixed) */}
          {myDayList && (
             <>
               <StaticSidebarItem 
                  list={myDayList} 
                  isActive={activeListId === myDayList.id && !isTagView}
                  theme={THEMES[myDayList.color]}
                  count={todos.filter(t => (t.listId === '1' || t.isMyDay) && !t.completed).length}
                  onClick={() => switchToList(myDayList.id)}
                  onDelete={() => {}}
                  showDelete={false}
               />
               <div className="my-2 border-b border-slate-100 mx-2" />
             </>
          )}

          {/* Regular Lists - Draggable Context */}
          <DndContext 
            id="sidebar-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleListDragEnd}
          >
            {/* Render Folders First */}
            {folders.map(folder => {
               const folderLists = lists.filter(l => l.folderId === folder.id);
               return (
                  <SidebarFolder 
                     key={folder.id}
                     folder={folder}
                     lists={folderLists}
                     todos={todos}
                     activeListId={activeListId}
                     isTagView={isTagView}
                     onToggle={toggleFolder}
                     onDelete={deleteFolder}
                     onListClick={switchToList}
                     onListDelete={deleteList}
                     onAddList={handleAddListToFolder}
                  />
               );
            })}

            {/* Render Root Lists */}
            <SortableContext 
              items={rootLists.map(l => l.id)}
              strategy={verticalListSortingStrategy}
            >
              {rootLists.map(list => {
                const isActive = !isTagView && activeListId === list.id;
                const theme = THEMES[list.color] || THEMES['blue'];
                const count = todos.filter(t => !t.completed && t.listId === list.id).length;

                return (
                  <SortableSidebarItem
                    key={list.id}
                    list={list}
                    isActive={isActive}
                    theme={theme}
                    count={count}
                    onClick={() => switchToList(list.id)}
                    onDelete={() => deleteList(list.id)}
                    showDelete={list.id !== '1' && lists.length > 1}
                  />
                );
              })}
            </SortableContext>
          </DndContext>

          {/* New Buttons */}
          <div className="grid grid-cols-2 gap-2 py-2">
             <button 
              onClick={() => {
                 setNewListFolderId('');
                 setNewListTitle('');
                 setIsCreatingList(true);
              }}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all font-medium text-xs"
            >
              <Plus size={14} />
              New List
            </button>
            <button 
              onClick={() => setIsCreatingFolder(true)}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50 transition-all font-medium text-xs"
            >
              <FolderPlus size={14} />
              New Folder
            </button>
          </div>

          {/* Tags Section */}
          {(uniqueTags.length > 0 || tagCategories.length > 0) && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="px-3 mb-2 flex items-center justify-between">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                   <TagIcon size={12} />
                   Smart Tags
                 </div>
                 <button 
                    onClick={() => setIsCreatingCategory(true)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors"
                    title="Add Tag Category"
                 >
                    <Plus size={14} />
                 </button>
              </div>
              
              <DndContext 
                 id="tags-dnd" 
                 sensors={sensors}
                 onDragEnd={handleTagDragEnd}
              >
                 <div className="space-y-1">
                    {/* Render Categories */}
                    {tagCategories.map(cat => {
                       const visibleTags = cat.tags.filter(t => uniqueTags.includes(t));
                       if (visibleTags.length === 0 && cat.tags.length > 0) return null; // Hide if tags don't exist anymore? Or show empty? Let's show empty to allow dropping.
                       
                       return (
                          <SidebarCategory 
                             key={cat.id} 
                             category={cat} 
                             isExpanded={expandedCategoryIds.has(cat.id)}
                             onToggle={() => toggleCategory(cat.id)}
                             onDelete={() => deleteCategory(cat.id)}
                          >
                             {visibleTags.map(tag => {
                                const isActive = isTagView && activeTag === tag;
                                const count = todos.filter(t => t.tags && t.tags.includes(tag) && !t.completed).length;
                                return (
                                   <SidebarTag 
                                      key={tag} 
                                      tag={tag} 
                                      isActive={isActive} 
                                      count={count} 
                                      onClick={() => switchToTag(tag)} 
                                   />
                                );
                             })}
                             {visibleTags.length === 0 && (
                                <div className="px-3 py-1 text-xs text-slate-300 italic">No active tags</div>
                             )}
                          </SidebarCategory>
                       );
                    })}
                    
                    {/* Render Uncategorized Tags */}
                    {uncategorizedTags.length > 0 && (
                       <div 
                         ref={setUncategorizedDropRef}
                         className={`space-y-1 ${isOverUncategorized ? 'bg-slate-50 ring-1 ring-slate-200 rounded-xl p-1 -m-1 transition-all' : ''}`}
                       >
                          {tagCategories.length > 0 && <div className="px-3 py-1 text-xs font-semibold text-slate-400">Uncategorized</div>}
                          {uncategorizedTags.map(tag => {
                            const isActive = isTagView && activeTag === tag;
                            const count = todos.filter(t => t.tags && t.tags.includes(tag) && !t.completed).length;
                            return (
                              <SidebarTag 
                                 key={tag} 
                                 tag={tag} 
                                 isActive={isActive} 
                                 count={count} 
                                 onClick={() => switchToTag(tag)} 
                              />
                            );
                          })}
                       </div>
                    )}
                 </div>
              </DndContext>
            </div>
          )}
        </div>

        {/* Global Footer Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          {savedFileName && (
            <div className="text-center pb-2 px-2">
               <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Saved to</div>
               <div className="text-xs font-medium text-slate-600 truncate" title={savedFileName}>
                 {savedFileName}
               </div>
            </div>
          )}
          <div className="flex gap-2">
            <button 
              onClick={() => saveProject(true)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all text-xs font-semibold ${
                 hasUnsavedChanges 
                    ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-200 hover:bg-emerald-100' 
                    : 'text-slate-500 hover:bg-white hover:text-blue-600 hover:shadow-sm'
              }`}
              title={hasUnsavedChanges ? "You have unsaved changes" : "All changes saved"}
            >
              <Download size={18} className={hasUnsavedChanges ? "text-emerald-500" : ""} />
              {hasUnsavedChanges ? "Save*" : "Save"}
            </button>
            <button 
              onClick={loadProject}
              className="flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl text-slate-500 hover:bg-white hover:text-emerald-600 hover:shadow-sm transition-all text-xs font-semibold"
              title="Load from file"
            >
              <Upload size={18} />
              Load
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
                
                {!isTagView && lists.length > 1 && currentList.id !== '1' && (
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
              {myDayGroups ? (
                // --- MY DAY VIEW ---
                <>
                   {/* Today Section */}
                   <SortableContext 
                      items={myDayGroups.today.map(t => t.id)} 
                      strategy={verticalListSortingStrategy}
                   >
                      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-3 mt-2">Today</h2>
                      {myDayGroups.today.length === 0 && myDayGroups.overdue.length === 0 && myDayGroups.history.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                             <Sun size={48} className="text-rose-200 mb-4" />
                             <p className="text-xl font-medium">My Day is empty</p>
                             <p>Add tasks to see them here!</p>
                          </div>
                      )}
                      
                      {myDayGroups.today.length === 0 && (myDayGroups.overdue.length > 0 || myDayGroups.history.length > 0) && (
                         <div className="p-4 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-400 text-sm mb-4">
                            No tasks planned for today
                         </div>
                      )}

                      {myDayGroups.today.map(todo => (
                        <TodoItem
                          key={todo.id}
                          todo={todo}
                          theme={currentTheme}
                          allLists={lists}
                          isSortable={true}
                          onToggle={toggleTodo}
                          onDelete={deleteTodo}
                          onToggleImportant={toggleImportant}
                          onToggleMyDay={toggleMyDay}
                          onMoveToList={moveToList}
                          onUpdateTag={updateTags}
                          onUpdateNote={updateNote}
                        />
                      ))}
                   </SortableContext>

                   {/* Overdue Section */}
                   {myDayGroups.overdue.length > 0 && (
                      <div className="mt-8">
                         <div className="h-px bg-slate-200 mb-6" />
                         <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                               Past Days
                               <span className="bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">{myDayGroups.overdue.length}</span>
                            </h2>
                            <button 
                               onClick={moveOverdueToToday}
                               className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-semibold transition-colors"
                            >
                               <ArrowUp size={14} />
                               Move all to Today
                            </button>
                         </div>
                         <div className="space-y-3 opacity-90">
                            {myDayGroups.overdue.map(todo => (
                              <TodoItem
                                key={todo.id}
                                todo={todo}
                                theme={currentTheme}
                                allLists={lists}
                                isSortable={false} // Disable sorting for overdue section
                                onToggle={toggleTodo}
                                onDelete={deleteTodo}
                                onToggleImportant={toggleImportant}
                                onToggleMyDay={toggleMyDay}
                                onMoveToList={moveToList}
                                onUpdateTag={updateTags}
                                onUpdateNote={updateNote}
                              />
                            ))}
                         </div>
                      </div>
                   )}
                   
                   {/* History Section */}
                   <div className="mt-8 pb-8">
                      <div className="h-px bg-slate-200 mb-6" />
                      <button 
                         onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                         className="flex items-center justify-between w-full text-slate-400 hover:text-slate-600 transition-colors group mb-4"
                      >
                         <div className="flex items-center gap-2 font-bold text-lg">
                            <History size={20} />
                            History
                            {myDayGroups.history.length > 0 && (
                               <span className="bg-slate-100 text-slate-400 group-hover:bg-slate-200 text-xs px-2 py-0.5 rounded-full transition-colors">
                                 {myDayGroups.history.length}
                               </span>
                            )}
                         </div>
                         {isHistoryOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      
                      {isHistoryOpen && (
                         <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            {myDayGroups.history.length > 0 && (
                               <div className="flex justify-end mb-4">
                                  <button
                                     onClick={archiveHistory}
                                     className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                  >
                                     <Archive size={14} />
                                     Archive & Clear History
                                  </button>
                               </div>
                            )}
                            
                            <div className="space-y-3 opacity-60">
                               {myDayGroups.history.length === 0 ? (
                                  <div className="text-center py-4 text-slate-400 text-sm italic">
                                     No completed tasks in history.
                                  </div>
                               ) : (
                                  myDayGroups.history.map(todo => (
                                    <TodoItem
                                      key={todo.id}
                                      todo={todo}
                                      theme={currentTheme}
                                      allLists={lists}
                                      isSortable={false}
                                      onToggle={toggleTodo}
                                      onDelete={deleteTodo}
                                      onToggleImportant={toggleImportant}
                                      onToggleMyDay={toggleMyDay}
                                      onMoveToList={moveToList}
                                      onUpdateTag={updateTags}
                                      onUpdateNote={updateNote}
                                    />
                                  ))
                               )}
                            </div>
                         </div>
                      )}
                   </div>
                </>
              ) : (
                // --- STANDARD LIST VIEW ---
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
                        onToggleMyDay={toggleMyDay}
                        onMoveToList={moveToList}
                        onUpdateTag={updateTags}
                        onUpdateNote={updateNote}
                      />
                    ))
                  )}
                </SortableContext>
              )}
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
                <label className="block text-sm font-bold text-slate-700 mb-2">Location</label>
                <select
                  value={newListFolderId}
                  onChange={e => setNewListFolderId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none font-medium text-slate-800 bg-slate-50"
                >
                  <option value="">Root (No Folder)</option>
                  {folders.map(f => (
                     <option key={f.id} value={f.id}>📁 {f.name}</option>
                  ))}
                </select>
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

      {/* New Folder Modal */}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Create New Folder</h3>
              <button onClick={() => setIsCreatingFolder(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={createFolder} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Folder Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newFolderTitle}
                  onChange={e => setNewFolderTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none font-medium text-slate-800 bg-slate-50 placeholder-slate-400"
                  placeholder="e.g. Projects"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Folder Color</label>
                <div className="flex gap-3 overflow-x-auto py-2">
                  {Object.keys(THEMES).map((color) => {
                     const c = color as ThemeColor;
                     const isSelected = newFolderColor === c;
                     return (
                       <button
                         key={c}
                         type="button"
                         onClick={() => setNewFolderColor(c)}
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
                  {AVAILABLE_ICONS.slice(0, 18).map(iconName => {
                    const Icon = IconMap[iconName];
                    const isSelected = newFolderIcon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewFolderIcon(iconName)}
                        className={`aspect-square rounded-xl flex items-center justify-center transition-all ${
                           isSelected 
                             ? `${THEMES[newFolderColor].bgSoft} ${THEMES[newFolderColor].text} ring-2 ring-offset-2 ring-${newFolderColor}-400` 
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
                  disabled={!newFolderTitle.trim()}
                  className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* New Category Modal */}
      {isCreatingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">New Tag Category</h3>
              <button onClick={() => setIsCreatingCategory(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={createCategory} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Category Name</label>
                <input
                  autoFocus
                  type="text"
                  value={newCategoryName}
                  onChange={e => setNewCategoryName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none font-medium text-slate-800 bg-slate-50 placeholder-slate-400"
                  placeholder="e.g. Work Projects"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!newCategoryName.trim()}
                  className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Create Category
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

      {/* Unsaved Changes Confirmation Modal */}
      {restoreData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
             <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4">
                   <AlertCircle size={24} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Unsaved Changes</h3>
                <p className="text-slate-500 mb-6 text-sm">
                  You have unsaved changes in your current project. What would you like to do before loading the new file?
                </p>
                
                <div className="flex flex-col gap-2">
                   <button 
                     onClick={async () => {
                        const saved = await saveProject(true);
                        if (saved) {
                           confirmRestore(restoreData);
                        }
                     }}
                     className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-900 transition-all shadow-lg shadow-slate-200"
                   >
                     Save then Load
                   </button>
                   <button 
                     onClick={() => confirmRestore(restoreData)}
                     className="w-full py-3 rounded-xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-all"
                   >
                     Discard and Load
                   </button>
                   <button 
                     onClick={() => setRestoreData(null)}
                     className="w-full py-3 rounded-xl text-slate-400 font-bold hover:text-slate-600 transition-all"
                   >
                     Cancel
                   </button>
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}