import React, { useState } from 'react';
import { useDocumentComments } from '../../ffu/hooks/useDocumentComments';
import { CommentThread } from './CommentThread';
import { MessageSquare, Send, X } from 'lucide-react';

interface DocumentCommentsProps {
  documentId: string;
  onClose?: () => void;
}

export function DocumentComments({ documentId, onClose }: DocumentCommentsProps) {
  const { comments, isLoading, error, addComment, resolveComment, deleteComment } = useDocumentComments(documentId);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(newComment);
      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    await addComment(content, parentId);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80 shadow-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-gray-500" />
          Kommentarer
        </h3>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading && <div className="text-sm text-gray-500 animate-pulse text-center mt-4">Laddar kommentarer...</div>}
        {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded">{error}</div>}
        
        {!isLoading && comments.length === 0 && !error && (
          <div className="text-center text-sm text-gray-500 mt-8">
            Inga kommentarer än. Bli den första att kommentera!
          </div>
        )}

        <div className="space-y-2">
          {comments.map(comment => (
            <CommentThread
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onResolve={resolveComment}
              onDelete={deleteComment}
            />
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Skriv en kommentar..."
            className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 resize-none h-10 min-h-[40px] max-h-32"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="mt-2 text-[10px] text-gray-400 text-center">
          Tryck Enter för att skicka, Shift+Enter för ny rad
        </div>
      </div>
    </div>
  );
}
