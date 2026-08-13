import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Send, Trash2, X as XIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchComments, addComment, deleteComment, toggleCommentLike } from '@/lib/community';
import type { CommentWithAuthor } from '@/lib/database.types';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';

interface CommentsDrawerProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsDrawer = ({ postId, isOpen, onClose }: CommentsDrawerProps) => {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, requireAuth } = useAuth();
  const showToast = useStore(s => s.showToast);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && postId) {
      setComments([]);
      setPage(0);
    }
  }, [isOpen, postId]);

  useEffect(() => {
    if (isOpen && postId) {
      loadComments(0);
    }
  }, [isOpen, postId]);

  const loadComments = async (pg: number) => {
    setLoading(true);
    try {
      const result = await fetchComments(postId, pg);
      setComments(result.comments);
      setHasMore(result.hasMore);
    } catch { showToast('Failed to load comments'); }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    if (!requireAuth()) return;
    try {
      const comment = await addComment(postId, newComment.trim(), replyTo?.id);
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setReplyTo(null);
    } catch { showToast('Failed to post comment'); }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch { showToast('Failed to delete comment'); }
  };

  const handleLike = async (commentId: string) => {
    try {
      const { liked } = await toggleCommentLike(commentId);
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, liked_by_user: liked, like_count: c.like_count + (liked ? 1 : -1) } : c));
    } catch {}
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/community/profile/${userId}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 inset-x-0 z-50 max-h-[85vh] bg-white rounded-t-2xl shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-black/5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-brand-emerald rounded-full" />
                <h3 className="font-bold">Comments</h3>
                <span className="text-xs text-gray-400 font-medium">({comments.length})</span>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/10 transition-colors">
                <XIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Comments list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <button onClick={() => handleProfileClick(comment.user_id)} className="flex-shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-emerald/30 to-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700 overflow-hidden">
                      {comment.author?.avatar_url ? (
                        <img src={comment.author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        comment.author?.display_name?.charAt(0) || '?'
                      )}
                    </div>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleProfileClick(comment.user_id)} className="text-sm font-semibold hover:text-brand-emerald transition-colors">
                        {comment.author?.display_name || 'User'}
                      </button>
                      <span className="text-[10px] text-gray-400 font-medium">{timeAgo(comment.created_at)}</span>
                    </div>
                    <p className="text-sm mt-0.5 text-gray-700 leading-relaxed">{comment.content}</p>
                    <div className="flex items-center gap-4 mt-1.5">
                      <button onClick={() => handleLike(comment.id)} className={`flex items-center gap-1 text-xs font-medium ${comment.liked_by_user ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 transition-colors`}>
                        <Heart className={`w-3.5 h-3.5 ${comment.liked_by_user ? 'fill-current' : ''}`} />
                        {comment.like_count > 0 && comment.like_count}
                      </button>
                      <button onClick={() => { setReplyTo({ id: comment.id, name: comment.author?.display_name || 'User' }); inputRef.current?.focus(); }}
                        className="text-xs font-medium text-gray-400 hover:text-brand-emerald transition-colors">
                        Reply
                      </button>
                      {comment.reply_count > 0 && (
                        <span className="text-xs text-gray-400">{comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}</span>
                      )}
                      {user?.id === comment.user_id && (
                        <button onClick={() => handleDelete(comment.id)} className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-auto">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Replies */}
                    {comment.replies?.map(reply => (
                      <div key={reply.id} className="ml-2 mt-3 pl-3 border-l-2 border-black/5 flex gap-2">
                        <button onClick={() => handleProfileClick(reply.user_id)} className="flex-shrink-0 mt-0.5">
                          <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center text-[9px] font-bold overflow-hidden">
                            {reply.author?.avatar_url ? (
                              <img src={reply.author.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              reply.author?.display_name?.charAt(0) || '?'
                            )}
                          </div>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleProfileClick(reply.user_id)} className="text-xs font-semibold hover:text-brand-emerald transition-colors">
                              {reply.author?.display_name || 'User'}
                            </button>
                            <span className="text-[9px] text-gray-400">{timeAgo(reply.created_at)}</span>
                          </div>
                          <p className="text-xs mt-0.5 text-gray-600">{reply.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!loading && hasMore && (
                <button onClick={() => loadComments(page + 1)} className="w-full text-sm text-brand-emerald font-medium py-2 hover:underline">
                  Load more comments
                </button>
              )}
              {comments.length === 0 && !loading && (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Heart className="w-5 h-5 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No comments yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Be the first to share your thoughts</p>
                </div>
              )}
            </div>

            {/* Reply indicator */}
            {replyTo && (
              <div className="px-5 py-2.5 bg-gray-50 border-t border-black/5 flex items-center gap-2 text-sm">
                <span className="text-gray-500">Replying to <strong className="text-gray-700">{replyTo.name}</strong></span>
                <button onClick={() => setReplyTo(null)} className="ml-auto p-1 rounded-full hover:bg-black/10 transition-colors">
                  <XIcon className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            )}

            {/* Input area */}
            <div className="px-5 py-3 border-t border-black/5 bg-white">
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={user ? 'Write a comment...' : 'Sign in to comment'}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="flex-1 px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20 transition-all"
                />
                <button onClick={handleSubmit} disabled={!newComment.trim() || !user}
                  className="p-2.5 bg-gradient-to-r from-brand-emerald to-emerald-500 text-white rounded-xl disabled:opacity-40 hover:shadow-lg hover:shadow-brand-emerald/30 transition-all active:scale-95">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

function timeAgo(date: string): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60); if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24); return `${d}d ago`;
}
