import { GLOBAL_TREKS } from '@/data/globalTreks';
import type { Trek } from '@/data/globalTreks';
import type { UnifiedTrek, TrekSource, BookingType } from './trek-types';

const canonicalTrekSources: Record<string, { bookingType: BookingType; isBookable: boolean }> = {
  'everest-base-camp': { bookingType: 'expedition', isBookable: true },
  'annapurna-circuit': { bookingType: 'self-guided', isBookable: false },
  'mount-fuji-yoshida': { bookingType: 'self-guided', isBookable: false },
  'inca-trail': { bookingType: 'expedition', isBookable: true },
  'patagonia-o-circuit': { bookingType: 'self-guided', isBookable: false },
  'tour-du-mont-blanc': { bookingType: 'expedition', isBookable: true },
  'camino-frances': { bookingType: 'self-guided', isBookable: false },
  'kilimanjaro-machame': { bookingType: 'expedition', isBookable: true },
  'john-muir-trail': { bookingType: 'self-guided', isBookable: false },
  'west-coast-trail': { bookingType: 'self-guided', isBookable: false },
  'milford-track': { bookingType: 'expedition', isBookable: true },
};

let demoCache: UnifiedTrek[] | null = null;

function trekToUnified(trek: Trek, source: TrekSource, bookingType: BookingType, isBookable: boolean): UnifiedTrek {
  return {
    id: trek.id,
    title: trek.title,
    location: trek.location,
    country: trek.country,
    continent: trek.continent,
    duration: trek.duration,
    difficulty: trek.difficulty as UnifiedTrek['difficulty'],
    distance: trek.distance,
    elevation: trek.elevation,
    rating: trek.rating,
    reviewCount: trek.reviews,
    price: trek.price,
    image: trek.image,
    lat: trek.lat,
    lng: trek.lng,
    tags: trek.tags,
    source,
    bookingType,
    isBookable,
  };
}

export function getAllTrekIds(): string[] {
  const ids: string[] = [];
  Object.values(GLOBAL_TREKS).forEach(countries => {
    Object.values(countries).forEach(treks => {
      treks.forEach(t => ids.push(t.id));
    });
  });
  return ids;
}

export function getTrekById(id: string): UnifiedTrek | null {
  let found: Trek | null = null;
  let continent = '';
  let country = '';
  Object.entries(GLOBAL_TREKS).forEach(([c, countries]) => {
    Object.entries(countries).forEach(([co, treks]) => {
      const t = treks.find(trek => trek.id === id);
      if (t) { found = t; continent = c; country = co; }
    });
  });
  if (!found) return null;
  const info = canonicalTrekSources[id] || { bookingType: 'none' as BookingType, isBookable: false };
  return {
    ...trekToUnified(found, 'canonical', info.bookingType, info.isBookable),
    continent,
    country,
  };
}

export interface DemoTrekOptions {
  countryName: string;
  continentName: string;
  count?: number;
}

export function generateDemoTreks(options: DemoTrekOptions): UnifiedTrek[] {
  const { countryName, continentName, count = 120 } = options;
  const prefixes = ['Mount', 'Lake', 'Valley', 'Peak', 'Ridge', 'Glacier', 'Pass', 'Forest', 'Hidden', 'Wild'];
  const suffixes = ['Loop', 'Circuit', 'Path', 'Trail', 'Ascent', 'Trek', 'Crossing', 'Base Camp', 'Expedition', 'Way'];
  const images = ['/images/mont_blanc.png', '/images/patagonia.png', '/images/annapurna.png'];
  const result: UnifiedTrek[] = [];
  for (let i = 0; i < count; i++) {
    const diffs: UnifiedTrek['difficulty'][] = ['Easy', 'Moderate', 'Hard'];
    result.push({
      id: `demo-${countryName.toLowerCase().replace(/\s+/g, '-')}-${i}`,
      title: `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]} ${Math.floor(Math.random() * 999)}`,
      location: `${countryName}, ${continentName} (Demo)`,
      duration: `${Math.floor(Math.random() * 12) + 1} Days`,
      difficulty: diffs[Math.floor(Math.random() * 3)],
      rating: 0,
      price: 0,
      image: images[Math.floor(Math.random() * images.length)],
      tags: ['Demo Trek Data'],
      continent: continentName,
      country: countryName,
      distance: `${Math.floor(Math.random() * 140) + 10} km`,
      elevation: `${Math.floor(Math.random() * 4000) + 500} m`,
      source: 'demo',
      bookingType: 'none',
      isBookable: false,
    });
  }
  demoCache = result;
  return result;
}

export function getDemoTreks(): UnifiedTrek[] {
  return demoCache || [];
}

export function getDemoTrekById(id: string): UnifiedTrek | null {
  if (!demoCache) return null;
  return demoCache.find(t => t.id === id) || null;
}

export function resolveTrek(id: string): UnifiedTrek | null {
  return getTrekById(id) || getDemoTrekById(id);
}
