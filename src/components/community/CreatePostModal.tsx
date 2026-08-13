import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image, MapPin, Hash, Globe, Lock, Star, Mountain } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { createPost } from '@/lib/community';
import { cn } from '@/lib/utils';
import type { PostType, Difficulty } from '@/lib/database.types';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'Photo Post', label: 'Photo Post' },
  { value: 'Trek Experience', label: 'Trek Experience' },
  { value: 'Trek Story', label: 'Trek Story' },
  { value: 'Route Review', label: 'Route Review' },
  { value: 'Safety Update', label: 'Safety Update' },
  { value: 'Achievement', label: 'Achievement' },
];

const DIFFICULTIES: Difficulty[] = ['Easy', 'Moderate', 'Hard', 'Extreme'];

export const CreatePostModal = ({ isOpen, onClose, onSuccess }: CreatePostModalProps) => {
  const [postType, setPostType] = useState<PostType>('Photo Post');
  const [caption, setCaption] = useState('');
  const [trekLocation, setTrekLocation] = useState('');
  const [rating, setRating] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty | ''>('');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { requireAuth } = useAuth();
  const showToast = useStore(s => s.showToast);
  const userCoords = useStore(s => s.userCoords);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + mediaFiles.length > 5) {
      setError('Max 5 files allowed');
      return;
    }
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    setMediaFiles(prev => [...prev, ...validFiles]);
    validFiles.forEach(f => {
      const url = URL.createObjectURL(f);
      setMediaPreviews(prev => [...prev, url]);
    });
  };

  const removeMedia = (idx: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== idx));
    setMediaPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const addHashtag = () => {
    const tag = hashtagInput.replace('#', '').trim();
    if (tag && !hashtags.includes(tag)) {
      setHashtags(prev => [...prev, tag]);
      setHashtagInput('');
    }
  };

  const handleSubmit = async () => {
    if (!requireAuth()) return;
    if (!caption.trim() && mediaFiles.length === 0) {
      setError('Add a caption or photo');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      await createPost({
        post_type: postType,
        caption: caption.trim() || undefined,
        trek_location: trekLocation.trim() || undefined,
        rating: rating || undefined,
        difficulty: (difficulty as Difficulty) || undefined,
        distance_km: distance ? parseFloat(distance) : undefined,
        duration_hours: duration ? parseFloat(duration) : undefined,
        visibility,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
        latitude: userCoords?.latitude,
        longitude: userCoords?.longitude,
      });
      showToast('Post created!');
      onSuccess();
      onClose();
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create post');
    }
    setUploading(false);
  };

  const resetForm = () => {
    setPostType('Photo Post');
    setCaption('');
    setTrekLocation('');
    setRating(0);
    setDifficulty('');
    setDistance('');
    setDuration('');
    setVisibility('public');
    setHashtagInput('');
    setHashtags([]);
    setMediaFiles([]);
    mediaPreviews.forEach(u => URL.revokeObjectURL(u));
    setMediaPreviews([]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-black/10">
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 border-b border-black/10">
            <h2 className="text-lg font-bold">Create Post</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Post Type */}
            <div>
              <label className="text-xs font-semibold text-black/50 uppercase tracking-wider mb-2 block">Post Type</label>
              <div className="flex flex-wrap gap-2">
                {POST_TYPES.map(pt => (
                  <button key={pt.value} onClick={() => setPostType(pt.value)}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      postType === pt.value ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/30' : 'bg-black/5 text-black/60 border-black/10 hover:border-black/20'
                    )}>
                    {pt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption */}
            <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={3} maxLength={2000}
              placeholder="Share your adventure..."
              className="w-full px-4 py-3 bg-black/5 border border-black/10 rounded-xl text-sm resize-none focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30" />

            {/* Media Upload */}
            <div>
              <div className="flex items-center gap-3">
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-black/5 border border-dashed border-black/20 rounded-xl text-sm font-medium text-black/60 hover:text-black hover:border-black/40 transition-all">
                  <Image className="w-4 h-4" /> Add Photos/Videos
                </button>
                <span className="text-xs text-black/40">{mediaFiles.length}/5 files</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />
              {mediaPreviews.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {mediaPreviews.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-black/10 group">
                      {mediaFiles[i]?.type.startsWith('video/') ? (
                        <video src={url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={url} className="w-full h-full object-cover" />
                      )}
                      <button onClick={() => removeMedia(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location */}
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
              <input type="text" value={trekLocation} onChange={e => setTrekLocation(e.target.value)}
                placeholder="Trek location (optional)"
                className="w-full pl-11 pr-4 py-3 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30" />
              {userCoords && !trekLocation && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-emerald font-medium">auto</span>
              )}
            </div>

            {/* Rating + Difficulty + Distance + Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-black/50 mb-1 block">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} onClick={() => setRating(s)}>
                      <Star className={`w-5 h-5 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-black/20'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-black/50 mb-1 block">Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}
                  className="w-full px-3 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none">
                  <option value="">Any</option>
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-black/50 mb-1 block">Distance (km)</label>
                <input type="number" value={distance} onChange={e => setDistance(e.target.value)} min="0" step="0.1"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-black/50 mb-1 block">Duration (hrs)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min="0" step="0.5"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none" />
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <label className="text-xs font-semibold text-black/50 mb-1 block">Hashtags</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
                  <input type="text" value={hashtagInput} onChange={e => setHashtagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
                    placeholder="Add hashtag"
                    className="w-full pl-9 pr-4 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none" />
                </div>
                <button onClick={addHashtag} className="px-3 py-2 bg-black/10 rounded-xl text-sm font-medium hover:bg-black/20 transition-colors">Add</button>
              </div>
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {hashtags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-brand-emerald/10 text-brand-emerald rounded-full text-xs font-medium">
                      #{tag}
                      <button onClick={() => setHashtags(prev => prev.filter(t => t !== tag))} className="hover:text-red-500">&times;</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-3">
              <button onClick={() => setVisibility(visibility === 'public' ? 'private' : 'public')}
                className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
                  visibility === 'public' ? 'bg-brand-emerald/10 text-brand-emerald border-brand-emerald/30' : 'bg-black/5 text-black/60 border-black/10'
                )}>
                {visibility === 'public' ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                {visibility === 'public' ? 'Public' : 'Private'}
              </button>
              <Mountain className="w-4 h-4 text-black/30 ml-auto" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-white border-t border-black/10 p-4 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-black/10 rounded-xl text-sm font-medium hover:bg-black/5 transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={uploading}
              className="flex-1 py-3 bg-brand-emerald text-white rounded-xl text-sm font-semibold hover:bg-brand-emerald/90 transition-all disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Post'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
