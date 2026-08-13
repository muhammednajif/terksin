import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { CheckCircle2 } from 'lucide-react';

export const Toast = () => {
  const toast = useStore((state) => state.toast);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          role="alert"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-brand-emerald/90 backdrop-blur-md text-black px-6 py-3 rounded-2xl shadow-2xl border border-black/20"
        >
           <CheckCircle2 className="w-5 h-5 text-black" />
          <span className="font-medium text-sm">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
