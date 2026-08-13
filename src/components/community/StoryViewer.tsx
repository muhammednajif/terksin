/* eslint-disable react-hooks/exhaustive-deps, react-hooks/preserve-manual-memoization */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { viewStory, deleteStory } from '@/lib/community';
import type { StoryWithAuthor } from '@/lib/database.types';

interface StoryViewerProps {
  stories: StoryWithAuthor[];
  initialIndex: number;
  userId?: string;
  onClose: () => void;
  onUpdate: () => void;
}

export const StoryViewer = ({ stories, initialIndex, userId, onClose, onUpdate }: StoryViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const current = stories[currentIndex];
  const duration = current?.media_type === 'video' ? 15000 : 5000;

  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) { setCurrentIndex(i => i + 1); setProgress(0); }
    else onClose();
  }, [currentIndex, stories.length, onClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) { setCurrentIndex(i => i - 1); setProgress(0); }
  }, [currentIndex]);

  useEffect(() => { if (current) viewStory(current.id).catch(() => {}); }, [current?.id]);

  useEffect(() => {
    if (!current || paused) return;
    const interval = 50;
    const step = (interval / duration) * 100;
    const timer = setInterval(() => {
      setProgress(p => {
        const next = p + step;
        if (next >= 100) {
          clearInterval(timer);
          goNext();
          return 0;
        }
        return next;
      });
    }, interval);
    return () => clearInterval(timer);
  }, [currentIndex, paused]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentIndex]);

  if (!current) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 text-white hover:bg-white/30"><X className="w-6 h-6" /></button>
          {userId && current.user_id === userId && (
          <button onClick={async () => { await deleteStory(current.id); onClose(); onUpdate(); }}
            className="absolute top-4 right-16 z-10 p-2 rounded-full bg-white/20 text-white hover:bg-red-500/60"><Trash2 className="w-5 h-5" /></button>
        )}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-lg aspect-[9/16] mx-4 rounded-2xl overflow-hidden"
          onMouseDown={() => setPaused(true)} onMouseUp={() => setPaused(false)} onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)}>
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
            {stories.map((_, i) => (
              <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-100" style={{
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%'
                }} />
              </div>
            ))}
          </div>
          <div className="absolute top-8 left-4 z-10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">
              {current.author?.display_name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{current.author?.display_name || 'User'}</p>
              <p className="text-white/60 text-xs">{timeAgo(current.created_at)}</p>
            </div>
          </div>
          {current.media_type === 'video' ? (
            <video src={current.media_url} autoPlay playsInline className="w-full h-full object-cover" />
          ) : (
            <img src={current.media_url} alt="" className="w-full h-full object-cover" />
          )}
          {current.caption && (
            <div className="absolute bottom-20 left-4 right-4 z-10">
              <p className="text-white text-sm">{current.caption}</p>
            </div>
          )}
          <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center gap-3">
            <input type="text" placeholder="Send message..." className="flex-1 px-4 py-2.5 bg-white/20 border border-white/30 rounded-full text-white text-sm placeholder:text-white/50 focus:outline-none" />
            <button className="p-2.5 rounded-full bg-white/20 text-white hover:bg-white/30"><Heart className="w-5 h-5" /></button>
          </div>
          <button onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 opacity-80">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 opacity-80">
            <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
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