import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { Mountain, Search, Menu, X, User, Bell, LogOut, Bookmark, Compass, Map, MoreVertical, BookOpen, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/store/useStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

export const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const chatUnreadCount = useStore(s => s.chatUnreadCount);
  const showToast = useStore(state => state.showToast);
  const navigate = useNavigate();
  const { user, profile, signOut, setShowAuthModal } = useAuth();
  const navRef = useRef<HTMLDivElement>(null);
  const lastScrollRef = useRef(0);

  useGSAP(() => {
    const nav = navRef.current;
    if (!nav) return;

    gsap.set(nav, { y: 0 });

    ScrollTrigger.create({
      start: 'top -50',
      onUpdate: self => {
        const current = window.scrollY;
        const dir = current > lastScrollRef.current ? 'down' : 'up';
        lastScrollRef.current = current;

        if (current > 80) {
          gsap.to(nav, {
            y: dir === 'down' ? -100 : 0,
            duration: 0.4,
            ease: 'power2.out',
            overwrite: 'auto',
          });
        } else {
          gsap.to(nav, { y: 0, duration: 0.3, overwrite: 'auto' });
        }
      },
    });

    ScrollTrigger.create({
      start: 'top -30',
      end: 'top -150',
      onUpdate: self => {
        const progress = Math.min(self.progress * 1.5, 1);
        gsap.to(nav, {
          '--nav-bg-opacity': progress,
          '--nav-blur': progress * 12,
          duration: 0.1,
          overwrite: 'auto',
        });
      },
    });
  }, []);

  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false).then(({ count }) => {
      if (count !== null) setUnreadCount(count);
    });
    const channel = supabase.channel('notifications-count').on('postgres_changes', {
      event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}`,
    }, () => {
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false).then(({ count }) => {
        if (count !== null) setUnreadCount(count);
      });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleNotifications = () => {
    if (!user) { setShowAuthModal(true); return; }
    navigate('/notifications');
    showToast(unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'No new notifications');
  };

  const handleSignOut = async () => {
    await signOut();
    setMobileMenuOpen(false);
    showToast('Signed out');
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/explore', label: 'Explore' },
    { to: '/community', label: 'Community' },
    { to: '/ai-planner', label: 'Planner', badge: 'AI' as const },
    { to: '/chat', label: 'Messages' as const },
  ];

  return (
    <>
      <div
        ref={navRef}
        className="fixed top-0 left-0 right-0 z-50 px-4 md:px-12 grid grid-cols-2 md:grid-cols-3 items-center"
        style={{ paddingTop: '12px', paddingBottom: '12px' }}
      >
        <Link to="/" className="flex items-center gap-1.5 md:gap-2 group justify-self-start bg-white border border-black/10 rounded-full px-2 md:px-3 py-2">
          <div className="bg-brand-emerald/20 p-1.5 md:p-2 rounded-xl group-hover:bg-brand-emerald/30 transition-colors">
            <Mountain className="w-5 h-5 md:w-6 md:h-6 text-brand-emerald" />
          </div>
          <span className="hidden sm:inline text-lg md:text-xl font-bold font-heading tracking-tight text-black group-hover:text-glow transition-all">
            Treksin
          </span>
        </Link>

        <div className="hidden md:flex items-center justify-center gap-1 bg-white border border-black/10 rounded-full px-2 py-2">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={link.to === '/chat' && !user ? (e) => { e.preventDefault(); setShowAuthModal(true); } : undefined}
              className="relative px-4 py-2 text-sm font-medium text-black/80 hover:text-black transition-colors rounded-full hover:bg-black/5 flex items-center gap-1"
            >
              {link.badge && <span className="bg-brand-emerald/20 text-brand-emerald px-2 py-0.5 rounded-full text-xs">{link.badge}</span>}
              {link.label}
              {link.label === 'Messages' && chatUnreadCount > 0 && (
                <span className="ml-1 min-w-[16px] h-4 flex items-center justify-center bg-brand-emerald text-white text-[9px] font-bold rounded-full px-1">
                  {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 md:gap-4">
          {user ? (
            <>
              <button onClick={handleNotifications} className="touch-target-sm p-2.5 text-black/80 hover:text-black bg-white border border-black/10 rounded-full transition-colors relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-brand-emerald text-white text-[10px] font-bold rounded-full px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* More Menu Dropdown - Desktop */}
              <div className="relative hidden md:block" ref={moreMenuRef}>
                <button onClick={() => setMoreMenuOpen(!moreMenuOpen)} className="touch-target-sm p-2.5 text-black/80 hover:text-black bg-white border border-black/10 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
                {moreMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-white rounded-2xl shadow-xl border border-black/10 py-2 overflow-hidden">
                      <Link to="/saved-treks" onClick={() => setMoreMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-black/80 hover:bg-black/5 transition-colors">
                        <Bookmark className="w-4 h-4" /> Saved Treks
                      </Link>
                      <Link to="/my-expeditions" onClick={() => setMoreMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-black/80 hover:bg-black/5 transition-colors">
                        <Compass className="w-4 h-4" /> My Expeditions
                      </Link>
                      <Link to="/journeys" onClick={() => setMoreMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-black/80 hover:bg-black/5 transition-colors">
                        <Map className="w-4 h-4" /> My Journeys
                      </Link>
                      <Link to="/passport" onClick={() => setMoreMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-black/80 hover:bg-black/5 transition-colors">
                        <BookOpen className="w-4 h-4" /> Passport
                      </Link>
                      <hr className="my-1 border-black/5" />
                      <Link to="/profile" onClick={() => setMoreMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-black/80 hover:bg-black/5 transition-colors">
                        <User className="w-4 h-4" /> Profile
                      </Link>
                      <button onClick={(e) => { e.preventDefault(); setMoreMenuOpen(false); handleSignOut(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                )}
              </div>

              {/* Profile avatar - visible on all screens */}
              <Link to="/profile" className="touch-target-sm flex items-center justify-center bg-white hover:bg-black/5 border border-black/10 rounded-full transition-all w-9 h-9 md:w-auto md:px-3 md:py-2.5 md:gap-2">
                <div className="w-6 h-6 rounded-full bg-brand-emerald/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-brand-emerald">{profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}</span>
                </div>
                <span className="hidden md:inline text-sm font-medium max-w-[100px] truncate">{profile?.display_name || user.email}</span>
              </Link>
            </>
          ) : (
            <button onClick={() => setShowAuthModal(true)} className="touch-target-sm flex items-center gap-2 bg-white hover:bg-black/5 border border-black/10 px-4 py-2 rounded-full transition-all">
              <User className="w-5 h-5" />
              <span className="hidden sm:inline text-sm font-medium">Sign In</span>
            </button>
          )}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="touch-target-sm flex md:hidden p-2.5 text-black/80 hover:text-black bg-white border border-black/10 rounded-full">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative top-20 mx-4 bg-white rounded-2xl shadow-2xl border border-black/10 p-6">
              <div className="flex flex-col gap-2">
                {navLinks.map(link => (
                  <Link key={link.to} to={link.to} onClick={(e) => { setMobileMenuOpen(false); if (link.to === '/chat' && !user) { e.preventDefault(); setShowAuthModal(true); } }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-black/5 transition-colors text-sm font-medium">
                    {link.badge && <span className="bg-brand-emerald/20 text-brand-emerald px-2 py-0.5 rounded-full text-xs">{link.badge}</span>}
                    {link.label}
                    {link.label === 'Messages' && chatUnreadCount > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center bg-brand-emerald text-white text-[10px] font-bold rounded-full px-1">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    )}
                  </Link>
                ))}
                <Link to="/my-expeditions" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-black/5 transition-colors text-sm font-medium">
                  <Compass className="w-4 h-4" /> My Expeditions
                </Link>
                <Link to="/journeys" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-black/5 transition-colors text-sm font-medium">
                  <Map className="w-4 h-4" /> My Journeys
                </Link>
                <hr className="my-2 border-black/5" />
                {user ? (
                  <>
                    <div className="px-4 py-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-emerald/20 flex items-center justify-center">
                        <span className="text-sm font-bold text-brand-emerald">{profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{profile?.display_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <button onClick={handleSignOut} className="flex items-center gap-2 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-sm text-red-600 font-medium">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setShowAuthModal(true); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-emerald text-white transition-colors text-sm font-medium justify-center">
                    <User className="w-4 h-4" /> Sign In
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
