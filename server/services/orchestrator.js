import { OllamaProvider } from '../providers/ollama.js';
import { rankTreks } from './ranking.js';
import {
  SYSTEM_PROMPT,
  RESPONSE_FORMAT_INSTRUCTION,
  COMPLETE_PLAN_PROMPT,
  PACKING_PROMPT,
} from './prompts.js';

export class AIOrchestrator {
  constructor(trekDatabase, weatherService) {
    this.provider = new OllamaProvider();
    this.treks = trekDatabase;
    this.weatherService = weatherService;
  }

  async checkHealth() {
    return this.provider.healthCheck();
  }

  async processMessage(conversation, userMessage) {
    const messages = conversation.messages || [];
    const currentPrefs = conversation.preferences || {};

    // Step 1: Quickly extract preferences using regex (no LLM call)
    const preferences = this.extractPreferences(userMessage, currentPrefs);

    // Step 2: Check modification
    const isModification = this.isModificationRequest(userMessage, messages);

    // Step 3: If not enough info and few messages, ask clarification (no LLM call)
    const missingInfo = this.getMissingInformation(preferences, messages, isModification);

    if (missingInfo.length > 0 && !isModification && messages.length < 4) {
      return {
        responseType: 'clarification',
        message: this.generateClarificationQuestion(missingInfo, preferences),
        preferences,
        missingInformation: missingInfo,
        recommendations: [],
        plan: null,
        warnings: [],
        sourcesUsed: ['treksin_trek_database'],
      };
    }

    // Step 4: Rank treks deterministically
    const rankedTreks = rankTreks(this.treks, preferences);
    const topTreks = rankedTreks.slice(0, 5);

    // Step 5: Check if user selected a specific trek
    const selectedTrek = this.findSelectedTrek(userMessage, rankedTreks);

    // Step 6: Single LLM call for response generation
    if (selectedTrek && (userMessage.toLowerCase().includes('tell me more') || userMessage.toLowerCase().includes('plan') || userMessage.toLowerCase().includes('detail'))) {
      return this.generateCompletePlan(selectedTrek, preferences, messages);
    }

    if (isModification) {
      return this.handleModification(userMessage, conversation, topTreks, preferences);
    }

    return this.generateRecommendations(topTreks, preferences, messages);
  }

  extractPreferences(userMessage, currentPrefs) {
    const text = (userMessage || '').toLowerCase();
    const allText = text + ' ' + (currentPrefs._raw || '');

    const prefs = { ...currentPrefs };

    const locationMatch = text.match(/(?:from|in|near|at|starting)\s+(\w+(?:\s+\w+)?)/i);
    if (locationMatch && !prefs.startingLocation) {
      prefs.startingLocation = locationMatch[1];
    }

    const budgetMatch = text.match(/[₹₹]\s*(\d{3,6})/);
    if (budgetMatch) prefs.budget = parseInt(budgetMatch[1]);

    if (text.includes('total') && budgetMatch) prefs.budgetType = 'total';
    else if (budgetMatch && !prefs.budgetType) prefs.budgetType = 'per_person';

    const wordNumbers = { zero:0, one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10 };
    const travelersMatch = text.match(/(\d+)\s*(?:people|friends|persons?|of us|members?|trekkers)/i);
    const wordMatch = text.match(/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:people|friends|persons?|of us|members?|trekkers)\b/i);
    if (travelersMatch) prefs.travelers = parseInt(travelersMatch[1]);
    else if (wordMatch) prefs.travelers = wordNumbers[wordMatch[1].toLowerCase()];
    else if (text.includes('we are') || text.includes('group of')) prefs.travelers = prefs.travelers || 4;
    else if (text.includes('i am') || text.includes("i'm") || text.includes('i live')) prefs.travelers = prefs.travelers || 1;

    if (/beginner|new|novice|first.?time/i.test(text)) prefs.experienceLevel = 'beginner';
    else if (/expert|advanced|experienced/i.test(text)) prefs.experienceLevel = 'expert';
    else if (/intermediate|moderate/i.test(text)) prefs.experienceLevel = 'intermediate';

    if (/easy|gentle/i.test(text)) prefs.difficulty = 'easy';
    else if (/hard|difficult|challenging|tough/i.test(text)) prefs.difficulty = 'hard';
    else if (/moderate/i.test(text)) prefs.difficulty = 'moderate';

