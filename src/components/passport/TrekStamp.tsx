import { motion } from 'framer-motion';
import { MapPin, Calendar, Mountain, Route, Star, Award } from 'lucide-react';
import type { PassportStamp } from '@/lib/passport';

interface TrekStampProps {
  stamp: PassportStamp;
  index?: number;
}

export function TrekStamp({ stamp, index = 0 }: TrekStampProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative group"
    >
      <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-gradient-to-br from-white to-gray-50 p-4 hover:shadow-lg transition-all duration-300">
        {/* Decorative circle */}
        <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full border-8 border-brand-emerald/5" />

        <div className="flex items-start gap-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-emerald to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-brand-emerald/20">
            <Award className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold">{stamp.trek_name}</h3>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
              <Calendar className="w-3 h-3" />
              {new Date(stamp.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              <span className="mx-1">·</span>
              <Award className="w-3 h-3" />
              +{stamp.xp_earned} XP
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              {stamp.difficulty && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-emerald/10 text-brand-emerald font-medium capitalize">
                  {stamp.difficulty}
                </span>
              )}
              {stamp.distance_km && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  {stamp.distance_km}km
                </span>
              )}
              {stamp.location && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> {stamp.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Completed badge */}
        <div className="absolute top-3 right-3">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
