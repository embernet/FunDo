import React, { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Star, Trash2, ArrowRightLeft, Tag } from 'lucide-react';
import { Todo, TodoList, ThemeConfig } from '../types';

interface TodoItemProps {
  todo: Todo;
  theme: ThemeConfig;
  allLists: TodoList[];
  isSortable: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleImportant: (id: string) => void;
  onMoveToList: (todoId: string, newListId: string) => void;
  onUpdateTag: (todoId: string, tag: string) => void;
}

const formatDate = (ts?: number) => {
  if (!ts) return '';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(ts));
};

const getDuration = (start?: number, end?: number) => {
    if (!start) return '';
    const endDate = end || Date.now();
    const diffMs = endDate - start;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '0 days';
    if (diffDays === 1) return '1 day';
    return `${diffDays} days`;
};

export const TodoItem: React.FC<TodoItemProps> = ({
  todo,
  theme,
  allLists,
  isSortable,
  onToggle,
  onDelete,
  onToggleImportant,
  onMoveToList,
  onUpdateTag,
}) => {
  const [isMoveMenuOpen, setIsMoveMenuOpen] = useState(false);
  const [isTagInputOpen, setIsTagInputOpen] = useState(false);
  const [tagInput, setTagInput] = useState(todo.tag || '');
  const tagInputRef = useRef<HTMLInputElement>(null);

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

  const handleTagSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onUpdateTag(todo.id, tagInput.trim());
    setIsTagInputOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 transition-all hover:shadow-md ${
        todo.completed ? 'opacity-60 hover:opacity-100 bg-slate-50' : ''
      }`}
    >
      <div className="flex items-center gap-3 p-3 w-full">
        {/* Drag Handle - Only visible if sortable */}
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

        {/* Checkbox */}
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

        {/* Text and Tag */}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <span
            className={`truncate text-lg font-medium transition-all ${
              todo.completed ? 'text-slate-400 line-through' : 'text-slate-700'
            }`}
          >
            {todo.text}
          </span>
          
          {todo.tag && (
            <span 
              onClick={() => {
                 setTagInput(todo.tag || '');
                 setIsTagInputOpen(true);
              }}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 cursor-pointer hover:bg-slate-200"
            >
              #{todo.tag}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          
          {/* Tag Button */}
          <div className="relative">
            <button
              onClick={() => {
                setTagInput(todo.tag || '');
                setIsTagInputOpen(!isTagInputOpen);
                setIsMoveMenuOpen(false);
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
                <div className="absolute right-0 top-10 z-30 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-2 animate-in fade-in zoom-in-95 duration-100">
                  <form onSubmit={handleTagSubmit}>
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      placeholder="Enter tag..."
                      className="w-full px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 placeholder-slate-400"
                    />
                    <div className="flex justify-end mt-2 gap-1">
                       <button
                          type="button"
                          onClick={() => {
                            onUpdateTag(todo.id, '');
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
      {todo.createdAt && (
        <div className="overflow-hidden max-h-0 group-hover:max-h-24 transition-all duration-300 ease-in-out">
          <div className="pl-14 pr-3 pb-3 text-xs text-slate-400 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Created:</span>
              <span>{formatDate(todo.createdAt)}</span>
              <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border border-slate-200">
                {todo.completed ? 'Time Taken' : 'Age'}: {getDuration(todo.createdAt, todo.completedAt)}
              </span>
            </div>
            {todo.completed && todo.completedAt && (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Completed:</span>
                <span>{formatDate(todo.completedAt)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};