/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';
import { sendChatMessage, checkAiHealth } from '@/lib/ai-client';
import { PlanCard, WeatherCard, BudgetCard, SafetyCard, PackingCard } from '@/components/ai/PlanCard';
import {
  Sparkles, Send, Plus, MessageSquare, Bookmark, Trash2, Menu, X,
  Loader2, MapPin, Bot, User, AlertCircle, WifiOff,
  Zap, DollarSign, Sun, Users, Trees, Compass, Radar
} from 'lucide-react';
import { TrailIntelligenceMini } from '@/components/trekpulse/TrailIntelligenceCard';
import { fetchTrailScore } from '@/lib/trekpulse';

const QUICK_PROMPTS = [
  { icon: Zap, label: 'Plan a weekend trek near me' },
  { icon: DollarSign, label: 'Find a trek under ₹3000' },
  { icon: Users, label: 'Plan for my group' },
  { icon: Sun, label: 'Find good weather trek' },
  { icon: Trees, label: 'Find a forest trail' },
  { icon: Compass, label: 'I don\'t know where to go' },
];

const LOADING_STATES = [
  'Understanding your preferences...',
  'Searching suitable treks...',
  'Checking weather conditions...',
  'Comparing available options...',
  'Building your itinerary...',
];

export const AiPlanner = () => {
  const { user } = useAuth();
  const showToast = useStore(s => s.showToast);

  const [messages, setMessages] = useState<{ role: string; content: string; data?: any }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [serverStatus, setServerStatus] = useState<'checking' | 'ok' | 'unreachable' | 'model_missing'>('checking');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Check server health
  useEffect(() => {
    checkAiHealth().then(status => {
      if (status.status === 'unreachable' || !status.ollama) setServerStatus('unreachable');
      else if (status.modelInstalled === false) setServerStatus('model_missing');
      else setServerStatus('ok');
    });
  }, []);

  // Load conversations
  useEffect(() => {
    if (!user) return;
    supabase.from('ai_conversations').select('*').order('updated_at', { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setConversations(data); });
    supabase.from('trek_plans').select('*').order('updated_at', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setSavedPlans(data); });
  }, [user]);

  // Loading text rotation
  useEffect(() => {
    if (!loading) { setLoadingText(''); return; }
    let i = 0;
    setLoadingText(LOADING_STATES[0]);
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_STATES.length;
      setLoadingText(LOADING_STATES[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const msg = text.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    try {
      const result = await sendChatMessage(msg, conversationId || undefined);
      if (result.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.error || 'Something went wrong',
          data: { responseType: 'warning' as const, warnings: [result.error || 'Unknown error'] }
        }]);
        if (result.retryable) showToast('AI temporarily unavailable. Try again.');
      } else if (result.data) {
        setConversationId(result.conversationId);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.data!.message,
          data: result.data
        }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: err.message?.includes('timed out') ? 'Request timed out. Please try again.' : 'Connection error. Check if the AI server is running.',
        data: { responseType: 'warning', warnings: ['Connection error'] }
      }]);
    }
    setLoading(false);
  }, [loading, conversationId]);

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setSidebarOpen(false);
    inputRef.current?.focus();
  };

  const loadConversation = async (id: string) => {
    setConversationId(id);
    setSidebarOpen(false);
    const { data } = await supabase.from('ai_messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true });
    if (data) {
      setMessages(data.map(m => ({
        role: m.role,
        content: m.content,
        data: m.structured_data,
      })));
    }
  };

  const saveConversation = async () => {
    if (!user || !conversationId || messages.length === 0) {
      showToast('Nothing to save yet');
      return;
    }

    // Upsert conversation
    const firstMsg = messages.find(m => m.role === 'user')?.content || 'New Plan';
    const title = firstMsg.length > 50 ? firstMsg.slice(0, 50) + '...' : firstMsg;

    const { error: convError } = await supabase.from('ai_conversations').upsert({
      id: conversationId,
      user_id: user.id,
      title,
    });

    if (convError) { showToast('Failed to save'); return; }

    // Upsert messages
    for (const msg of messages) {
      await supabase.from('ai_messages').upsert({
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        structured_data: msg.data || null,
      });
    }

    showToast('Conversation saved!');
    // Refresh list
    const { data } = await supabase.from('ai_conversations').select('*').order('updated_at', { ascending: false }).limit(20);
    if (data) setConversations(data);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('ai_messages').delete().eq('conversation_id', id);
    await supabase.from('ai_conversations').delete().eq('id', id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (conversationId === id) { setConversationId(null); setMessages([]); }
    showToast('Conversation deleted');
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  // Render individual message
  const renderMessage = (msg: { role: string; content: string; data?: any }, idx: number) => {
    const isUser = msg.role === 'user';
    const d = msg.data;

    return (
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-brand-emerald/20' : 'bg-black/10'
        }`}>
          {isUser ? <User className="w-4 h-4 text-brand-emerald" /> : <Bot className="w-4 h-4" />}
        </div>

        <div className={`max-w-[85%] space-y-3 ${isUser ? 'items-end' : 'items-start'}`}>
          {/* Text message */}
          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser ? 'bg-brand-emerald text-white rounded-tr-md' : 'bg-white border border-black/10 rounded-tl-md'
          }`}>
            {msg.content}
          </div>

          {/* Recommendations */}
          {d?.recommendations?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
              {d.recommendations.map((trek: any, i: number) => (
                <PlanCard key={trek.id || i} trek={trek} index={i} onSelect={() => {
                  sendMessage(`Tell me more about ${trek.title} and create a detailed plan`);
                }} />
              ))}
            </div>
          )}

          {/* Weather */}
          {d?.plan?.weather && <WeatherCard weather={d.plan.weather} />}

          {/* Budget */}
          {d?.plan?.budget && <BudgetCard budget={d.plan.budget} />}

          {/* Safety */}
          {d?.plan?.safety && <SafetyCard safety={d.plan.safety} />}

          {/* Packing */}
          {d?.plan?.packingList && <PackingCard packingList={d.plan.packingList} />}

          {/* Warnings */}
          {d?.warnings?.length > 0 && (
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  {d.warnings.map((w: string, i: number) => (
                    <p key={i} className="text-xs text-yellow-700">{w}</p>
                  ))}
                  {d.sourcesUsed?.includes('trekpulse') && (
                    <p className="text-[10px] text-yellow-500 mt-1">
                      ⓘ This recommendation is based on current Trail Intelligence data.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TrekPulse for recommended treks */}
          {d?.recommendations?.length > 0 && (
            <TrekPulseInsight recommendations={d.recommendations} />
          )}

          {/* Sources */}
          {d?.sourcesUsed?.length > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Sources: {d.sourcesUsed.join(', ')}
            </p>
          )}
        </div>
      </motion.div>
    );
  };

  // TrekPulse insight for recommended treks
  const TrekPulseInsight = ({ recommendations }: { recommendations: any[] }) => {
    const [pulseScores, setPulseScores] = useState<Record<string, any>>({});
    useEffect(() => {
      recommendations.forEach(async (trek: any) => {
        if (trek.id && !pulseScores[trek.id]) {
          const score = await fetchTrailScore(trek.id);
          if (score) setPulseScores(prev => ({ ...prev, [trek.id]: score }));
        }
      });
    }, [recommendations]);

    const entries = Object.values(pulseScores);
    if (entries.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Radar className="w-3 h-3" /> Trail Intelligence (TrekPulse)
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {recommendations.filter((t: any) => pulseScores[t.id]).map((trek: any) => (
            <TrailIntelligenceMini key={trek.id} score={pulseScores[trek.id]} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 flex">
      {/* Server Status Banner */}
      {serverStatus === 'unreachable' && (
        <div className="fixed top-16 left-0 right-0 z-30 bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-red-700">
          <WifiOff className="w-4 h-4" />
          Treksin AI is currently offline. Make sure Ollama is running on this computer.
          <button onClick={() => { setServerStatus('checking'); checkAiHealth().then(s => { if (s.ollama && s.modelInstalled) setServerStatus('ok'); else if (!s.ollama) setServerStatus('unreachable'); else setServerStatus('model_missing'); }); }} className="ml-2 px-3 py-1 bg-red-100 rounded-lg text-xs hover:bg-red-200">Retry</button>
        </div>
      )}
      {serverStatus === 'model_missing' && (
        <div className="fixed top-16 left-0 right-0 z-30 bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-center gap-2 text-sm text-yellow-700">
          <AlertCircle className="w-4 h-4" />
          The Qwen3.5 9B model is not installed. Run: <code className="px-2 py-0.5 bg-yellow-100 rounded text-xs">ollama pull qwen3.5:9b</code>
        </div>
      )}

      {/* Mobile Sidebar Toggle */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-20 left-4 z-30 md:hidden p-2 rounded-xl bg-white border border-black/10 shadow-lg">
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-20 left-0 z-20 w-72 h-[calc(100vh-5rem)] bg-white border-r border-black/10 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="p-4 border-b border-black/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand-emerald/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-brand-emerald" />
            </div>
            <span className="font-bold text-sm">Treksin AI</span>
          </div>
          <button onClick={startNewConversation}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-emerald text-white rounded-xl text-sm font-semibold hover:bg-brand-emerald/90 transition-all">
            <Plus className="w-4 h-4" /> New Plan
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Conversations */}
          {conversations.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Recent Conversations
              </h3>
              <div className="space-y-1">
                {conversations.map(conv => (
                  <button key={conv.id} onClick={() => loadConversation(conv.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm transition-colors hover:bg-black/5 ${
                      conversationId === conv.id ? 'bg-brand-emerald/10 text-brand-emerald font-medium' : ''
                    }`}>
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate">{conv.title}</span>
                    <button onClick={(e) => deleteConversation(conv.id, e)}
                      className="p-1 hover:bg-black/10 rounded-lg opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Saved Plans */}
          {savedPlans.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                <Bookmark className="w-3 h-3" /> Saved Plans
              </h3>
              <div className="space-y-1">
                {savedPlans.map(plan => (
                  <button key={plan.id} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left text-sm hover:bg-black/5 transition-colors">
                    <MapPin className="w-3.5 h-3.5 text-brand-emerald flex-shrink-0" />
                    <span className="flex-1 truncate">{plan.title || 'Untitled Plan'}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{plan.status}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!user && (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">Sign in to save conversations</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-black/10">
          <p className="text-[10px] text-muted-foreground text-center">
            Powered by Ollama + Qwen3.5 9B
          </p>
        </div>
      </aside>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-[calc(100vh-5rem)]">
        {/* Welcome / Messages */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-lg"
              >
                <div className="w-16 h-16 rounded-2xl bg-brand-emerald/20 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-8 h-8 text-brand-emerald" />
                </div>
                <h1 className="text-3xl md:text-4xl font-bold font-heading mb-3">
                  Treksin AI
                </h1>
                <p className="text-muted-foreground mb-8">
                  Your intelligent trekking planner. Tell me what you're looking for, and I'll find the perfect adventure.
                </p>

                {/* Quick Prompts */}
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                  {QUICK_PROMPTS.map((q, i) => (
                    <button key={i} onClick={() => handleQuickPrompt(q.label)}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border border-black/10 bg-white hover:bg-black/5 transition-all text-left text-sm font-medium">
                      <q.icon className="w-4 h-4 text-brand-emerald flex-shrink-0" />
                      <span className="leading-tight">{q.label}</span>
                    </button>
                  ))}
                </div>

                {!user && (
                  <p className="text-xs text-muted-foreground mt-8">
                    Sign in to save your conversations and plans
                  </p>
                )}
              </motion.div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg, idx) => renderMessage(msg, idx))}
            </div>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="max-w-4xl mx-auto flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-brand-emerald animate-pulse" />
              </div>
              <div className="bg-white border border-black/10 rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <AnimatePresence mode="wait">
                    <motion.span key={loadingText} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {loadingText}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-black/10 bg-white px-4 md:px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Ask Treksin AI to plan your trek..."
                disabled={loading || serverStatus === 'unreachable' || serverStatus === 'model_missing'}
                className="w-full px-5 py-3.5 bg-black/5 border border-black/10 rounded-2xl text-sm focus:outline-none focus:border-brand-emerald focus:ring-1 focus:ring-brand-emerald/30 transition-all disabled:opacity-50"
              />
            </div>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading || serverStatus === 'unreachable' || serverStatus === 'model_missing'}
              className="p-3.5 bg-brand-emerald text-white rounded-2xl hover:bg-brand-emerald/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
            {user && conversationId && messages.length > 0 && (
              <button onClick={saveConversation}
                className="p-3.5 border border-black/10 rounded-2xl hover:bg-black/5 transition-all flex-shrink-0"
                title="Save conversation">
                <Bookmark className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Treksin AI uses real trek data and Ollama locally. Verify critical information before your trip.
          </p>
        </div>
      </div>
    </div>
  );
};
