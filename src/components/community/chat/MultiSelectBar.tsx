import { motion, AnimatePresence } from 'framer-motion';
import { IconTrash, IconArrowForward, IconBookmark, IconX } from '@tabler/icons-react';

interface MultiSelectBarProps {
  selectedCount: number;
  onDelete: () => void;
  onForward: () => void;
  onBookmark: () => void;
  onClear: () => void;
}

export function MultiSelectBar({ selectedCount, onDelete, onForward, onBookmark, onClear }: MultiSelectBarProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-black/10 px-4 py-3 flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700 min-w-[80px]">
              {selectedCount} selected
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-colors active:scale-95"
              >
                <IconTrash className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                onClick={onForward}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand-emerald hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition-colors active:scale-95"
              >
                <IconArrowForward className="w-3.5 h-3.5" /> Forward
              </button>
              <button
                onClick={onBookmark}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-colors active:scale-95"
              >
                <IconBookmark className="w-3.5 h-3.5" /> Bookmark
              </button>
            </div>

            <button
              onClick={onClear}
              className="p-2 rounded-full hover:bg-black/5 transition-colors ml-1"
            >
              <IconX className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