    const dayMatch = text.match(/(\d+)\s*day/i);
    if (dayMatch) prefs.durationDays = parseInt(dayMatch[1]);
    else if (/one day|single day|day trek/i.test(text)) prefs.durationDays = 1;
    else if (/weekend/i.test(text)) prefs.durationDays = 2;
    else if (/week/i.test(text) && !text.includes('weekend')) prefs.durationDays = 5;

    if (/camp|camping/i.test(text)) prefs.camping = true;
    else if (/no camp|don't camp|without camp|no camping/i.test(text)) prefs.camping = false;

    const terrains = [];
    if (/forest|jungle|woods/i.test(text)) terrains.push('forest');
    if (/mountain|hill|peak/i.test(text) && !/(?:don't|do not|not|no|without)\s*(?:want|like|prefer|need)?\s*(?:mountain|hill|peak)/i.test(text)) terrains.push('mountain');
    if (/snow|ice|glacier/i.test(text)) terrains.push('snow');
    if (/beach|coast|sea/i.test(text)) terrains.push('beach');
    if (/desert|sand/i.test(text)) terrains.push('desert');
    prefs.terrain = [...new Set([...(prefs.terrain || []), ...terrains])];

    const interests = [];
    if (/waterfall/i.test(text)) interests.push('waterfall');
    if (/sunrise|sunset/i.test(text)) interests.push('sunrise');
    if (/lake/i.test(text)) interests.push('lake');
    if (/fort|heritage/i.test(text)) interests.push('fort');
    if (/hot.?spring/i.test(text)) interests.push('hot-springs');
    if (/flower|meadow|valley/i.test(text)) interests.push('flowers');
    if (/summit|peak/i.test(text)) interests.push('summit');
    prefs.interests = [...new Set([...(prefs.interests || []), ...interests])];

    prefs._raw = (prefs._raw || '') + ' ' + text;

    return prefs;
  }

  isModificationRequest(userMessage, messages) {
    const lower = (userMessage || '').toLowerCase();
    const keywords = ['cheaper', 'reduce', 'less', 'change', 'modify', 'update', 'different',
      'shorter', 'longer', 'easier', 'harder', 'remove', 'add', 'instead', 'another',
      'cheap', 'expensive'];
    const hasPrevRecs = messages.some(m => m.role === 'assistant' && m.content && m.content.length > 50);
    return hasPrevRecs && keywords.some(k => lower.includes(k));
  }

  getMissingInformation(preferences, messages, isModification) {
    if (isModification) return [];
    const missing = [];
    const hasLocation = preferences.startingLocation || preferences.destination;
    const hasBudget = preferences.budget !== null && preferences.budget !== undefined;
    const hasDuration = preferences.durationDays !== null && preferences.durationDays !== undefined;

    const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const isVague = lastUserMsg.length < 40 &&
      /plan|suggest|recommend|help|trek|trip|adventure/i.test(lastUserMsg);

    if (isVague) {
      if (!hasLocation) missing.push('startingLocation');
      if (!hasDuration) missing.push('durationDays');
      if (!hasBudget) missing.push('budget');
    }
    return missing;
  }

  generateClarificationQuestion(missingInfo) {
    const questions = {
      startingLocation: 'Where will you be starting from, and do you have any preferred destination or region in mind?',
      durationDays: 'Are you looking for a day trek, a weekend adventure, or something longer?',
      budget: 'What is your approximate budget per person?',
    };
    if (missingInfo.length === 1) return questions[missingInfo[0]] || 'Could you tell me more about what you\'re looking for?';
    return 'To help find the perfect trek, please tell me: ' + missingInfo.map(k => questions[k]).filter(Boolean).join(' Also, ');
  }

  findSelectedTrek(userMessage, rankedTreks) {
    const msg = (userMessage || '').toLowerCase();
    for (const trek of rankedTreks) {
      if (msg.includes(trek.id) || msg.includes(trek.title.toLowerCase())) return trek;
    }
    if (rankedTreks.length > 0 && (msg.includes('tell me') || msg.includes('this one') || msg.includes('select') ||
        msg.includes('choose') || msg.includes('pick') || msg.includes('first') || msg.includes('top'))) {
      return rankedTreks[0];
    }
    return null;
  }

  async generateRecommendations(topTreks, preferences, messages) {
    const trekData = topTreks.slice(0, 3).map(t => ({
      id: t.id, title: t.title, location: t.location, difficulty: t.difficulty,
      duration: t.duration, price: t.price, rating: t.rating, tags: t.tags,
      terrain: t.terrain, description: t.description,
      matchScore: t.matchScore, matchReason: t.matchReason,
    }));

    const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));

    try {
      const result = await this.provider.generate([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'system', content: `User prefs: ${JSON.stringify(preferences)}. Treks: ${JSON.stringify(trekData)}.` },
        { role: 'system', content: 'Recommend up to 3 treks. Return JSON only: { responseType, message, recommendations: [{id, title, matchScore, matchReason}] }' },
        ...history,
      ], { temperature: 0.7, format: 'json', maxTokens: 2048 });

      const response = this.parseResponse(result.content);
      const enrichedRecs = (response.recommendations || []).map(rec => {
        return topTreks.find(t => t.id === rec.id || t.id === rec.trekId) || rec;
      }).filter(Boolean);

      return {
        responseType: enrichedRecs.length > 0 ? 'recommendations' : (response.responseType || 'clarification'),
        message: response.message || `Based on your preferences, here are ${topTreks.length} treks that match.`,
        preferences,
        missingInformation: [],
        recommendations: enrichedRecs.slice(0, 3),
        plan: null,
        warnings: response.warnings || [],
        sourcesUsed: ['treksin_trek_database'],
      };
    } catch (err) {
      return this.fallbackRecommendation(topTreks, preferences);
    }
  }

  fallbackRecommendation(topTreks, preferences) {
    const recs = topTreks.slice(0, 3);
    const msg = recs.length > 0
      ? `I found ${recs.length} treks based on your preferences. Here are the best matches.`
      : 'No trekking options matched your exact preferences. Try different criteria.';
    return {
      responseType: recs.length > 0 ? 'recommendations' : 'clarification',
      message: msg,
      preferences,
      missingInformation: [],
      recommendations: recs,
      plan: null,
      warnings: [],
      sourcesUsed: ['treksin_trek_database'],
    };
  }

  async handleModification(userMessage, conversation, topTreks, preferences) {
    const currentPlan = conversation.currentPlan;
    const msg = (userMessage || '').toLowerCase();

    let modifiedTreks = [...topTreks];
    if (/cheaper|reduce|less|budget|cheap|under/i.test(msg)) {
      const maxBudgetMatch = msg.match(/under\s*(\d{3,6})/);
      const maxBudget = maxBudgetMatch ? parseInt(maxBudgetMatch[1]) : (currentPlan?.budget?.totalPerPerson || preferences.budget || 2000) * 0.6;
      modifiedTreks = rankTreks(this.treks, { ...preferences, budget: maxBudget }).slice(0, 3);
    }
    if (/shorter|one day|1 day|single day/i.test(msg)) {
      modifiedTreks = rankTreks(this.treks, { ...preferences, durationDays: 1 }).slice(0, 3);
    }

    if (modifiedTreks.length === 0) modifiedTreks = topTreks.slice(0, 2);

    return {
      responseType: 'modification',
      message: `I've updated the recommendations based on your request. Here are some adjusted options.`,
      preferences,
      recommendations: modifiedTreks,
      plan: currentPlan,
      warnings: [],
      sourcesUsed: ['treksin_trek_database'],
    };
  }

  async generateCompletePlan(trek, preferences, messages) {
    let weatherData = null;
    try {
      if (this.weatherService && trek.lat && trek.lng) {
        weatherData = await this.weatherService(trek.lat, trek.lng);
      }
    } catch {}

    const safetyData = this.assessSafety(trek, weatherData, preferences.experienceLevel);
    const budgetData = this.calculateBudget(preferences.travelers || 1, trek.price);
    const packingList = await this.generatePackingList(trek, weatherData);

    const plan = { trek, weather: weatherData, budget: budgetData, safety: safetyData, packingList };

    const history = messages.slice(-4).map(m => ({ role: m.role, content: m.content }));

    try {
      const result = await this.provider.generate([
        { role: 'system', content: COMPLETE_PLAN_PROMPT },
        { role: 'system', content: `Trek: ${trek.title} in ${trek.location}. Prefs: ${JSON.stringify(preferences)}. Weather: ${JSON.stringify(weatherData)}. Safety: ${JSON.stringify(safetyData)}. Budget: ${JSON.stringify(budgetData)}.` },
        { role: 'system', content: 'Return JSON: { responseType, message, warnings }' },
        ...history,
      ], { temperature: 0.7, maxTokens: 2048 });

      const response = this.parseResponse(result.content);
      return {
        responseType: 'complete_plan',
        message: response.message || `Here's your complete plan for ${trek.title}.`,
        preferences,
        recommendations: [trek],
        plan,
        warnings: response.warnings || [],
        sourcesUsed: ['treksin_trek_database', ...(weatherData?.available ? ['open_meteo_weather'] : [])],
      };
    } catch {
      return {
        responseType: 'complete_plan',
        message: `Here's your complete plan for ${trek.title}.`,
        preferences,
        recommendations: [trek],
        plan,
        warnings: [],
        sourcesUsed: ['treksin_trek_database'],
      };
    }
  }

  async generatePackingList(trek, weather) {
    const defaultList = this.getDefaultPackingList(trek);
    try {
      const result = await this.provider.generate([
        { role: 'system', content: PACKING_PROMPT },
        { role: 'system', content: `Trek: ${trek.title}, ${trek.duration}, ${trek.difficulty}, ${trek.terrain}. Weather: ${JSON.stringify(weather)}.` },
      ], { temperature: 0.3, format: 'json', maxTokens: 1024 });

      const parsed = JSON.parse(result.content);
      return parsed.categories || defaultList;
    } catch { return defaultList; }
  }

  calculateBudget(travelers, trekPrice) {
    const perPerson = {
      transport: Math.round(trekPrice * 0.3), permits: Math.round(trekPrice * 0.15),
      guide: Math.round(trekPrice * 0.2), food: Math.round(trekPrice * 0.15),
      accommodation: Math.round(trekPrice * 0.1), equipment: Math.round(trekPrice * 0.05),
      emergency: Math.round(trekPrice * 0.05),
    };
    const total = Object.values(perPerson).reduce((a, b) => a + b, 0);
    return { perPerson, totalPerPerson: total, totalGroup: total * travelers, travelers, note: 'Estimates based on typical costs.' };
  }

  assessSafety(trek, weather, experience) {
    const risks = [];
    let level = 'Low';
    if (weather?.available && weather.current?.rainProb > 60) { risks.push('High rain probability'); level = 'Moderate'; }
    if (weather?.available && weather.current?.windSpeed > 40) { risks.push('Strong winds'); level = 'Moderate'; }
    const elev = parseInt((trek.elevation || '').replace(/[,\s]/g, '')) || 0;
    if (elev > 3000) { risks.push('High altitude — risk of altitude sickness'); level = 'Moderate'; }
    if (elev > 4500) { risks.push('Very high altitude — requires acclimatization'); level = 'High'; }
    if (trek.difficulty === 'Hard' && experience !== 'expert' && experience !== 'intermediate') { risks.push('Difficulty may exceed your experience'); level = 'High'; }
    return { level, risks: risks.length > 0 ? risks : ['No significant risks identified'], dataStatus: weather?.available ? 'weather_checked' : 'basic' };
  }

  getDefaultPackingList(trek) {
    const items = [
      { category: 'Essentials', items: ['Trekking shoes', 'Backpack (30-40L)', 'Water bottle (2L)', 'ID proof', 'Phone + power bank'] },
      { category: 'Clothing', items: ['Quick-dry t-shirts', 'Trekking pants', 'Fleece jacket', 'Raincoat', 'Hat', 'Extra socks'] },
      { category: 'Food & Hydration', items: ['Energy bars', 'Dry fruits', 'Electrolyte powder', 'Packed lunch'] },
      { category: 'Safety', items: ['First aid kit', 'Headlamp', 'Whistle', 'Emergency blanket', 'Sunscreen'] },
    ];
    const elev = parseInt((trek.elevation || '').replace(/[,\s]/g, '')) || 0;
    if (trek.difficulty === 'Hard' || elev > 3000) items[3].items.push('Diamox (if prescribed)');
    if (trek.tags?.includes('camping')) items.push({ category: 'Camping', items: ['Tent', 'Sleeping bag', 'Sleeping mat', 'Camp stove', 'Mess kit'] });
    return items;
  }

  parseResponse(content) {
    try { return JSON.parse(content); }
    catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) { try { return JSON.parse(match[0]); } catch {} }
    }
    return { responseType: 'warning', message: content, warnings: [] };
  }
}
