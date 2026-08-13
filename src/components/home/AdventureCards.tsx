import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';

type CardConfig = {
  y: number;
  rotate: number;
};

type CardData = {
  title: string;
  description: string;
  image: string;
  category: string;
  gradient: string;
  config: CardConfig;
};

const OVERLAY = 'from-black/60 via-black/30 to-transparent';

const CARDS: CardData[] = [
  {
    title: 'Mountain Treks',
    description: 'Discover breathtaking peaks, summit trails, and high-altitude adventures.',
    image: 'https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=800&q=80',
    category: 'mountain',
    gradient: OVERLAY,
    config: { y: -24, rotate: -12 },
  },
  {
    title: 'Waterfall Trails',
    description: 'Explore scenic trekking routes leading to spectacular waterfalls.',
    image: 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80',
    category: 'waterfall',
    gradient: OVERLAY,
    config: { y: 16, rotate: 6 },
  },
  {
    title: 'Forest Trails',
    description: 'Walk through lush forests, wildlife areas, and peaceful nature trails.',
    image: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80',
    category: 'forest',
    gradient: OVERLAY,
    config: { y: -64, rotate: -4 },
  },
  {
    title: 'Camping Adventures',
    description: 'Find unforgettable overnight camps, stargazing spots, and wilderness experiences.',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80',
    category: 'camping',
    gradient: OVERLAY,
    config: { y: 20, rotate: 10 },
  },
  {
    title: 'Hidden Gems',
    description: 'Discover lesser-known trails and secret destinations beyond the usual routes.',
    image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
    category: 'hidden-gems',
    gradient: OVERLAY,
    config: { y: 36, rotate: -6 },
  },
];

const springConfig = { type: 'spring' as const, visualDuration: 0.6, bounce: 0.25 };
const DESKTOP_SPACING = 240;
const TABLET_SPACING = 120;
const CARD_W = 340;
const CARD_H = 440;

