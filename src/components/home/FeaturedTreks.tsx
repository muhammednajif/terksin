import { motion } from 'framer-motion';
import { TREKS } from '@/data/mockData';
import { Star, MapPin, Clock, Navigation } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRef } from 'react';

export const FeaturedTreks = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const cards = sectionRef.current?.querySelectorAll('.featured-card');
    if (!cards?.length) return;
    gsap.fromTo(cards,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none none' },
      }
    );
  }, []);

  return (
    <section ref={sectionRef} className="py-24 px-6 md:px-12 max-w-7xl mx-auto relative">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl"
        >
          <h2 className="text-3xl md:text-5xl font-bold font-heading text-black mb-4">Trending Expeditions</h2>
          <p className="text-muted-foreground text-lg">Discover the most sought-after trails handpicked by our expert community and AI algorithms.</p>
        </motion.div>
        
        <motion.button 
          onClick={() => navigate('/explore')}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="px-6 py-3 border border-black/10 hover:border-brand-emerald hover:text-brand-emerald rounded-full transition-all text-sm font-semibold flex items-center gap-2 group cursor-pointer"
        >
          View All Treks 
          <Navigation className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {TREKS.slice(0, 6).map((trek, index) => (
          <div
            key={trek.id}
            className="featured-card group relative rounded-3xl overflow-hidden glass-card border border-black/5 hover:border-brand-emerald/50 transition-all duration-500 cursor-pointer"
          >
            <div className="h-64 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-brand-darker via-transparent to-transparent z-10" />
              <img 
                src={trek.image} 
                alt={trek.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute top-4 right-4 z-20 bg-white/50 backdrop-blur-md px-3 py-1 rounded-full border border-black/10 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-black fill-black" />
                <span className="text-xs font-semibold text-black">{trek.rating}</span>
              </div>
              <div className="absolute top-4 left-4 z-20 bg-brand-emerald/90 px-3 py-1 rounded-full flex items-center gap-1">
                <span className="text-xs font-bold text-black uppercase tracking-wider">{trek.difficulty}</span>
              </div>
            </div>

            <div className="p-6 relative z-20 -mt-8">
              <div className="flex items-center gap-2 text-brand-emerald mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{trek.location}</span>
              </div>
              <h3 className="text-xl font-bold text-black mb-2 group-hover:text-brand-emerald transition-colors line-clamp-1">{trek.title}</h3>
              
              <div className="flex items-center gap-4 text-muted-foreground text-sm mb-6">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  <span>{trek.duration}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-4 h-4" />
                  <span>{trek.distance}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {trek.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-black/5 border border-black/5 text-xs text-black/70">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-black/5">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">From</span>
                  <span className="text-lg font-bold text-black">${trek.price}</span>
                </div>
                <Link to={`/treks/${trek.id}`} className="px-5 py-2 bg-black/10 hover:bg-brand-emerald hover:text-black rounded-full text-sm font-semibold transition-colors">
                  Explore
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
