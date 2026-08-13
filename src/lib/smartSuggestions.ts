import { getAllTreks, type Trek } from '@/data/globalTreks';

export interface SmartSuggestion {
  trek: Trek;
  reason: string;
  score: number;
}

const STOP_WORDS = new Set(['the', 'a', 'an', 'to', 'of', 'in', 'for', 'and', 'trail', 'trek', 'route', 'track', 'walk', 'hike']);

let TREKS_CACHE: Trek[] | null = null;
function allTreks(): Trek[] {
  if (!TREKS_CACHE) TREKS_CACHE = getAllTreks();
  return TREKS_CACHE;
}

function normalize(input: string): string {
  return input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function tokenize(input: string): string[] {
  return normalize(input).split(/[^a-z0-9]+/).filter(Boolean);
}

function makeHaystack(trek: Trek): string {
  return [
    trek.title,
    trek.location,
    trek.continent || '',
    trek.country || '',
    trek.tags?.join(' ') || '',
    trek.bestSeason || '',
  ].join(' ').toLowerCase();
}

function containsAll(needles: string[], haystack: string): boolean {
  return needles.every(n => haystack.includes(n));
}

function scoreQuery(query: string, trek: Trek): number {
  const q = normalize(query);
  const haystack = makeHaystack(trek);
  const words = tokenize(query).filter(w => !STOP_WORDS.has(w));

  if (!words.length) return 0;
  if (!containsAll(words, haystack)) return 0;

  let score = words.length * 10;

  // Title match is worth the most
  const titleNorm = normalize(trek.title);
  const locationNorm = normalize(trek.location);
  const countryNorm = normalize(trek.country || '');
  const continentNorm = normalize(trek.continent || '');

  if (words.every(w => titleNorm.includes(w))) score += 50;
  if (words.some(w => titleNorm.includes(w))) score += 25;
  if (words.every(w => locationNorm.includes(w))) score += 30;
  if (words.some(w => locationNorm.includes(w))) score += 15;
  if (words.some(w => countryNorm.includes(w))) score += 20;
  if (words.some(w => continentNorm.includes(w))) score += 15;

  // Tag bonus
  const tagsNorm = trek.tags?.join(' ').toLowerCase() || '';
  if (words.some(w => tagsNorm.includes(w))) score += 10;

  // Popularity boost — helps "smart" ordering
  const popularity = (trek.rating || 0) * (Math.min(trek.reviews || 0, 5000) / 500) + (trek.rating || 0) * 5;
  score += popularity / 10;

  return score;
}

export function searchTreksSmart(query: string, limit = 6): SmartSuggestion[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const all = allTreks();
  const scored = all
    .map(trek => ({ trek, score: scoreQuery(trimmed, trek) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(s => ({
    trek: s.trek,
    score: s.score,
    reason: buildReason(trimmed, s.trek),
  }));
}

function buildReason(query: string, trek: Trek): string {
  const q = normalize(query);
  const titleNorm = normalize(trek.title);
  const locationNorm = normalize(trek.location);
  const countryNorm = normalize(trek.country || '');
  const continentNorm = normalize(trek.continent || '');

  if (countryNorm && q.includes(countryNorm)) return `Best trek in ${trek.country}`;
  if (continentNorm && q.includes(continentNorm)) return `Top pick in ${trek.continent}`;
  if (locationNorm && q.includes(locationNorm)) return `Matched "${trek.location}"`;
  if (titleNorm.includes(q)) return 'Exact title match';
  const tag = trek.tags?.find(t => q.includes(normalize(t)));
  if (tag) return `Perfect for ${tag.toLowerCase()} lovers`;
  return 'Smart match';
}

export function getTopRecommended(limit = 6): SmartSuggestion[] {
  const all = allTreks();
  return all
    .map(trek => ({
      trek,
      score: (trek.rating || 0) * 10 + Math.min(trek.reviews || 0, 5000) / 100,
      reason: trek.reviews && trek.reviews > 1000 ? 'Community favourite' : 'Highly rated by trekkers',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getRecommendationsFor(
  difficulty?: string | null,
  continent?: string | null,
  maxPrice?: number,
  limit = 6
): SmartSuggestion[] {
  const all = allTreks();
  return all
    .map(trek => {
      let score = (trek.rating || 0) * 10 + Math.min(trek.reviews || 0, 5000) / 100;
      const reasons: string[] = [];
      if (difficulty && trek.difficulty === difficulty) { score += 25; reasons.push(`Matches ${difficulty} difficulty`); }
      if (continent && trek.continent === continent) { score += 20; reasons.push(`In ${continent}`); }
      if (maxPrice && trek.price <= maxPrice) { score += 10; reasons.push('Within budget'); }
      if (trek.price === 0) score += 10;
      return {
        trek,
        score,
        reason: reasons.length ? reasons.join(' · ') : 'Trending right now',
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
