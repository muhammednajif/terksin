export interface Trek {
  id: string;
  title: string;
  description?: string;
  location: string;
  duration: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Extreme';
  rating: number;
  reviews: number;
  price: number;
  image: string;
  lat?: number;
  lng?: number;
  tags: string[];
  continent?: string;
  country?: string;
  distance?: string;
  elevation?: string;
  source?: 'canonical' | 'demo' | 'community' | 'expedition';
  bookingType?: 'self-guided' | 'community' | 'expedition' | 'none';
  isBookable?: boolean;
  bestSeason?: string;
}

export type GlobalTrekDatabase = {
  [continent: string]: {
    [country: string]: Trek[];
  };
};

export const GLOBAL_TREKS: GlobalTrekDatabase = {
  "Asia": {
    "Nepal": [
      {
        id: "everest-base-camp",
        title: "Everest Base Camp",
        location: "Nepal, Himalayas",
        duration: "14 Days",
        difficulty: "Hard",
        rating: 4.9,
        reviews: 1240,
        price: 1200,
        image: "https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=800&q=80",
        lat: 28.0045,
        lng: 86.8526,
        distance: "130km",
        elevation: "5,364m",
        tags: ["High Altitude", "Cultural", "Scenic"]
      },
      {
        id: "annapurna-circuit",
        title: "Annapurna Circuit",
        location: "Nepal, Himalayas",
        duration: "15 Days",
        difficulty: "Moderate",
        rating: 4.8,
        reviews: 920,
        price: 900,
        image: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80",
        lat: 28.5982,
        lng: 83.9859,
        distance: "230km",
        elevation: "5,416m",
        tags: ["Villages", "Passes", "Classic"]
      }
    ],
    "India": [],
    "China": [],
    "Japan": [
      {
        id: "mount-fuji-yoshida",
        title: "Mount Fuji Yoshida Trail",
        location: "Japan, Honshu",
        duration: "2 Days",
        difficulty: "Moderate",
        rating: 4.7,
        reviews: 2100,
        price: 150,
        image: "https://images.unsplash.com/photo-1570459027562-4a916cc6113f?w=800&q=80",
        lat: 35.3606,
        lng: 138.7274,
        distance: "15km",
        elevation: "3,776m",
        tags: ["Volcano", "Iconic", "Sunrise"]
      }
    ]
  },
  "South America": {
    "Peru": [
      {
        id: "inca-trail",
        title: "Inca Trail to Machu Picchu",
        location: "Peru, Andes",
        duration: "4 Days",
        difficulty: "Moderate",
        rating: 4.8,
        reviews: 890,
        price: 750,
        image: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?w=800&q=80",
        lat: -13.2263,
        lng: -72.5005,
        distance: "43km",
        elevation: "4,215m",
        tags: ["Historic", "Jungle", "Iconic"]
      }
    ],
    "Chile": [
      {
        id: "patagonia-o-circuit",
        title: "Patagonia O Circuit",
        location: "Chile, South America",
        duration: "8 Days",
        difficulty: "Hard",
        rating: 4.9,
        reviews: 430,
        price: 950,
        image: "https://images.unsplash.com/photo-1518005068251-37900150dfca?w=800&q=80",
        lat: -51.0000,
        lng: -73.0000,
        distance: "110km",
        elevation: "1,200m",
        tags: ["Glaciers", "Remote", "Windy"]
      }
    ]
  },
  "Europe": {
    "France": [
      {
        id: "tour-du-mont-blanc",
        title: "Tour du Mont Blanc",
        location: "France/Italy/Switzerland",
        duration: "11 Days",
        difficulty: "Moderate",
        rating: 4.9,
        reviews: 650,
        price: 1100,
        image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
        lat: 45.8326,
        lng: 6.8652,
        distance: "170km",
        elevation: "4,810m",
        tags: ["Alpine", "Multi-country", "Views"]
      }
    ],
    "Spain": [
      {
        id: "camino-frances",
        title: "Camino Francés (Pyrenees to Santiago)",
        location: "Spain, Europe",
        duration: "35 Days",
        difficulty: "Moderate",
        rating: 4.9,
        reviews: 5500,
        price: 1800,
        image: "https://images.unsplash.com/photo-1558642084-fd07fae5282e?w=800&q=80",
        lat: 42.8125,
        lng: -8.5446,
        distance: "790km",
        elevation: "1,500m",
        tags: ["Pilgrimage", "Cultural", "Long Distance"]
      }
    ],
    "Switzerland": [],
    "Italy": [],
    "Germany": [],
    "Austria": [],
    "Norway": [],
    "United Kingdom": []
  },
  "Africa": {
    "Tanzania": [
      {
        id: "kilimanjaro-machame",
        title: "Kilimanjaro Machame Route",
        location: "Tanzania, Africa",
        duration: "7 Days",
        difficulty: "Hard",
        rating: 4.7,
        reviews: 1050,
        price: 2200,
        image: "https://images.unsplash.com/photo-1631646109206-4b5616964f84?w=800&q=80",
        lat: -3.0674,
        lng: 37.3556,
        distance: "62km",
        elevation: "5,895m",
        tags: ["Summit", "Wildlife", "Challenge"]
      }
    ]
  },
  "North America": {
    "USA": [
      {
        id: "john-muir-trail",
        title: "John Muir Trail",
        location: "USA, Sierra Nevada",
        duration: "21 Days",
        difficulty: "Hard",
        rating: 4.9,
        reviews: 1100,
        price: 450,
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
        lat: 36.5786,
        lng: -118.2920,
        distance: "340km",
        elevation: "4,421m",
        tags: ["Wilderness", "Lakes", "Mountains"]
      }
    ],
    "Canada": [
      {
        id: "west-coast-trail",
        title: "West Coast Trail",
        location: "Canada, British Columbia",
        duration: "7 Days",
        difficulty: "Hard",
        rating: 4.8,
        reviews: 800,
        price: 300,
        image: "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80",
        lat: 48.7297,
        lng: -124.9080,
        distance: "75km",
        elevation: "550m",
        tags: ["Coastal", "Forest", "Rugged"]
      }
    ]
  },
  "Oceania": {
    "New Zealand": [
      {
        id: "milford-track",
        title: "Milford Track",
        location: "New Zealand, South Island",
        duration: "4 Days",
        difficulty: "Moderate",
        rating: 4.9,
        reviews: 1350,
        price: 600,
        image: "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80",
        lat: -44.8037,
        lng: 167.9250,
        distance: "53km",
        elevation: "1,154m",
        tags: ["Rainforest", "Fjords", "Waterfalls"]
      }
    ]
  }
};

// Helper function to flatten the database into a single array for legacy support
export const getAllTreks = (): Trek[] => {
  const allTreks: Trek[] = [];
  Object.entries(GLOBAL_TREKS).forEach(([continent, countries]) => {
    Object.entries(countries).forEach(([country, countryTreks]) => {
      countryTreks.forEach(trek => {
        allTreks.push({
          ...trek,
          continent,
          country
        });
      });
    });
  });
  return allTreks;
};
