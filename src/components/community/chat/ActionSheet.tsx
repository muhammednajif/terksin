import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TablerIcon } from '@tabler/icons-react';

interface ActionItem {
  icon: TablerIcon;
  label: string;
  color?: string;
  onClick: () => void;
}

interface ActionSection {
  title: string;
  emoji: string;
  items: ActionItem[];
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  sections: ActionSection[];
}

export function ActionSheet({ isOpen, onClose, sections }: ActionSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onClose}
          />
          <motion.div
            ref={sheetRef}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full left-0 mb-2 w-[340px] max-h-[420px] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-black/8 z-50"
          >
            <div className="p-3 space-y-3">
              {sections.map((section) => (
                <div key={section.title}>
                  <div className="flex items-center gap-1.5 px-1 mb-1.5">
                    <span className="text-xs">{section.emoji}</span>
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{section.title}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={() => { item.onClick(); onClose(); }}
                          className="flex flex-col items-center gap-1 p-2.5 rounded-xl hover:bg-black/5 active:bg-black/10 transition-colors"
                        >
                          <Icon className="w-5 h-5" style={{ color: item.color || '#6b7280' }} />
                          <span className="text-[9px] font-medium text-gray-500 text-center leading-tight">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