export const AdventureCards = () => {
  const [active, setActive] = useState<CardData | null>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [spacing, setSpacing] = useState(DESKTOP_SPACING);
  const [reducedMotion, setReducedMotion] = useState(false);
  const navigate = useNavigate();
  const setSelectedCategory = useStore(s => s.setSelectedCategory);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const detect = () => {
      const w = window.innerWidth;
      if (w >= 1024) { setViewport('desktop'); setSpacing(DESKTOP_SPACING); }
      else if (w >= 768) { setViewport('tablet'); setSpacing(TABLET_SPACING); }
      else { setViewport('mobile'); setSpacing(0); }
    };
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setActive(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActive(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleCardClick = useCallback((card: CardData) => {
    setActive(prev => prev?.title === card.title ? null : card);
  }, []);

  const handleExplore = useCallback((e: React.MouseEvent | React.KeyboardEvent, card: CardData) => {
    e.stopPropagation();
    setSelectedCategory(null);
    navigate(`/explore?category=${card.category}`);
    setActive(null);
  }, [navigate, setSelectedCategory]);

  const middle = (CARDS.length - 1) / 2;
  const isAnyActive = active !== null;
  const animProps = reducedMotion ? { type: 'tween' as const, duration: 0 } : springConfig;

  // Mobile: horizontal snap-scroll carousel
  if (viewport === 'mobile') {
    return (
      <div className="overflow-hidden py-4">
        <div
          className="flex gap-4 overflow-x-auto pb-4 px-6 snap-x snap-mandatory -mx-6"
          role="listbox"
          aria-label="Choose a trek category"
        >
          {CARDS.map(card => {
            const isActive = active?.title === card.title;
            return (
              <div
                key={card.title}
                role="option"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => handleCardClick(card)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(card); }
                  if (e.key === 'Escape') setActive(null);
                }}
                className={cn(
                  'relative flex-shrink-0 w-[270px] snap-center rounded-2xl overflow-hidden cursor-pointer transition-all duration-300',
                  isActive ? 'h-[360px]' : 'h-[240px]',
                )}
              >
                <img src={card.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                <div className={`absolute inset-0 bg-gradient-to-t ${card.gradient}`} />
                <div className="relative z-10 flex flex-col justify-end h-full p-5">
                  <h3 className="text-white font-bold text-lg">{card.title}</h3>
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                        transition={animProps}
                      >
                        <p className="text-white/80 text-sm mt-2 leading-relaxed">{card.description}</p>
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Explore ${card.title}`}
                          onClick={e => handleExplore(e, card)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExplore(e, card); } }}
                          className="inline-block mt-3 px-4 py-2.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white text-sm font-semibold rounded-lg cursor-pointer transition-colors active:scale-[0.97]"
                        >
                          Explore Treks
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop & Tablet: stacked overlapping layout
  const isDesktop = viewport === 'desktop';
  const cardW = isDesktop ? CARD_W : 260;
  const cardH = isDesktop ? CARD_H : 340;

  return (
    <div className="relative flex w-full items-center justify-center overflow-visible py-6">
      <motion.div
        ref={ref}
        onClick={() => setActive(null)}
        className="relative mx-auto w-full"
        style={{
          minHeight: isAnyActive ? (isDesktop ? 640 : 520) : (isDesktop ? 560 : 420),
        }}
      >
        {CARDS.map((card, index) => {
          const offsetX = (index - middle) * spacing;
          const isActive = active?.title === card.title;

          const getAnimate = () => {
            if (reducedMotion) {
              return { opacity: isActive ? 1 : isAnyActive ? 0.3 : 1 };
            }
            if (isActive) {
              return { y: 0, x: 0, rotate: 0, scale: 1.12, opacity: 1 };
            }
            if (isAnyActive) {
              return { y: card.config.y + (isDesktop ? 280 : 200), x: offsetX * 0.25, rotate: card.config.rotate * 0.15, scale: 0.75, opacity: 0.4 };
            }
            return { y: card.config.y, x: offsetX, rotate: card.config.rotate, scale: 1, opacity: 1 };
          };

          return (
            <motion.div
              key={card.title}
              initial={reducedMotion ? { opacity: 1, scale: 1 } : { scale: 0, opacity: 0 }}
              animate={getAnimate()}
              whileHover={reducedMotion ? {} : { scale: isActive ? 1.12 : isAnyActive ? 0.75 : 1.04 }}
              transition={animProps}
              role="button"
              tabIndex={0}
              aria-label={`${card.title} - ${card.description}`}
              aria-expanded={isActive}
              onClick={e => { e.stopPropagation(); handleCardClick(card); }}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(card); }
                if (e.key === 'Escape') setActive(null);
              }}
              style={{
                width: cardW,
                height: cardH,
                zIndex: isActive ? 50 : index + 2,
                marginLeft: -(cardW / 2),
                marginTop: -(cardH / 2),
              }}
              className="absolute top-1/2 left-1/2 flex cursor-pointer flex-col items-start justify-end overflow-hidden rounded-2xl shadow-xl"
            >
              <img src={card.image} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className={`absolute inset-0 bg-gradient-to-t ${card.gradient}`} />

              <div className="relative z-10 w-full p-5 md:p-6">
                <motion.h2
                  layoutId={!reducedMotion && isAnyActive ? card.title + 'title' : undefined}
                  className="font-bold text-left text-white text-xl md:text-3xl"
                >
                  {card.title}
                </motion.h2>

                <AnimatePresence mode="popLayout">
                  {isActive && (
                    <motion.div
                      key="content"
                      layoutId={!reducedMotion ? card.title + 'content' : undefined}
                      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 20, y: 20 }}
                      animate={{ opacity: 1, x: 0, y: 0 }}
                      exit={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 40, y: 40 }}
                      transition={animProps}
                    >
                      <p className="text-white/80 text-sm md:text-base mt-2 leading-relaxed">{card.description}</p>
                      <span
                        role="button"
                        tabIndex={0}
                        aria-label={`Explore ${card.title}`}
                        onClick={e => handleExplore(e, card)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleExplore(e, card); } }}
                        className="inline-block mt-4 px-5 py-2.5 bg-brand-emerald hover:bg-brand-emerald/90 text-white text-sm font-semibold rounded-xl cursor-pointer transition-all active:scale-[0.97]"
                      >
                        Explore Treks
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
