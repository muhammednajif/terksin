import { Hero } from '@/components/home/Hero';
import { FeaturedTreks } from '@/components/home/FeaturedTreks';
import { motion } from 'framer-motion';
import { CATEGORIES } from '@/data/mockData';
import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';
import { GooeyBackground } from '@/components/ui/GooeyBackground';

import { Footer } from '@/components/shared/Footer';
import { AdventureCards } from '@/components/home/AdventureCards';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { value: '10k+', label: 'Curated Trails', num: 10, suffix: 'k+' },
  { value: '500k', label: 'Active Explorers', num: 500, suffix: 'k' },
  { value: '150+', label: 'Countries', num: 150, suffix: '+' },
  { value: '4.9/5', label: 'Average Rating', num: 4.9, suffix: '/5' },
];

export const Home = () => {
  const setSelectedCategory = useStore(state => state.setSelectedCategory);
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const adventureRef = useRef<HTMLDivElement>(null);
  const promoRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add('(min-width: 768px)', () => {
      // Categories parallax scroll
      if (categoriesRef.current) {
        const cats = gsap.utils.toArray<HTMLElement>('.category-item');
        gsap.fromTo(cats,
          { opacity: 0, x: -40 },
          {
            opacity: 1, x: 0, duration: 0.8, stagger: 0.08,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: categoriesRef.current,
              start: 'top 85%',
              toggleActions: 'play none none none',
            },
          }
        );
      }

      // Adventure section — cards already animate via framer-motion inside AdventureCards

      // App promo section - parallax phone
      if (promoRef.current) {
        gsap.to('.promo-phone', {
          y: -40,
          ease: 'none',
          scrollTrigger: {
            trigger: promoRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.5,
          },
        });

        gsap.fromTo('.promo-content',
          { opacity: 0, x: -60 },
          {
            opacity: 1, x: 0, duration: 1, ease: 'power3.out',
            scrollTrigger: {
              trigger: promoRef.current,
              start: 'top 75%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    });

    // Stats count-up (all screen sizes)
    if (statsRef.current) {
      const statValues = statsRef.current.querySelectorAll('.stat-value');
      statValues.forEach(el => {
        const num = parseFloat(el.getAttribute('data-num') || '0');
        const suffix = el.getAttribute('data-suffix') || '';
        if (!num) return;
        el.textContent = '0' + suffix;

        const obj = { val: 0 };
        gsap.to(obj, {
          val: num,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
          onUpdate: function () {
            el.textContent = (Number.isInteger(num) ? Math.round(obj.val) : obj.val.toFixed(1)) + suffix;
          },
        });
      });
    }
  }, { scope: pageRef });

  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    navigate('/explore');
  };
  return (
    <div ref={pageRef} className="flex flex-col min-h-screen">
      <Hero />
      
      {/* Stats */}
      <section ref={statsRef} className="py-12 md:py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="relative group"
              >
                <div className="text-center px-2 md:px-4 py-4 md:py-6 rounded-2xl border border-black/10 hover:border-brand-emerald/40 transition-all">
                  <h3 className="stat-value text-2xl md:text-4xl font-bold text-black mb-0.5 md:mb-1" data-num={stat.num} data-suffix={stat.suffix}>{stat.value}</h3>
                  <p className="text-[10px] md:text-xs text-black/60 uppercase tracking-widest font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Categories Banner */}
      <div ref={categoriesRef} className="border-y border-black/5 bg-brand-dark/50 backdrop-blur-sm relative z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 overflow-x-auto scrollbar-none flex items-center gap-4 md:gap-8">
          {CATEGORIES.map((cat, i) => (
            <div 
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className="category-item flex items-center gap-2 md:gap-3 min-w-max px-4 md:px-6 py-2 md:py-3 rounded-full hover:bg-black/5 cursor-pointer transition-colors border border-transparent hover:border-black/10"
            >
              <span className="text-xl md:text-2xl">{cat.icon}</span>
              <span className="text-sm md:text-base text-black/80 font-medium whitespace-nowrap">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Adventure Cards - Explore Your Next Adventure */}
      <section ref={adventureRef} className="py-16 md:py-20 relative bg-brand-darker">
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold font-heading text-black mb-4 md:mb-6 framer-heading">Experience the Extraordinary.</h2>
            <p className="text-base sm:text-xl text-black/60 mb-6 md:mb-8 max-w-2xl mx-auto leading-relaxed font-normal">
              Download our mobile app to take your maps completely offline. Never lose your way, even when you're 5,000 meters above sea level.
            </p>
            <button onClick={() => navigate('/explore')} className="px-8 md:px-10 py-3 md:py-5 bg-white hover:bg-gray-800 text-sm md:text-base text-black font-bold rounded-full transition-all">
              Start Exploring
            </button>
          </div>
          <AdventureCards />
        </div>
      </section>

      <FeaturedTreks />

      {/* App Promo Section */}
      <section ref={promoRef} className="py-24 relative overflow-hidden">
        <GooeyBackground />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-transparent to-brand-dark z-0" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 promo-content">
            <div>
              <div className="inline-block px-6 py-2 rounded-full bg-black/5 border border-black/10 text-black text-sm font-semibold mb-6 backdrop-blur-md">
                Treksin
              </div>
              <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold font-heading text-black mb-4 md:mb-8 framer-heading">Take the Adventure Offline.</h2>
              <p className="text-base sm:text-xl text-black/60 mb-6 md:mb-10 leading-relaxed font-normal">
                Download topographic maps, track your GPS position without signal, and access your AI-generated itineraries entirely offline.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
                <a href="https://apps.apple.com/app/id" target="_blank" rel="noopener noreferrer" className="px-6 md:px-10 py-3 md:py-5 bg-white text-sm md:text-base text-black font-bold rounded-full hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                  Download for iOS
                </a>
                <a href="https://play.google.com/store/apps/details?id=com.trailsync" target="_blank" rel="noopener noreferrer" className="px-6 md:px-10 py-3 md:py-5 bg-black/5 text-sm md:text-base text-black font-bold rounded-full hover:bg-black/10 border border-black/10 transition-all flex items-center justify-center gap-2 backdrop-blur-md">
                  Download for Android
                </a>
              </div>
            </div>
          </div>
          <div className="flex-1 relative">
            <div className="promo-phone relative w-full max-w-sm mx-auto aspect-[1/2] glass rounded-[3rem] border-8 border-black/10 shadow-2xl overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1551632811-561732d1e306?q=80&w=2070&auto=format&fit=crop" 
                alt="App UI Preview" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white to-transparent" />
            </div>
            
            {/* Floating UI Elements */}
            <div className="absolute top-20 -left-12 glass-card p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-emerald flex items-center justify-center text-xl">🏔️</div>
              <div>
                <p className="text-black text-sm font-bold">Altitude Alert</p>
                <p className="text-brand-emerald text-xs font-semibold">4,200m reached</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
