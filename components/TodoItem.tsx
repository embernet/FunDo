import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Star, Trash2, ArrowRightLeft, Tag, Calendar, Clock, Sun, StickyNote } from 'lucide-react';
import { Todo, TodoList, ThemeConfig } from '../types';

interface TodoItemProps {
  todo: Todo;
  theme: ThemeConfig;
  allLists: TodoList[];
  isSortable: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onToggleMyDay: (id: string) => void;
  onMoveToList: (todoId: string, newListId: string) => void;
  onUpdateTag: (todoId: string, tags: string[]) => void;
  onUpdateNote: (todoId: string, note: string) => void;
}

const formatDate = (ts?: number) => {
  if (!ts) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(ts));
};

const getElapsed = (start?: number) => {
    if (!start) return '';
    const diffMs = Date.now() - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    return `${diffDays} days ago`;
};

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  theme,
  allLists,
  isSortable,
  onToggle,
  onDelete,
  onToggleImportant,
  onToggleMyDay,
  onMoveToList,
  onUpdateTag,
  onUpdateNote
}) => {
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const [isTagInputOpen, setIsTagInputOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  
  // Note state
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  
  const tagInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: todo.id,
    disabled: !isSortable 
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  useEffect(() => {
    if (isTagInputOpen && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isTagInputOpen]);

  useEffect(() => {
    if (isNoteOpen && noteInputRef.current) {
      noteInputRef.current.focus();
      // Set cursor to end
      const len = noteInputRef.current.value.length;
      noteInputRef.current.setSelectionRange(len, len);
    }
  }, [isNoteOpen]);

  const handleTagSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const newTags = tagInput.split(',').map(t => t.trim()).filter(t => t.length > 0);
    onUpdateTag(todo.id, newTags);
    setIsTagInputOpen(false);
  };
  
  const handleNoteSubmit = () => {
     onUpdateNote(todo.id, noteInput.trim());
     setIsNoteOpen(false);
  };
  
  const initTagInput = () => {
     setTagInput(todo.tags ? todo.tags.join(', ') : (todo.tag || ''));
  };
  
  const initNoteInput = () => {
     setNoteInput(todo.notes || '');
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md ${
        todo.completed ? 'opacity-60 hover:opacity-100 bg-slate-50' : ''
      }`}
    >
      <div className="flex items-start gap-3 p-3 w-full">
        {/* Drag Handle - Only visible if sortable */}
        <div className="pt-1">
            {isSortable ? (
              <div
                {...attributes}
                {...listeners}
                className="touch-none cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500"
              >
                <GripVertical size={20} />
              </div>
            ) : (
              <div className="w-5" /> /* Spacer for alignment when not sortable */
            )}
        </div>

        {/* Checkbox */}
        <div className="pt-0.5">
            <button
              onClick={() => onToggle(todo.id)}
              className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                todo.completed
                  ? `${theme.bg} border-transparent`
                  : `border-slate-300 hover:border-${theme.bg.replace('bg-', '')}`
              }`}
            >
              {todo.completed && <Check size={14} className="text-white" />}
            </button>
        </div>

        {/* Text, Tag, and Notes */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-2">
              <span
                className={`truncate text-lg font-medium transition-all ${
                  todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'
                }`}
              >
                {todo.text}
              </span>
              
              {todo.tags && todo.tags.map(tag => (
                <span 
                  key={tag}
                  onClick={() => {
                     initTagInput();
                     setIsTagInputOpen(true);
                  }}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 cursor-pointer hover:bg-slate-200"
                >
                  #{tag}
                </span>
              ))}
          </div>

          {/* Notes Display / Edit Area */}
          {(isNoteOpen || todo.notes) && (
             <div className="w-full mt-1">
                {isNoteOpen ? (
                   <div className="animate-in fade-in zoom-in-95 duration-100">
                      <textarea
                         ref={noteInputRef}
                         value={noteInput}
                         onChange={(e) => setNoteInput(e.target.value)}
                         placeholder="Add a note..."
                         className="w-full text-sm text-slate-600 bg-yellow-50/50 border border-yellow-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-yellow-100 resize-none min-h-[60px]"
                         onKeyDown={(e) => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                               handleNoteSubmit();
                            } else if (e.key === 'Escape') {
                               setIsNoteOpen(false);
                            }
                         }}
                         // Stop propagation of drag events on the textarea
                         onPointerDown={(e) => e.stopPropagation()}
                      />
                      <div className="flex justify-end gap-2 mt-1">
                         <button 
                            onClick={() => setIsNoteOpen(false)}
                            className="text-xs font-medium text-slate-400 hover:text-slate-600 px-2 py-1"
                         >
                            Cancel
                         </button>
                         <button 
                            onClick={handleNoteSubmit}
                            className="text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-lg"
                         >
                            Save
                         </button>
                      </div>
                   </div>
                ) : (
                   <div 
                      onClick={() => {
                         initNoteInput();
                         setIsNoteOpen(true);
                      }}
                      className="text-sm text-slate-500 whitespace-pre-wrap cursor-pointer hover:bg-slate-50 p-1 -ml-1 rounded-lg border border-transparent hover:border-slate-100 transition-all flex items-start gap-2"
                   >
                      <StickyNote size={14} className="mt-0.5 text-slate-400 flex-shrink-0" />
                      {todo.notes}
                   </div>
                )}
             </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity self-start">
          
          {/* Note Toggle Button */}
          <button
             onClick={() => {
                if (isNoteOpen) {
                   setIsNoteOpen(false);
                } else {
                   initNoteInput();
                   setIsNoteOpen(true);
                }
             }}
             className={`p-2 rounded-xl transition-colors ${
                (isNoteOpen || todo.notes) ? 'text-slate-600 bg-slate-100' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-50'
             }`}
             title={todo.notes ? "Edit Note" : "Add Note"}
          >
             <StickyNote size={18} fill={todo.notes ? "currentColor" : "none"} className={todo.notes ? "opacity-20" : ""} />
          </button>

          {/* Tag Button */}
          <div className="relative">
            <button
              onClick={() => {
                initTagInput();
                setIsTagInputOpen(!isTagInputOpen);
                setIsMoveMenuOpen(false);
                setIsNoteOpen(false);
              }}
              className={`p-2 rounded-xl transition-colors ${
                 isTagInputOpen ? 'text-slate-600 bg-slate-100' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title="Add Tag"
            >
              <Tag size={18} />
            </button>

            {isTagInputOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => handleTagSubmit()} 
                />
                <div className="absolute right-0 top-10 z-30 w-56 bg-white rounded-xl shadow-xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-100">
                  <form onSubmit={handleTagSubmit}>
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Enter tags..."
                      className="w-full px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder-slate-400"
                    />
                    <div className="text-[10px] text-slate-400 mt-1 px-1">
                      Separate tags with commas
                    </div>
                    <div className="flex justify-end mt-2 gap-1">
                       <button
                          type="button"
                          onClick={() => {
                            onUpdateTag(todo.id, []);
                            setIsTagInputOpen(false);
                          }}
                          className="px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50 rounded"
                       >
                         Clear
                       </button>
                       <button
                          type="submit"
                          className="px-2 py-1 text-xs font-medium text-white bg-slate-800 hover:bg-slate-700 rounded"
                       >
                         Save
                       </button>
                    </div>
                  </form>
                </div>
              </>
            )}
          </div>

          {/* Add to My Day Toggle */}
          <button
            onClick={() => onToggleMyDay(todo.id)}
            className={`p-2 rounded-xl transition-colors ${
              todo.isMyDay ? 'text-rose-500 bg-rose-50' : 'text-slate-300 hover:text-rose-500 hover:bg-slate-50'
            }`}
            title={todo.isMyDay ? "Remove from My Day" : "Add to My Day"}
          >
            <Sun size={18} fill={todo.isMyDay ? "currentColor" : "none"} />
          </button>

          {/* Importance Toggle */}
          <button
            onClick={() => onToggleImportant(todo.id)}
            className={`p-2 rounded-xl transition-colors ${
              todo.isImportant ? 'text-amber-400 bg-amber-50' : 'text-slate-300 hover:text-amber-400 hover:bg-slate-50'
            }`}
            title="Toggle Importance"
          >
            <Star size={18} fill={todo.isImportant ? "currentColor" : "none"} />
          </button>

          {/* Move to List Dropdown Trigger */}
          <div className="relative">
            <button
              onClick={() => {
                setIsMoveMenuOpen(!isMoveMenuOpen);
                setIsTagInputOpen(false);
                setIsNoteOpen(false);
              }}
              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
              title="Move to another list"
            >
              <ArrowRightLeft size={18} />
            </button>
            
            {isMoveMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-20" 
                  onClick={() => setIsMoveMenuOpen(false)} 
                />
                <div className="absolute right-0 top-10 z-30 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                    Move to...
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {allLists
                      .filter((l) => l.id !== todo.listId)
                      .map((list) => (
                        <button
                          key={list.id}
                          onClick={() => {
                            onMoveToList(todo.id, list.id);
                            setIsMoveMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-2"
                        >
                           <span className={`w-2 h-2 rounded-full bg-${list.color}-500`} />
                           {list.name}
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={() => onDelete(todo.id)}
            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
            title="Delete"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Expanded Metadata Section */}
      <div className="overflow-hidden max-h-0 group-hover:max-h-24 transition-all duration-300 ease-in-out">
        <div className="pl-14 pr-4 pb-3 pt-1 text-xs text-slate-400 space-y-1.5">
          {/* Created Time */}
          <div className="flex items-center gap-2">
            <Calendar size={12} className="text-slate-400" />
            <span className="font-semibold text-slate-500">Created:</span>
            <span>{formatDate(todo.createdAt || Date.now())}</span>
          </div>
          
          {todo.completed ? (
            /* Completed Time */
            <div className="flex items-center gap-2">
              <Check size={12} className="text-emerald-500" />
              <span className="font-semibold text-emerald-600">Completed:</span>
              <span className="text-emerald-600">
                {todo.completedAt ? formatDate(todo.completedAt) : 'Just now'}
              </span>
            </div>
          ) : (
            /* Elapsed Time */
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-slate-400" />
              <span className="font-semibold text-slate-500">Active:</span>
              <span>{getElapsed(todo.createdAt || Date.now())}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};