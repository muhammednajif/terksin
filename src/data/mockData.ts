import { getAllTreks, type Trek } from './globalTreks';

export type { Trek };
export const TREKS: Trek[] = getAllTreks();

export const CATEGORIES = [
  { name: "Alpine", icon: "🏔️" },
  { name: "Jungle", icon: "🌴" },
  { name: "Desert", icon: "🏜️" },
  { name: "Coastal", icon: "🌊" },
  { name: "Glacier", icon: "🧊" },
  { name: "Cultural", icon: "🏛️" }
];
