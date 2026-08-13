import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { AIOrchestrator } from './services/orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.AI_SERVER_PORT || 3099;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// ============================================================
// TREK DATABASE
// ============================================================
const TREKS = [
  { id: 'chembra-peak', title: 'Chembra Peak', location: 'Wayanad, Kerala', country: 'India', continent: 'Asia', lat: 11.5432, lng: 76.0928, difficulty: 'Easy', duration: '1 day', distance: '13 km', elevation: '2,100m', rating: 4.6, price: 1500, image: 'https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=800', tags: ['beginner', 'forest', 'lake', 'weekend'], terrain: 'forest', bestSeason: 'Oct-Feb', description: 'A scenic trek through tea plantations to a heart-shaped lake.' },
  { id: 'meesapulimala', title: 'Meesapulimala', location: 'Munnar, Kerala', country: 'India', continent: 'Asia', lat: 10.0928, lng: 77.0593, difficulty: 'Moderate', duration: '2 days', distance: '16 km', elevation: '2,640m', rating: 4.7, price: 3000, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', tags: ['grasslands', 'sunrise', 'camping'], terrain: 'mountain', bestSeason: 'Sep-Mar', description: 'The second highest peak in Kerala with sweeping grassland views.' },
  { id: 'kodachadri', title: 'Kodachadri', location: 'Shimoga, Karnataka', country: 'India', continent: 'Asia', lat: 13.798, lng: 75.058, difficulty: 'Moderate', duration: '1 day', distance: '14 km', elevation: '1,343m', rating: 4.5, price: 2000, image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800', tags: ['waterfall', 'forest', 'sunset'], terrain: 'forest', bestSeason: 'Oct-Feb', description: 'A diverse trek through forests with waterfalls and a sunset viewpoint.' },
  { id: 'kumara-parvatha', title: 'Kumara Parvatha', location: 'Kodagu, Karnataka', country: 'India', continent: 'Asia', lat: 12.456, lng: 75.712, difficulty: 'Hard', duration: '2 days', distance: '22 km', elevation: '1,712m', rating: 4.8, price: 2500, image: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800', tags: ['challenging', 'camping', 'panoramic'], terrain: 'mountain', bestSeason: 'Oct-Mar', description: 'One of Karnataka toughest treks with dense forest and grassy peaks.' },
  { id: 'tadiandamol', title: 'Tadiandamol', location: 'Coorg, Karnataka', country: 'India', continent: 'Asia', lat: 12.205, lng: 75.633, difficulty: 'Easy', duration: '1 day', distance: '10 km', elevation: '1,748m', rating: 4.4, price: 1500, image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800', tags: ['beginner', 'grasslands', 'shola'], terrain: 'forest', bestSeason: 'Oct-Mar', description: 'A gentle trek through shola forests and grasslands.' },
  { id: 'rajmachi', title: 'Rajmachi Fort', location: 'Lonavala, Maharashtra', country: 'India', continent: 'Asia', lat: 18.673, lng: 73.388, difficulty: 'Easy', duration: '1 day', distance: '8 km', elevation: '827m', rating: 4.3, price: 1200, image: 'https://images.unsplash.com/photo-1580734075808-4ff0b5f4a0d0?w=800', tags: ['fort', 'monsoon', 'beginner'], terrain: 'forest', bestSeason: 'Jun-Feb', description: 'A historic fort trek with lush green valleys and waterfalls.' },
  { id: 'harishchandragad', title: 'Harishchandragad', location: 'Malshej Ghat, Maharashtra', country: 'India', continent: 'Asia', lat: 19.392, lng: 73.777, difficulty: 'Moderate', duration: '2 days', distance: '16 km', elevation: '1,424m', rating: 4.6, price: 2500, image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800', tags: ['fort', 'camping', 'caves'], terrain: 'mountain', bestSeason: 'Nov-Mar', description: 'Ancient fort with a natural Shiva linga and stunning sunrise.' },
  { id: 'kheerganga', title: 'Kheerganga Trek', location: 'Parvati Valley, Himachal', country: 'India', continent: 'Asia', lat: 32.023, lng: 77.319, difficulty: 'Moderate', duration: '2 days', distance: '24 km', elevation: '2,960m', rating: 4.5, price: 3500, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', tags: ['hot-springs', 'camping', 'pine-forest'], terrain: 'mountain', bestSeason: 'May-Oct', description: 'A beautiful trek ending in natural hot springs.' },
  { id: 'triund', title: 'Triund Trek', location: 'McLeodganj, Himachal', country: 'India', continent: 'Asia', lat: 32.243, lng: 76.325, difficulty: 'Easy', duration: '1 day', distance: '9 km', elevation: '2,828m', rating: 4.4, price: 1500, image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800', tags: ['beginner', 'sunset', 'dhauladhar'], terrain: 'mountain', bestSeason: 'Mar-Nov', description: 'A short rewarding trek with panoramic views of the Dhauladhar range.' },
  { id: 'hampta-pass', title: 'Hampta Pass', location: 'Manali, Himachal', country: 'India', continent: 'Asia', lat: 32.292, lng: 77.179, difficulty: 'Moderate', duration: '5 days', distance: '35 km', elevation: '4,270m', rating: 4.8, price: 8000, image: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800', tags: ['cross-country', 'camping', 'high-altitude'], terrain: 'mountain', bestSeason: 'Jun-Oct', description: 'A cross-country trek from Kullu to Spiti valleys.' },
  { id: 'valley-of-flowers', title: 'Valley of Flowers', location: 'Chamoli, Uttarakhand', country: 'India', continent: 'Asia', lat: 30.728, lng: 79.605, difficulty: 'Moderate', duration: '4 days', distance: '24 km', elevation: '3,658m', rating: 4.9, price: 6000, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', tags: ['flowers', 'UNESCO', 'meadow'], terrain: 'forest', bestSeason: 'Jul-Sep', description: 'A UNESCO World Heritage site with alpine flowers and waterfalls.' },
  { id: 'kedarkantha', title: 'Kedarkantha', location: 'Sankri, Uttarakhand', country: 'India', continent: 'Asia', lat: 31.031, lng: 78.108, difficulty: 'Easy', duration: '6 days', distance: '20 km', elevation: '3,850m', rating: 4.7, price: 7000, image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800', tags: ['beginner', 'snow', 'summit'], terrain: 'snow', bestSeason: 'Dec-Apr', description: 'A winter trek popular among beginners for its manageable snow climb.' },
  { id: 'nag-tibba', title: 'Nag Tibba', location: 'Uttarakhand', country: 'India', continent: 'Asia', lat: 30.6, lng: 78.0, difficulty: 'Easy', duration: '2 days', distance: '14 km', elevation: '3,022m', rating: 4.3, price: 3500, image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', tags: ['beginner', 'weekend', 'snow'], terrain: 'mountain', bestSeason: 'All year', description: 'The highest peak in the Lesser Himalayan range, perfect for beginners.' },
  { id: 'sandakphu', title: 'Sandakphu', location: 'Darjeeling, West Bengal', country: 'India', continent: 'Asia', lat: 27.105, lng: 88.001, difficulty: 'Moderate', duration: '7 days', distance: '42 km', elevation: '3,636m', rating: 4.8, price: 10000, image: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?w=800', tags: ['everest-view', 'rhododendron', 'singalila'], terrain: 'mountain', bestSeason: 'Mar-May, Oct-Nov', description: 'Trek to the highest peak of West Bengal with views of four of the five highest peaks in the world.' },
  { id: 'everest-base-camp', title: 'Everest Base Camp', location: 'Khumbu, Nepal', country: 'Nepal', continent: 'Asia', lat: 27.9881, lng: 86.925, difficulty: 'Hard', duration: '14 days', distance: '130 km', elevation: '5,364m', rating: 4.9, price: 45000, image: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800', tags: ['iconic', 'high-altitude', 'teahouse'], terrain: 'mountain', bestSeason: 'Mar-May, Sep-Nov', description: 'The classic Himalayan trek to the foot of the worlds highest peak.' },
  { id: 'annapurna-circuit', title: 'Annapurna Circuit', location: 'Annapurna, Nepal', country: 'Nepal', continent: 'Asia', lat: 28.789, lng: 83.932, difficulty: 'Hard', duration: '16 days', distance: '200 km', elevation: '5,416m', rating: 4.8, price: 50000, image: 'https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=800', tags: ['thorong-la', 'diverse', 'teahouse'], terrain: 'mountain', bestSeason: 'Mar-May, Sep-Nov', description: 'A circuit around the Annapurna massif through diverse landscapes.' },
  { id: 'kilimanjaro', title: 'Kilimanjaro Machame Route', location: 'Moshi, Tanzania', country: 'Tanzania', continent: 'Africa', lat: -3.0674, lng: 37.3556, difficulty: 'Hard', duration: '7 days', distance: '62 km', elevation: '5,895m', rating: 4.7, price: 80000, image: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800', tags: ['summit', 'glacier', 'iconic'], terrain: 'mountain', bestSeason: 'Jun-Oct, Dec-Mar', description: 'The worlds highest free-standing mountain via the scenic Machame route.' },
];

// ============================================================
// WEATHER TOOL (Open-Meteo - free, no API key needed)
// ============================================================
async function getWeather(lat, lng, dateStr) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    if (!data.daily) return { available: false, error: 'Weather data unavailable' };
    const forecasts = data.daily.time.map((t, i) => ({
      date: t, maxTemp: data.daily.temperature_2m_max[i], minTemp: data.daily.temperature_2m_min[i],
      precipitation: data.daily.precipitation_sum[i], rainProb: data.daily.precipitation_probability_max[i],
      windSpeed: data.daily.wind_speed_10m_max[i], sunrise: data.daily.sunrise[i], sunset: data.daily.sunset[i],
    }));
    const target = forecasts.find(f => f.date === dateStr) || forecasts[0];
    return { available: true, current: target, forecast: forecasts, source: 'Open-Meteo', fetchedAt: new Date().toISOString() };
  } catch { return { available: false, error: 'Failed to fetch weather' }; }
}

// ============================================================
// TOOL HELPERS
// ============================================================
function searchTreks({ location, difficulty, duration, terrain, budget, maxBudget, experience }) {
  let results = [...TREKS];
  if (location) {
    const loc = location.toLowerCase();
    results = results.filter(t => t.location.toLowerCase().includes(loc) || t.title.toLowerCase().includes(loc) || t.country.toLowerCase().includes(loc));
  }
  if (difficulty) {
    const d = difficulty.toLowerCase();
    if (d === 'easy' || d === 'beginner') results = results.filter(t => t.difficulty === 'Easy');
    else if (d === 'moderate') results = results.filter(t => t.difficulty === 'Moderate');
    else if (d === 'hard' || d === 'difficult' || d === 'expert') results = results.filter(t => t.difficulty === 'Hard');
  }
  if (terrain) {
    const t = terrain.toLowerCase();
    results = results.filter(trek => trek.terrain?.toLowerCase().includes(t) || trek.tags.some(tag => tag.includes(t)));
  }
  if (duration) {
    const days = parseInt(duration);
    if (!isNaN(days)) results = results.filter(t => parseInt(t.duration) <= days + 1);
  }
  if (budget || maxBudget) {
    const max = maxBudget || budget || Infinity;
    results = results.filter(t => t.price <= max);
  }
  return results.slice(0, 10);
}

function calculateBudget(travelers, trekPrice) {
  const perPerson = {
    transport: Math.round(trekPrice * 0.3), permits: Math.round(trekPrice * 0.15),
    guide: Math.round(trekPrice * 0.2), food: Math.round(trekPrice * 0.15),
    accommodation: Math.round(trekPrice * 0.1), equipment: Math.round(trekPrice * 0.05),
    emergency: Math.round(trekPrice * 0.05),
  };
  const total = Object.values(perPerson).reduce((a, b) => a + b, 0);
  return { perPerson, totalPerPerson: total, totalGroup: total * travelers, travelers, note: 'Estimates based on typical costs. Actual prices may vary.' };
}

function generatePackingList(trek, weather) {
  const items = [
    { category: 'Essential', items: ['Trekking shoes', 'Backpack (30-40L)', 'Water bottle (2L)', 'ID proof', 'Phone + power bank'] },
    { category: 'Clothing', items: ['Quick-dry t-shirts', 'Trekking pants', 'Fleece jacket', 'Raincoat/poncho', 'Hat/cap', 'Extra socks'] },
    { category: 'Food & Hydration', items: ['Energy bars', 'Dry fruits & nuts', 'Electrolyte powder', 'Packed lunch'] },
    { category: 'Safety', items: ['First aid kit', 'Torch/headlamp', 'Whistle', 'Emergency blanket', 'Sunscreen'] },
  ];
  if (weather?.available) {
    if (weather.current?.rainProb > 50) items[0].items.push('Waterproof cover for bag');
    if (weather.current?.maxTemp < 10) items[1].items.push('Thermal layers', 'Gloves');
    if (weather.current?.maxTemp > 30) items[1].items.push('Sun hat', 'UV protection sleeves');
  }
  if (trek.difficulty === 'Hard' || (parseInt(trek.elevation?.replace(/[,\s]/g, '')) || 0) > 3000) items[3].items.push('Diamox (if prescribed)', 'Portable oxygen (optional)');
  if (trek.tags?.includes('camping')) items.push({ category: 'Camping', items: ['Tent', 'Sleeping bag', 'Sleeping mat', 'Camp stove', 'Mess kit'] });
  return items;
}

function assessSafety(trek, weather, experience) {
  const risks = [];
  if (weather?.available && weather.current?.rainProb > 60) risks.push('High rain probability');
  if (weather?.available && weather.current?.windSpeed > 40) risks.push('Strong winds');
  if ((parseInt(trek.elevation?.replace(/[,\s]/g, '')) || 0) > 3000) risks.push('High altitude');
  if (trek.difficulty === 'Hard' && experience !== 'expert' && experience !== 'intermediate') risks.push('Difficulty exceeds stated experience');
  const level = risks.length === 0 ? 'Low' : risks.length <= 2 ? 'Moderate' : 'High';
  return { level, risks: risks.length > 0 ? risks : ['No significant risks identified from available data'], dataStatus: weather?.available ? 'weather_checked' : 'basic' };
}

// ============================================================
// AI ORCHESTRATOR
// ============================================================
const orchestrator = new AIOrchestrator(TREKS, getWeather);

// ============================================================
// CONVERSATION STATE (in-memory)
// ============================================================
const conversations = new Map();

function getConversation(id) {
  if (!id) {
    id = 'conv_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  }
  if (!conversations.has(id)) {
    conversations.set(id, { id, messages: [], preferences: {}, currentPlan: null, createdAt: new Date().toISOString() });
  }
  return conversations.get(id);
}

// ============================================================
// API ROUTES
// ============================================================

// Health check
app.get('/api/ai/health', async (req, res) => {
  try {
    const health = await orchestrator.checkHealth();
    res.json({
      status: 'ok',
      treksCount: TREKS.length,
      provider: 'ollama',
      ollama: health.available,
      modelInstalled: health.modelInstalled,
      modelName: health.modelName || null,
      hasApiKey: false,
      mode: 'local_ollama',
    });
  } catch {
    res.json({ status: 'ok', treksCount: TREKS.length, provider: 'ollama', ollama: false, modelInstalled: false, hasApiKey: false, mode: 'local_ollama' });
  }
});

// Chat endpoint (with streaming support)
app.post('/api/ai/chat', async (req, res) => {
  const { message, conversation_id, history, stream } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required', retryable: false });
  }

  // Check Ollama availability
  const health = await orchestrator.checkHealth();
  if (!health.available) {
    return res.status(503).json({
      error: 'Treksin AI is currently offline. Make sure Ollama is running on this computer.',
      retryable: true,
      details: { ollamaAvailable: false, modelInstalled: false }
    });
  }
  if (!health.modelInstalled) {
    return res.status(503).json({
      error: 'The qwen3.5:9b model is not installed. Run: ollama pull qwen3.5:9b',
      retryable: true,
      details: { ollamaAvailable: true, modelInstalled: false }
    });
  }

  const conv = getConversation(conversation_id);

  // Add user message
  conv.messages.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

  // If streaming requested, use SSE
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullContent = '';
    try {
      const historyForStream = buildHistoryForStream(conv);
      const streamGen = orchestrator.provider.stream(historyForStream, { temperature: 0.7 });
      for await (const chunk of streamGen) {
        fullContent += chunk.content;
        res.write(`data: ${JSON.stringify({ content: chunk.content, done: chunk.done || false })}\n\n`);
        if (chunk.done) {
          const response = orchestrator.parseResponse(fullContent);
          conv.messages.push({ role: 'assistant', content: fullContent, structuredData: response, timestamp: new Date().toISOString() });
          conv.currentPlan = response.plan || conv.currentPlan;
          if (response.preferences) conv.preferences = { ...conv.preferences, ...response.preferences };
          res.write(`data: ${JSON.stringify({ done: true, final: { conversationId: conv.id, data: response } })}\n\n`);
        }
      }
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: true, message: 'AI generation failed. Check Ollama connection.' })}\n\n`);
    }
    res.end();
    return;
  }

  // Non-streaming request
  try {
    const result = await orchestrator.processMessage(conv, message);

    conv.messages.push({
      role: 'assistant',
      content: result.message,
      structuredData: result,
      timestamp: new Date().toISOString(),
    });
    if (result.plan) conv.currentPlan = result.plan;
    if (result.preferences) conv.preferences = { ...conv.preferences, ...result.preferences };

    res.json({ conversationId: conv.id, data: result });
  } catch (err) {
    res.json({
      conversationId: conv.id,
      error: 'Treksin AI encountered an error. Please try again.',
      retryable: true,
    });
  }
});

function buildHistoryForStream(conv) {
  const msgs = conv.messages.slice(-12);
  const systemMsg = {
    role: 'system',
    content: `You are Treksin AI, an intelligent trekking assistant. Current preferences: ${JSON.stringify(conv.preferences)}. Available treks: ${TREKS.length} in database.`
  };
  return [systemMsg, ...msgs.map(m => ({ role: m.role === 'assistant' ? (m.structuredData?.responseType === 'clarification' ? 'assistant' : 'assistant') : m.role, content: m.content }))];
}

// Tool: Search treks
app.post('/api/ai/tools/search-treks', (req, res) => {
  const params = req.body;
  if (!params || Object.keys(params).length === 0) return res.json(TREKS.map(t => ({ ...t, matchScore: 50, dataStatus: 'verified' })));
  const results = searchTreks(params);
  res.json(results.map(t => ({ ...t, matchScore: 70, dataStatus: 'verified' })));
});

// Tool: Weather
app.post('/api/ai/tools/weather', async (req, res) => {
  const { lat, lng, date } = req.body;
  if (!lat || !lng) return res.json({ available: false, error: 'Location required' });
  const weather = await getWeather(lat, lng, date);
  res.json(weather);
});

// Tool: Budget
app.post('/api/ai/tools/budget', (req, res) => {
  const { travelers, trekPrice } = req.body;
  if (!travelers || !trekPrice) return res.json({ error: 'travelers and trekPrice required' });
  res.json(calculateBudget(travelers, trekPrice));
});

// Tool: Packing list
app.post('/api/ai/tools/packing', (req, res) => {
  const { trek, weather } = req.body;
  if (!trek) return res.json({ error: 'trek data required' });
  res.json(generatePackingList(trek, weather));
});

// Tool: Safety assessment
app.post('/api/ai/tools/safety', (req, res) => {
  const { trek, weather, experience } = req.body;
  if (!trek) return res.json({ error: 'trek data required' });
  res.json(assessSafety(trek, weather, experience));
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`\nTreksin AI Server running on http://localhost:${PORT}`);
  console.log(`Trek database: ${TREKS.length} treks loaded`);
  console.log(`AI Provider: Ollama (${process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'})`);
  console.log(`Model: ${process.env.OLLAMA_MODEL || 'qwen3.5:9b'}`);
  console.log('');
});
