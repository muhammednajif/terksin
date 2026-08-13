import { useState, useRef } from 'react';
import { Mountain, MessageCircle, Camera, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const showToast = useStore(state => state.showToast);
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    const cols = footerRef.current?.querySelectorAll('.footer-col');
    if (!cols?.length) return;
    gsap.fromTo(cols,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: footerRef.current, start: 'top 90%', toggleActions: 'play none none none' },
      }
    );
  }, []);

  const handleSubscribe = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Enter a valid email');
      return;
    }
    setSubscribing(true);
    try {
      const { error } = await supabase.from('newsletter_subscriptions').insert({ email });
      if (error) throw error;
      showToast('Subscribed! Check your inbox.');
      setEmail('');
    } catch (err: any) {
      showToast(err.message === 'Duplicate email' ? 'Already subscribed' : 'Subscription failed');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer ref={footerRef} className="bg-brand-darker border-t border-black/5 pt-20 pb-10 px-6 md:px-12 relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-brand-emerald/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
        <div className="footer-col col-span-1 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-6">
            <div className="bg-brand-emerald/20 p-2 rounded-xl">
              <Mountain className="w-6 h-6 text-brand-emerald" />
            </div>
            <span className="text-xl font-bold font-heading text-black">Treksin</span>
          </Link>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            The ultimate AI-powered trekking discovery and community platform. Explore, plan, and conquer the world's most beautiful trails.
          </p>
          <div className="flex gap-4">
            <a href="https://discord.gg/treksin" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-black/5 border border-black/10 flex items-center justify-center text-black/60 hover:text-black hover:bg-black/10 transition-all">
              <MessageCircle className="w-4 h-4" />
            </a>
            <a href="https://instagram.com/treksin" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-black/5 border border-black/10 flex items-center justify-center text-black/60 hover:text-black hover:bg-black/10 transition-all">
              <Camera className="w-4 h-4" />
            </a>
            <a href="https://treksin.app" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-black/5 border border-black/10 flex items-center justify-center text-black/60 hover:text-black hover:bg-black/10 transition-all">
              <Globe className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="footer-col">
          <h4 className="text-black font-semibold mb-6">Platform</h4>
          <ul className="space-y-4">
            <li><Link to="/explore" className="text-muted-foreground hover:text-brand-emerald transition-colors text-sm">Explore Treks</Link></li>
            <li><Link to="/community" className="text-muted-foreground hover:text-brand-emerald transition-colors text-sm">Community</Link></li>
            <li><Link to="/ai-planner" className="text-muted-foreground hover:text-brand-emerald transition-colors text-sm">AI Planner</Link></li>
            <li><Link to="/explore" className="text-muted-foreground hover:text-brand-emerald transition-colors text-sm">Weather Alerts</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="text-black font-semibold mb-6">Company</h4>
          <ul className="space-y-4">
            <li><Link to="/about" className="text-muted-foreground hover:text-brand-emerald transition-colors text-sm">About Us</Link></li>
            <li><a href="mailto:careers@treksin.app" className="text-muted-foreground hover:text-brand-emerald transition-colors text-sm">Careers</a></li>
            <li><Link to="/press" className="text-muted-foreground hover:text-brand-emerald transition-colors text-sm">Press</Link></li>
            <li><Link to="/contact" className="text-muted-foreground hover:text-brand-emerald transition-colors text-sm">Contact</Link></li>
          </ul>
        </div>

        <div className="footer-col">
          <h4 className="text-black font-semibold mb-6">Newsletter</h4>
          <p className="text-muted-foreground text-sm mb-4">Get the latest treks and updates directly to your inbox.</p>
          <div className="flex gap-2">
            <input 
              type="email" 
              placeholder="Your email" 
              aria-label="Email for newsletter"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
              className="bg-black/5 border border-black/10 rounded-lg px-4 py-2 text-sm text-black focus:outline-none focus:border-brand-emerald transition-colors w-full"
            />
            <button onClick={handleSubscribe} disabled={subscribing}
              className="bg-brand-emerald hover:bg-brand-emerald/80 text-black px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {subscribing ? '...' : 'Subscribe'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-black/5 mt-16 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground relative z-10">
        <p>© 2026 Treksin. All rights reserved.</p>
        <div className="flex gap-6">
          <Link to="/privacy" className="hover:text-black transition-colors">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-black transition-colors">Terms of Service</Link>
          <Link to="/cookies" className="hover:text-black transition-colors">Cookie Policy</Link>
        </div>
      </div>
    </footer>
  );
};
