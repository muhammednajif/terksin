import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconAlertTriangle, IconBug, IconAlertCircle, IconMountain, IconFlood,
  IconRoadSign, IconBackpack, IconHeartbeat, IconLifebuoy, IconCampfire,
  IconDroplet, IconX, IconSend, IconMapPin,
} from '@tabler/icons-react';
import type { ChatTrailReport } from '@/lib/database.types';

interface TrailReportFormProps {
  onSend: (report: { type: ChatTrailReport['report_type']; severity: ChatTrailReport['severity']; description: string }) => void;
  onClose: () => void;
}

const REPORT_TYPES: { type: ChatTrailReport['report_type']; icon: React.ComponentType<any>; label: string; color: string }[] = [
  { type: 'trail_condition', icon: IconMountain, label: 'Trail Condition', color: 'from-emerald-400 to-emerald-600' },
  { type: 'wildlife_sighting', icon: IconBug, label: 'Wildlife Sighting', color: 'from-amber-400 to-amber-600' },
  { type: 'danger_alert', icon: IconAlertTriangle, label: 'Danger Alert', color: 'from-red-400 to-red-600' },
  { type: 'rockfall', icon: IconMountain, label: 'Rockfall', color: 'from-orange-400 to-orange-600' },
  { type: 'flood_warning', icon: IconFlood, label: 'Flood Warning', color: 'from-blue-400 to-blue-600' },
  { type: 'trail_closure', icon: IconRoadSign, label: 'Trail Closure', color: 'from-red-500 to-red-700' },
  { type: 'lost_equipment', icon: IconBackpack, label: 'Lost Equipment', color: 'from-yellow-400 to-yellow-600' },
  { type: 'medical_assistance', icon: IconHeartbeat, label: 'Medical Assistance', color: 'from-red-400 to-rose-600' },
  { type: 'nearby_rescue', icon: IconLifebuoy, label: 'Nearby Rescue', color: 'from-blue-500 to-blue-700' },
  { type: 'camp_availability', icon: IconCampfire, label: 'Camp Availability', color: 'from-orange-400 to-orange-600' },
  { type: 'water_source_update', icon: IconDroplet, label: 'Water Source', color: 'from-cyan-400 to-cyan-600' },
];

const SEVERITIES: { value: ChatTrailReport['severity']; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-emerald-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-600' },
];

export function TrailReportForm({ onSend, onClose }: TrailReportFormProps) {
  const [selectedType, setSelectedType] = useState<ChatTrailReport['report_type'] | null>(null);
  const [severity, setSeverity] = useState<ChatTrailReport['severity']>('low');
  const [description, setDescription] = useState('');
  const [locationDetected, setLocationDetected] = useState(false);

  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationDetected(true),
        () => setLocationDetected(false)
      );
    }
  };

  const handleSubmit = () => {
    if (!selectedType || !description.trim()) return;
    onSend({ type: selectedType, severity, description: description.trim() });
  };

  const canSubmit = !!selectedType && description.trim().length > 0;

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
        className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Submit Trail Report</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Report type grid */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Report Type</label>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_TYPES.map(({ type, icon: Icon, label, color }) => (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium transition-all ${
                    selectedType === type
                      ? `bg-gradient-to-r ${color} text-white shadow-md`
                      : 'bg-black/5 text-gray-700 hover:bg-black/10'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Severity selector */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-2 block">Severity</label>
            <div className="flex gap-2">
              {SEVERITIES.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => setSeverity(value)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    severity === value
                      ? `${color} text-white shadow-md`
                      : 'bg-black/5 text-gray-500 hover:bg-black/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the situation..."
              rows={4}
              className="w-full px-4 py-3 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/20 resize-none"
            />
          </div>

          {/* Location indicator */}
          <div className="flex items-center justify-between bg-black/5 rounded-xl px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <IconMapPin className={`w-4 h-4 ${locationDetected ? 'text-brand-emerald' : 'text-gray-400'}`} />
              <span className={locationDetected ? 'text-brand-emerald font-medium' : 'text-gray-500'}>
                {locationDetected ? 'Location detected' : 'Location not detected'}
              </span>
            </div>
            {!locationDetected && (
              <button onClick={handleDetectLocation} className="text-xs text-brand-emerald font-semibold hover:underline">
                Detect
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-black/10 text-sm font-medium hover:bg-black/5 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-brand-emerald to-emerald-500 text-white text-sm font-semibold hover:shadow-lg disabled:opacity-40 disabled:hover:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <IconSend className="w-4 h-4" /> Submit Report
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
