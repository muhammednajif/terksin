import type { Trek } from "@/data/globalTreks";

export const fetchLiveTrailsFromOSM = async (countryName: string, continentName: string): Promise<Trek[]> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const prefixes = ["Mount", "Lake", "Valley", "Peak", "Ridge", "Glacier", "Pass", "Forest", "Hidden", "Wild"];
  const suffixes = ["Loop", "Circuit", "Path", "Trail", "Ascent", "Trek", "Crossing", "Base Camp", "Expedition", "Way"];
  const images = ["/images/mont_blanc.png", "/images/patagonia.png", "/images/annapurna.png"];
  const generated: Trek[] = [];
  for (let i = 0; i < 120; i++) {
    const diffs = ["Easy", "Moderate", "Hard"] as const;
    generated.push({
      id: `demo-${countryName.toLowerCase().replace(/\s+/g, '-')}-${i}`,
      title: `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]} ${Math.floor(Math.random() * 999)}`,
      location: `${countryName}, ${continentName} (Demo)`,
      duration: `${Math.floor(Math.random() * 12) + 1} Days`,
      difficulty: diffs[Math.floor(Math.random() * 3)],
      rating: 0,
      reviews: 0,
      price: 0,
      image: images[Math.floor(Math.random() * images.length)],
      tags: ["Demo Trek Data"],
      continent: continentName,
      country: countryName,
      distance: `${Math.floor(Math.random() * 140) + 10} km`,
      elevation: `${Math.floor(Math.random() * 4000) + 500} m`,
      source: 'demo',
      bookingType: 'none',
      isBookable: false,
    });
  }
  return generated;
};
