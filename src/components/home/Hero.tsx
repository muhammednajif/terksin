import { motion } from 'framer-motion';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import { useState, forwardRef } from 'react';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { FlipWords } from '@/components/ui/FlipWords';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DateInput = forwardRef<HTMLInputElement, { value?: string; onClick?: () => void; placeholder?: string }>(({ value, onClick, placeholder }, ref) => (
  <div className="flex items-center gap-3 w-full cursor-pointer" onClick={onClick}>
    <Calendar className="w-5 h-5 text-brand-emerald flex-shrink-0" />
    <input
      ref={ref}
      type="text"
      placeholder={placeholder}
      value={value}
      readOnly
      className="bg-transparent border-none text-white focus:outline-none w-full text-sm md:text-base placeholder:text-white/40 cursor-pointer"
    />
  </div>
));
DateInput.displayName = 'DateInput';

export const Hero = () => {
  const [localQuery, setLocalQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [localGuests, setLocalGuests] = useState('');
  const setSearchQuery = useStore(state => state.setSearchQuery);
  const navigate = useNavigate();

  const handleSearch = () => {
    setSearchQuery(localQuery);
    const params: Record<string, string> = {};
    if (localQuery) params.q = localQuery;
    if (selectedDate) params.dates = selectedDate.toISOString().split('T')[0];
    if (localGuests) params.guests = localGuests;
    navigate({ pathname: '/explore', search: createSearchParams(params).toString() });
  };
  return (
    <>
      <div id="datepicker-portal" className="fixed inset-0 z-[99999] pointer-events-none" />
      <div className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-12 flex flex-col items-center text-center mt-16 md:mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md mb-6 md:mb-8">
            <span className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse"></span>
            <span className="text-xs md:text-sm font-medium text-white/90">AI-Powered Trekking Platform</span>
          </div>
          
          <div className="mb-6 md:mb-8">
            <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold font-heading text-white framer-heading">
              Discover Your Next <br />               <FlipWords words={["Peak", "Trail", "Summit", "Adventure", "Journey", "Expedition", "Path"]} className="text-white" />
            </h1>
          </div>
          
          <p className="text-sm md:text-lg lg:text-xl text-white/70 max-w-2xl mx-auto mb-10 md:mb-16 framer-heading font-normal px-2">
            Join the elite community of explorers. Find hidden trails, plan with AI, and share your journey with the world's most immersive trekking platform.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
          className="w-full max-w-4xl bg-white/10 backdrop-blur-xl border border-white/20 p-2 md:p-3 flex flex-col md:flex-row items-stretch md:items-center gap-1 md:gap-2 rounded-2xl md:rounded-full"
        >
          <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 bg-transparent rounded-2xl md:rounded-full w-full">
            <MapPin className="w-5 h-5 text-brand-emerald flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Where do you want to go?" 
              aria-label="Search location"
              value={localQuery}
              onChange={(e) => setLocalQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-transparent border-none text-white focus:outline-none w-full text-sm md:text-base placeholder:text-white/40"
            />
          </div>
          <div className="h-px md:hidden bg-white/10 mx-4" />
          <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 bg-transparent w-full border-t md:border-t-0 md:border-l border-white/10 md:border-white/20 relative">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              placeholderText="Select Dates"
              customInput={<DateInput placeholder="Select Dates" />}
              dateFormat="MMM d, yyyy"
              monthsShown={1}
              portalId="datepicker-portal"
              popperPlacement="bottom-start"
              popperProps={{ strategy: 'fixed' }}
              popperModifiers={[
                {
                  name: 'flip',
                  options: { fallbackPlacements: ['bottom-end', 'top-start', 'top-end'] },
                },
                {
                  name: 'preventOverflow',
                  options: { padding: 12 },
                },
              ]}
              popperClassName="!z-[99999]"
              calendarClassName="!border-neutral-300 !bg-white"
            />

            <style>{`
              .react-datepicker {
                font-family: inherit;
                border-color: #e5e5e5;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
              }
              .react-datepicker__header {
                background: #fafafa;
                border-bottom-color: #e5e5e5;
                border-radius: 16px 16px 0 0;
                padding-top: 12px;
              }
              .react-datepicker__current-month {
                color: #171717;
                font-weight: 600;
              }
              .react-datepicker__day-name {
                color: #737373;
              }
              .react-datepicker__day {
                color: #171717;
                border-radius: 8px;
              }
              .react-datepicker__day:hover {
                background: #f5f5f5;
              }
              .react-datepicker__day--selected {
                background: #171717 !important;
                color: white !important;
              }
              .react-datepicker__day--keyboard-selected {
                background: #e5e5e5;
              }
              .react-datepicker__day--outside-month {
                color: #d4d4d4;
              }
              .react-datepicker__day--disabled {
                color: #e5e5e5;
              }
              .react-datepicker__navigation-icon::before {
                border-color: #737373;
              }
              .react-datepicker__triangle {
                display: none;
              }
              .react-datepicker__day--today {
                font-weight: 700;
                border: 1px solid #171717;
                border-radius: 8px;
              }
            `}</style>
          </div>
          <div className="h-px md:hidden bg-white/10 mx-4" />
          <div className="flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 bg-transparent w-full border-t md:border-t-0 md:border-l border-white/10 md:border-white/20">
            <Users className="w-5 h-5 text-brand-emerald flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Guests" 
              aria-label="Number of guests"
              value={localGuests}
              onChange={(e) => setLocalGuests(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none w-full text-sm md:text-base placeholder:text-white/40"
            />
          </div>
          <button onClick={handleSearch} className="flex items-center justify-center gap-2 px-6 md:px-10 py-3 md:py-5 bg-brand-emerald hover:bg-brand-emerald/80 text-white font-bold rounded-xl md:rounded-full transition-all text-sm md:text-lg shadow-[0_0_40px_rgba(0,0,0,0.3)] mt-1 md:mt-0 mx-2 md:mx-0">
            <Search className="w-4 h-4 md:w-5 md:h-5" />
            <span>Explore</span>
          </button>
        </motion.div>

      </div>
      </div>
    </>
  );
};
