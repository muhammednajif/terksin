export function rankTreks(treks, preferences = {}) {
  if (!treks || treks.length === 0) return [];

  const ranked = treks.map(trek => {
    let score = 0;
    const reasons = [];

    // Location proximity (25%)
    if (preferences.startingLocation || preferences.destination) {
      const target = (preferences.destination || preferences.startingLocation || '').toLowerCase();
      const trekLocation = (trek.location + ' ' + trek.country + ' ' + trek.region + ' ' + (trek.state || '')).toLowerCase();
      if (target && trekLocation.includes(target)) {
        score += 25;
        reasons.push('Located in your preferred area');
      } else if (target) {
        const partialMatch = target.split(/\s+/).some(word => word.length > 3 && trekLocation.includes(word));
        if (partialMatch) {
          score += 15;
          reasons.push('Near your preferred location');
        }
      }
    } else {
      score += 10;
    }

    // Difficulty match (20%)
    const diffMap = { easy: 1, moderate: 2, hard: 3 };
    const trekDiff = diffMap[trek.difficulty?.toLowerCase()] || 2;
    if (preferences.difficulty) {
      const prefDiff = diffMap[preferences.difficulty.toLowerCase()] || 2;
      if (trekDiff === prefDiff) {
        score += 20;
        reasons.push(`Matches your preferred ${preferences.difficulty} difficulty`);
      } else if (Math.abs(trekDiff - prefDiff) === 1) {
        score += 10;
        reasons.push(`Close to your preferred ${preferences.difficulty} difficulty`);
      }
    } else if (preferences.experienceLevel) {
      const expDiff = preferences.experienceLevel === 'beginner' ? 1 : preferences.experienceLevel === 'expert' ? 3 : 2;
      if (trekDiff === expDiff) {
        score += 18;
        if (preferences.experienceLevel === 'beginner') reasons.push('Perfect for beginners');
        else reasons.push('Suitable for your experience level');
      } else if (Math.abs(trekDiff - expDiff) === 1) {
        score += 10;
      }
    } else {
      score += 10;
    }

    // Budget fit (15%)
    const cost = trek.price || 0;
    if (preferences.budget && cost > 0) {
      const budgetType = preferences.budgetType || 'per_person';
      const travelers = preferences.travelers || 1;
      const effectiveBudget = budgetType === 'total' ? preferences.budget / travelers : preferences.budget;
      if (cost <= effectiveBudget) {
        const ratio = cost / effectiveBudget;
        if (ratio <= 0.5) {
          score += 15;
          reasons.push(`Very affordable — well within your ₹${preferences.budget} budget`);
        } else if (ratio <= 0.8) {
          score += 12;
          reasons.push(`Fits within your ₹${preferences.budget} budget`);
        } else {
          score += 8;
          reasons.push(`Barely fits your ₹${preferences.budget} budget`);
        }
      } else {
        const overAmount = cost - effectiveBudget;
        if (overAmount <= effectiveBudget * 0.3) {
          score += 5;
          reasons.push(`Slightly over your ₹${preferences.budget} budget (₹${Math.round(overAmount)} extra)`);
        }
      }
    } else {
      score += 8;
    }

    // Duration match (15%)
    if (preferences.durationDays) {
      const trekDays = parseDuration(trek.duration);
      if (trekDays > 0) {
        const diff = Math.abs(trekDays - preferences.durationDays);
        if (diff === 0) {
          score += 15;
          reasons.push(`Exactly matches your ${preferences.durationDays}-day preference`);
        } else if (diff <= 1) {
          score += 12;
          reasons.push(`Close to your preferred ${preferences.durationDays}-day duration`);
        } else if (diff <= 3) {
          score += 6;
        }
      } else {
        score += 5;
      }
    } else {
      score += 7;
    }

    // Terrain preference (10%)
    if (preferences.terrain && preferences.terrain.length > 0) {
      const trekTerrain = (trek.terrain || '').toLowerCase();
      const trekTags = (trek.tags || []).map(t => t.toLowerCase());
      let terrainMatch = false;
      for (const prefT of preferences.terrain) {
        const t = prefT.toLowerCase();
        if (trekTerrain.includes(t) || trekTags.includes(t) || trekTags.some(tag => tag.includes(t))) {
          terrainMatch = true;
          break;
        }
      }
      if (terrainMatch) {
        score += 10;
        reasons.push('Matches your terrain preference');
      }
    } else {
      score += 5;
    }

    // Features match (10%) - camping, waterfalls, etc.
    if (preferences.camping === true && (trek.tags || []).includes('camping')) {
      score += 8;
      reasons.push('Camping available');
    } else if (preferences.camping === false && !(trek.tags || []).includes('camping')) {
      score += 5;
    }
    if (preferences.interests && preferences.interests.length > 0) {
      const tags = (trek.tags || []).map(t => t.toLowerCase());
      for (const interest of preferences.interests) {
        const i = interest.toLowerCase();
        if (tags.some(t => t.includes(i) || i.includes(t))) {
          score += 3;
          break;
        }
      }
    }

    // Data quality bonus (5%)
    let dataScore = 0;
    if (trek.image) dataScore += 1;
    if (trek.description && trek.description.length > 20) dataScore += 1;
    if (trek.elevation) dataScore += 1;
    if (trek.distance) dataScore += 1;
    if (trek.rating && trek.rating > 0) dataScore += 1;
    score += dataScore;

    return {
      ...trek,
      matchScore: Math.min(Math.round(score), 99),
      matchReason: reasons.length > 0 ? reasons.join('. ') : 'Available trek with standard features',
      dataStatus: dataScore >= 4 ? 'verified' : dataScore >= 2 ? 'partial' : 'minimal',
    };
  });

  ranked.sort((a, b) => b.matchScore - a.matchScore);

  return ranked;
}

function parseDuration(durationStr) {
  if (!durationStr) return 0;
  const s = durationStr.toLowerCase();
  const dayMatch = s.match(/(\d+)\s*day/);
  if (dayMatch) return parseInt(dayMatch[1]);
  if (s.includes('multi') || s.includes('multiple')) return 3;
  if (s.includes('week')) return 7;
  return 1;
}
