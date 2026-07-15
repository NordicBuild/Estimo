import React, { useState } from 'react';
import { Comment } from '../../ffu/hooks/useDocumentComments';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { User, Check, Reply, Trash2, MoreVertical } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';

interface CommentThreadProps {
  comment: Comment;
  onReply: (parentId: string, content: string) => Promise<void>;
  onResolve: (commentId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentThread({ comment, onReply, onResolve, onDelete }: CommentThreadProps) {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwner = user?.id === comment.author_id;

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onReply(comment.id, replyText);
      setReplyText('');
      setIsReplying(false);
    } catch (error) {
      console.error('Failed to reply:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex flex-col space-y-3 ${comment.parent_comment_id ? 'ml-8 mt-3' : 'mb-6'}`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
          {comment.profiles?.avatar_url ? (
            <img src={comment.profiles.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
          ) : (
            comment.profiles?.first_name?.[0] || <User className="w-4 h-4" />
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900">
                {comment.profiles?.first_name} {comment.profiles?.last_name}
              </span>
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: sv })}
              </span>
              {comment.resolved && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                  <Check className="w-3 h-3" />
                  Löst
                </span>
              )}
            </div>

            {/* Options Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowOptions(!showOptions)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showOptions && (
                <div className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 z-10 py-1">
                  {!comment.resolved && !comment.parent_comment_id && (
                    <button 
                      onClick={() => { onResolve(comment.id); setShowOptions(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Markera som löst
                    </button>
                  )}
                  {isOwner && (
                    <button 
                      onClick={() => { onDelete(comment.id); setShowOptions(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Ta bort
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
            {comment.content}
          </div>

          {!comment.resolved && !comment.parent_comment_id && (
            <div className="mt-2 flex items-center gap-4">
              <button 
                onClick={() => setIsReplying(!isReplying)}
                className="text-xs font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 transition-colors"
              >
                <Reply className="w-3 h-3" />
                Svara
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Reply Input */}
      {isReplying && (
        <div className="ml-11 mt-2">
          <form onSubmit={handleReplySubmit} className="flex gap-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Skriv ett svar..."
              className="flex-1 text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-1.5"
              disabled={isSubmitting}
            />
            <button 
              type="submit" 
              disabled={!replyText.trim() || isSubmitting}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Svara
            </button>
            <button 
              type="button" 
              onClick={() => setIsReplying(false)}
              className="px-3 py-1.5 text-gray-600 text-sm rounded hover:bg-gray-100"
            >
              Avbryt
            </button>
          </form>
        </div>
      )}

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-1">
          {comment.replies.map(reply => (
            <CommentThread
              key={reply.id}
              comment={reply}
              onReply={onReply}
              onResolve={onResolve}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
