import { useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { Search, TrendingUp, MapPin, ArrowUpRight } from 'lucide-react';
import { searchTreksSmart, getTopRecommended, type SmartSuggestion } from '@/lib/smartSuggestions';
import { useStore } from '@/store/useStore';

interface SmartSearchProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
}

interface PopupPos {
  top: number;
  left: number;
  width: number;
}

export const SmartSearch = ({ query, onQueryChange, onSearch }: SmartSearchProps) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [showPopular, setShowPopular] = useState(false);
  const [pos, setPos] = useState<PopupPos | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const setSearchQuery = useStore(s => s.setSearchQuery);
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    if (!query.trim()) {
      setShowPopular(true);
      return getTopRecommended(5);
    }
    setShowPopular(false);
    return searchTreksSmart(query, 6);
  }, [query]);

  const updatePos = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({ top: rect.bottom, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    setHighlighted(0);
  }, [query, open]);

  useEffect(() => {
    if (open) updatePos();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScrollOrResize = () => updatePos();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current && containerRef.current.contains(t)) return;
      const popup = document.getElementById('smart-search-popup');
      if (popup && popup.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSuggestion = (s: SmartSuggestion) => {
    setSearchQuery(s.trek.title);
    onQueryChange(s.trek.title);
    setOpen(false);
    navigate({ pathname: '/explore', search: createSearchParams({ q: s.trek.title }).toString() });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') onSearch();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlighted]) {
        selectSuggestion(suggestions[highlighted]);
      } else {
        onSearch();
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const panel = open && suggestions.length > 0 && pos ? createPortal(
    <div id="smart-search-popup">
      <div
        style={{ top: pos.top + 8, left: pos.left, width: Math.min(pos.width, 420) }}
        className="fixed bg-white rounded-2xl shadow-2xl border border-black/10 overflow-hidden z-[99999] text-left flex flex-col max-h-[70vh]"
      >
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-black/5 flex-shrink-0">
            {showPopular ? (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-brand-emerald" />
                <span className="text-[11px] font-bold text-black/70 uppercase tracking-wide">Trending Now</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5 text-brand-emerald" />
                <span className="text-[11px] font-bold text-black/70 uppercase tracking-wide">
                  Smart suggestions for "{query}"
                </span>
              </>
            )}
          </div>

          <div className="overflow-y-auto scrollbar-thin flex-1">
            {suggestions.map((s, i) => (
              <button
                key={s.trek.id}
                onMouseEnter={() => setHighlighted(i)}
                onClick={() => selectSuggestion(s)}
                className={`w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-3 text-left transition-colors ${
                  i === highlighted ? 'bg-brand-emerald/10' : 'hover:bg-black/[0.03]'
                }`}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0">
                  <img src={s.trek.image} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] sm:text-sm font-semibold text-black truncate flex items-center gap-1.5">
                    <span className="truncate">{s.trek.title}</span>
                    {i === 0 && !showPopular && (
                      <span className="bg-brand-emerald/15 text-brand-emerald text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">BEST</span>
                    )}
                  </p>
                  <p className="text-[11px] sm:text-xs text-black/50 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{s.trek.location} · {s.trek.duration} · {s.trek.difficulty}</span>
                    <span className="ml-auto flex-shrink-0 sm:hidden">
                      <span className="text-[11px] font-bold text-black/80">${s.trek.price}</span>
                    </span>
                  </p>
                  <p className="text-[11px] text-brand-emerald mt-0.5 truncate">{s.reason}</p>
                </div>
                <div className="flex-col items-end gap-1 flex-shrink-0 hidden sm:flex">
                  <span className="text-sm font-bold text-black/80">${s.trek.price}</span>
                  <span className="text-[10px] text-black/40 flex items-center gap-0.5">
                    ★ {s.trek.rating}
                  </span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-black/30 flex-shrink-0 hidden sm:block" />
              </button>
            ))}
          </div>

          <button
            onClick={() => { setOpen(false); onSearch(); }}
            className="w-full px-4 py-2.5 text-sm font-semibold text-brand-emerald hover:bg-brand-emerald/10 transition-colors text-center border-t border-black/5 flex-shrink-0"
          >
            See all results for "{query}" →
          </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        placeholder="Where do you want to go?"
        aria-label="Search location"
        value={query}
        onChange={(e) => { onQueryChange(e.target.value); setOpen(true); updatePos(); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="bg-transparent border-none text-white focus:outline-none w-full text-sm md:text-base placeholder:text-white/40 cursor-pointer"
      />
      {panel}
    </div>
  );
};