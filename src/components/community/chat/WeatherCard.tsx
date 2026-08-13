import { motion } from 'framer-motion';
import { IconSun, IconCloudRain, IconSnowflake, IconCloud, IconCloudFog, IconSunrise, IconSunset, IconDroplet, IconWind, IconEye } from '@tabler/icons-react';

interface WeatherCardProps {
  temp: number;
  condition: string;
  sunrise: string;
  sunset: string;
  rainProb: number;
  windSpeed: number;
  visibility: number;
  location?: string;
}

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sun')) return IconSun;
  if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder')) return IconCloudRain;
  if (c.includes('snow') || c.includes('sleet')) return IconSnowflake;
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return IconCloudFog;
  return IconCloud;
}

function getGradient(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sun')) return 'from-sky-400 to-blue-600';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder')) return 'from-slate-500 to-gray-700';
  if (c.includes('snow') || c.includes('sleet')) return 'from-blue-100 to-blue-300';
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return 'from-gray-300 to-gray-500';
  if (c.includes('cloud') || c.includes('overcast')) return 'from-gray-400 to-gray-600';
  return 'from-sky-400 to-blue-600';
}

function formatTime(iso: string): string {
  if (!iso) return '--:--';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function WeatherCard({ temp, condition, sunrise, sunset, rainProb, windSpeed, visibility, location }: WeatherCardProps) {
  const Icon = getWeatherIcon(condition);
  const gradient = getGradient(condition);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg`}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {location && <p className="text-xs font-medium text-white/70">{location}</p>}
          <p className="text-4xl font-bold tracking-tight">{Math.round(temp)}°</p>
          <p className="text-sm font-medium text-white/80 mt-0.5">{condition}</p>
        </div>
        <Icon className="w-10 h-10 text-white/80" />
      </div>

      {/* Details */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <IconSunrise className="w-4 h-4 mx-auto mb-1 text-white/70" />
          <p className="text-xs font-semibold">{formatTime(sunrise)}</p>
          <p className="text-[10px] text-white/60">Sunrise</p>
        </div>
        <div className="text-center">
          <IconSunset className="w-4 h-4 mx-auto mb-1 text-white/70" />
          <p className="text-xs font-semibold">{formatTime(sunset)}</p>
          <p className="text-[10px] text-white/60">Sunset</p>
        </div>
        <div className="text-center">
          <IconDroplet className="w-4 h-4 mx-auto mb-1 text-white/70" />
          <p className="text-xs font-semibold">{rainProb}%</p>
          <p className="text-[10px] text-white/60">Rain</p>
        </div>
      </div>

      {/* Rain probability bar */}
      <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${rainProb}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full bg-white/60 rounded-full"
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/20">
        <div className="flex items-center gap-2">
          <IconWind className="w-4 h-4 text-white/70" />
          <div>
            <p className="text-sm font-semibold">{windSpeed} km/h</p>
            <p className="text-[10px] text-white/60">Wind</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconEye className="w-4 h-4 text-white/70" />
          <div>
            <p className="text-sm font-semibold">{(visibility / 1000).toFixed(1)} km</p>
            <p className="text-[10px] text-white/60">Visibility</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
