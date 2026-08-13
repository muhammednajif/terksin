/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion';
import { MapPin, Star, Clock, DollarSign, TrendingUp, Navigation, Award, Shield, Thermometer } from 'lucide-react';

interface PlanCardProps {
  trek: any;
  index: number;
  onSelect?: () => void;
}

export const PlanCard = ({ trek, index, onSelect }: PlanCardProps) => {
  const labels = ['Best Overall Match', 'Best Budget Choice', 'Best Scenic Choice'];
  const label = labels[index] || `Option ${index + 1}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-2xl border border-black/10 bg-white overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
      onClick={onSelect}
    >
      <div className="relative h-40 bg-gradient-to-br from-brand-emerald/20 to-emerald-100">
        <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-xs font-semibold text-brand-emerald shadow-sm">
          {label}
        </div>
        {trek.matchScore > 0 && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/90 backdrop-blur text-xs font-semibold shadow-sm flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-brand-emerald" />
            Match: {trek.matchScore}%
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <h3 className="text-lg font-bold text-white drop-shadow-lg">{trek.title}</h3>
            <p className="text-xs text-white/80 drop-shadow flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {trek.location}
            </p>
          </div>
          <div className="flex items-center gap-1 text-white drop-shadow-lg">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-bold">{trek.rating}</span>
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-full bg-brand-emerald/10 text-brand-emerald text-xs font-medium">{trek.difficulty}</span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-medium flex items-center gap-1">
            <Navigation className="w-3 h-3" /> {trek.distance}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> {trek.duration}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 text-xs font-medium flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> ₹{trek.price}
          </span>
        </div>

        {trek.matchReason && (
          <p className="text-xs text-muted-foreground leading-relaxed">{trek.matchReason}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-black/5">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium">{trek.dataStatus || 'verified'}</span>
            {trek.elevation && <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {trek.elevation}</span>}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
            className="px-4 py-1.5 bg-brand-emerald text-white rounded-full text-xs font-medium hover:bg-brand-emerald/90 transition-colors"
          >
            Select
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const WeatherCard = ({ weather }: { weather: any }) => {
  if (!weather?.available) return null;
  const { current } = weather;
  return (
    <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold flex items-center gap-1"><Thermometer className="w-4 h-4 text-blue-500" /> Weather</span>
        <span className="text-[10px] text-blue-400">{new Date(weather.fetchedAt).toLocaleTimeString()}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>Max: <strong>{current.maxTemp}°C</strong></div>
        <div>Min: <strong>{current.minTemp}°C</strong></div>
        <div>Rain: <strong>{current.rainProb ?? current.precipitation}%</strong></div>
        <div>Wind: <strong>{current.windSpeed} km/h</strong></div>
        <div>Sunrise: <strong>{current.sunrise?.split('T')[1]?.slice(0, 5) || 'N/A'}</strong></div>
        <div>Sunset: <strong>{current.sunset?.split('T')[1]?.slice(0, 5) || 'N/A'}</strong></div>
      </div>
    </div>
  );
};

export const BudgetCard = ({ budget }: { budget: any }) => {
  if (!budget) return null;
  return (
    <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-1"><DollarSign className="w-4 h-4 text-emerald-500" /> Budget Breakdown</h4>
      <div className="space-y-2 text-xs">
        {Object.entries(budget.perPerson || {}).map(([key, val]) => (
          <div key={key} className="flex items-center justify-between">
            <span className="capitalize text-muted-foreground">{key}</span>
            <span className="font-semibold">₹{val as number}</span>
          </div>
        ))}
        <div className="border-t border-emerald-200 pt-2 mt-2">
          <div className="flex items-center justify-between font-semibold">
            <span>Per Person</span>
            <span>₹{budget.totalPerPerson}</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-brand-emerald">
            <span>Total ({budget.travelers} people)</span>
            <span>₹{budget.totalGroup}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">{budget.note}</p>
      </div>
    </div>
  );
};

export const SafetyCard = ({ safety }: { safety: any }) => {
  if (!safety) return null;
  const colors = { Low: 'bg-green-50 border-green-200 text-green-700', Moderate: 'bg-yellow-50 border-yellow-200 text-yellow-700', High: 'bg-red-50 border-red-200 text-red-700' };
  const colorClass = colors[safety.level as keyof typeof colors] || colors.Low;
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <h4 className="text-sm font-semibold mb-2 flex items-center gap-1"><Shield className="w-4 h-4" /> Risk Assessment</h4>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg font-bold">{safety.level}</span>
        <span className="text-xs opacity-75">RISK</span>
      </div>
      <ul className="space-y-1">
        {safety.risks?.map((r: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
            {r}
          </li>
        ))}
      </ul>
      <p className="text-[10px] opacity-60 mt-2">Data: {safety.dataStatus || 'limited'}</p>
    </div>
  );
};

export const PackingCard = ({ packingList }: { packingList: any[] }) => {
  if (!packingList?.length) return null;
  return (
    <div className="rounded-xl bg-white border border-black/10 p-4">
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-1"><Award className="w-4 h-4 text-brand-emerald" /> Packing List</h4>
      <div className="space-y-3">
        {packingList.map((cat: any, i: number) => (
          <div key={i}>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">{cat.category}</p>
            <div className="flex flex-wrap gap-1.5">
              {cat.items?.map((item: string, j: number) => (
                <span key={j} className="px-2.5 py-1 rounded-full bg-black/5 text-xs">{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
