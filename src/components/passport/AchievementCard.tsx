import { motion } from 'framer-motion';
import { Award, Mountain, Calendar, Footprints, ArrowUpFromLine, Moon, Globe, Triangle, Trees, Lock } from 'lucide-react';
import type { AchievementDefinition, UserAchievement } from '@/lib/passport';

interface AchievementCardProps {
  achievement: AchievementDefinition;
  unlocked?: UserAchievement | null;
  index?: number;
}

const iconMap: Record<string, any> = {
  Mountain, Calendar, Footprints, ArrowUpFromLine, Moon, Globe, Triangle, Trees, Award, Lock,
};

export function AchievementCard({ achievement, unlocked, index = 0 }: AchievementCardProps) {
  const Icon = iconMap[achievement.icon || ''] || Award;
  const isUnlocked = !!unlocked;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03 }}
      className={`relative overflow-hidden rounded-xl border p-4 transition-all duration-300 ${
        isUnlocked ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200' : 'bg-white border-black/5 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isUnlocked ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-200' : 'bg-black/5'
        }`}>
          {isUnlocked ? (
            <Icon className="w-5 h-5 text-white" />
          ) : (
            <Lock className="w-4 h-4 text-gray-300" />
          )}
        </div>
        <div>
          <p className={`text-sm font-semibold ${isUnlocked ? 'text-amber-900' : ''}`}>{achievement.name}</p>
          <p className="text-[10px] text-muted-foreground">{achievement.description || 'Achievement'}</p>
          {isUnlocked && unlocked?.unlocked_at && (
            <p className="text-[8px] text-amber-600/60 mt-0.5">
              Unlocked {new Date(unlocked.unlocked_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
