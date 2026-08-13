import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconCampfire, IconDroplet, IconAlertTriangle, IconParking, IconMountain, IconToolsKitchen2, IconHeartbeat, IconEye, IconFlag, IconRipple, IconX } from '@tabler/icons-react';
import type { ChatWaypoint } from '@/lib/database.types';

interface WaypointPickerProps {
  onSelect: (type: ChatWaypoint['waypoint_type'], title?: string, description?: string) => void;
  onClose: () => void;
}

const WAYPOINT_TYPES: { type: ChatWaypoint['waypoint_type']; icon: React.ComponentType<any>; label: string; color: string }[] = [
  { type: 'camp', icon: IconCampfire, label: 'Camp', color: 'from-orange-400 to-orange-600' },
  { type: 'water_source', icon: IconDroplet, label: 'Water Source', color: 'from-blue-400 to-blue-600' },
  { type: 'danger', icon: IconAlertTriangle, label: 'Danger', color: 'from-red-400 to-red-600' },
  { type: 'parking', icon: IconParking, label: 'Parking', color: 'from-gray-400 to-gray-600' },
  { type: 'peak', icon: IconMountain, label: 'Peak', color: 'from-emerald-400 to-emerald-600' },
  { type: 'food', icon: IconToolsKitchen2, label: 'Food', color: 'from-yellow-400 to-yellow-600' },
  { type: 'emergency_point', icon: IconHeartbeat, label: 'Emergency', color: 'from-red-500 to-red-700' },
  { type: 'viewpoint', icon: IconEye, label: 'Viewpoint', color: 'from-purple-400 to-purple-600' },
  { type: 'summit', icon: IconFlag, label: 'Summit', color: 'from-amber-400 to-amber-600' },
  { type: 'lake', icon: IconRipple, label: 'Lake', color: 'from-cyan-400 to-cyan-600' },
];

export function WaypointPicker({ onSelect, onClose }: WaypointPickerProps) {
  const [selectedType, setSelectedType] = useState<ChatWaypoint['waypoint_type'] | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleTypeClick = (type: ChatWaypoint['waypoint_type']) => {
    setSelectedType(type);
  };

  const handleConfirm = () => {
    if (selectedType) {
      onSelect(selectedType, title || undefined, description || undefined);
    }
  };

  const handleBack = () => {
    setSelectedType(null);
    setTitle('');
    setDescription('');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">
            {selectedType ? 'Add Details' : 'Choose Waypoint Type'}
          </h3>
          <button onClick={selectedType ? handleBack : onClose} className="p-1.5 rounded-full hover:bg-black/5">
            {selectedType ? <IconX className="w-5 h-5" /> : <IconX className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!selectedType ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 gap-3"
            >
              {WAYPOINT_TYPES.map(({ type, icon: Icon, label, color }) => (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleTypeClick(type)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg hover:shadow-xl transition-shadow`}
                >
                  <Icon className="w-7 h-7" />
                  <span className="text-xs font-semibold">{label}</span>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-2">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 text-sm font-medium">
                  {(() => {
                    const w = WAYPOINT_TYPES.find(w => w.type === selectedType);
                    if (!w) return null;
                    const Icon = w.icon;
                    return <><Icon className="w-4 h-4" /> {w.label}</>;
                  })()}
                </span>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Title (optional)</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Great viewpoint"
                  className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Description (optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add some notes..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleBack} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-black/5 transition-colors">
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-emerald to-emerald-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-brand-emerald/30 transition-all active:scale-[0.98]"
                >
                  Add Waypoint
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
