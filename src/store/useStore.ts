import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Trek } from '@/data/globalTreks';
import { fetchLiveTrailsFromOSM } from '@/services/osmApi';

interface StoreState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedContinent: string | null;
  setSelectedContinent: (continent: string | null) => void;
  selectedCountry: string | null;
  setSelectedCountry: (country: string | null) => void;
  
  isFetchingTrails: boolean;
  osmTreks: Trek[];
  fetchLiveTrails: (country: string, continent: string) => Promise<void>;
  
  filters: {
    difficulties: string[];
    maxPrice: number;
  };
  setFilters: (filters: Partial<StoreState['filters']>) => void;
  
  toast: { message: string; id: number } | null;
  showToast: (message: string) => void;

  userCoords: { latitude: number; longitude: number } | null;
  setUserCoords: (coords: { latitude: number; longitude: number } | null) => void;
  coordsUpdatedAt: number | null;
  setCoordsUpdatedAt: (ts: number | null) => void;
  locationPermission: 'granted' | 'denied' | 'prompt' | 'unavailable';
  setLocationPermission: (status: StoreState['locationPermission']) => void;

  onlineUserIds: Set<string>;
  setOnlineUserIds: (ids: Set<string>) => void;
  chatUnreadCount: number;
  setChatUnreadCount: (count: number) => void;
}

export const useStore = create<StoreState>()(persist((set) => ({
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  selectedCategory: null,
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  selectedContinent: null,
  setSelectedContinent: (continent) => set({ selectedContinent: continent, selectedCountry: null, osmTreks: [] }),
  selectedCountry: null,
  setSelectedCountry: (country) => set({ selectedCountry: country }),
  
  isFetchingTrails: false,
  osmTreks: [],
  fetchLiveTrails: async (country, continent) => {
    set({ isFetchingTrails: true, osmTreks: [] });
    try {
      const liveTreks = await fetchLiveTrailsFromOSM(country, continent);
      set({ osmTreks: liveTreks, isFetchingTrails: false });
    } catch (error) {
      console.error(error);
      set({ isFetchingTrails: false });
    }
  },
  
  filters: {
    difficulties: [],
    maxPrice: 5000,
  },
  setFilters: (newFilters) => 
    set((state) => ({ 
      filters: { ...state.filters, ...newFilters } 
    })),
    
  toast: null,
  showToast: (message) => {
    set({ toast: { message, id: Date.now() } });
    setTimeout(() => {
      set((state) => (state.toast?.message === message ? { toast: null } : state));
    }, 3000);
  },

  userCoords: null,
  setUserCoords: (coords) => set({ userCoords: coords, coordsUpdatedAt: coords ? Date.now() : null }),
  coordsUpdatedAt: null,
  setCoordsUpdatedAt: (ts) => set({ coordsUpdatedAt: ts }),
  locationPermission: 'prompt',
  setLocationPermission: (status) => set({ locationPermission: status }),

  onlineUserIds: new Set<string>(),
  setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),
  chatUnreadCount: 0,
  setChatUnreadCount: (count) => set({ chatUnreadCount: count }),
}), {
  name: 'trailsync-store',
  partialize: (state) => ({
    userCoords: state.userCoords,
    coordsUpdatedAt: state.coordsUpdatedAt,
    locationPermission: state.locationPermission,
  }),
}));
