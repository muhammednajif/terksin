export type TrekSource = 'canonical' | 'demo' | 'community' | 'expedition';
export type BookingType = 'self-guided' | 'community' | 'expedition' | 'none';
export type Difficulty = 'Easy' | 'Moderate' | 'Hard' | 'Extreme';

export interface UnifiedTrek {
  id: string;
  title: string;
  description?: string;
  location: string;
  country?: string;
  continent?: string;
  duration: string;
  difficulty: Difficulty;
  distance?: string;
  elevation?: string;
  terrain?: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  currency?: string;
  image: string;
  gallery?: string[];
  lat?: number;
  lng?: number;
  tags: string[];
  bestSeason?: string;
  source: TrekSource;
  bookingType: BookingType;
  isBookable: boolean;
}
