import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconMessageDots, IconLanguage, IconMessage, IconBackpack, IconListCheck,
  IconFileDescription, IconNavigation, IconX, IconRobot, IconSend,
} from '@tabler/icons-react';
import type { ChatMessage } from '@/lib/database.types';

interface AIAssistantProps {
  conversationId: string;
  messages: ChatMessage[];
  onInsertText: (text: string) => void;
  onClose: () => void;
}

const ACTIONS = [
  { id: 'summarize', icon: IconMessageDots, label: 'Summarize Unread', prompt: 'Summarize the unread messages in this conversation concisely.' },
  { id: 'translate', icon: IconLanguage, label: 'Translate', prompt: 'Translate the recent messages to {language}.' },
  { id: 'suggest', icon: IconMessage, label: 'Suggest Replies', prompt: 'Suggest 3 short replies for the latest message.' },
  { id: 'packing', icon: IconBackpack, label: 'Create Packing List', prompt: 'Create a comprehensive packing list for a trekking expedition.' },
  { id: 'checklist', icon: IconListCheck, label: 'Create Checklist', prompt: 'Create a pre-trek safety and preparation checklist.' },
  { id: 'explain_gpx', icon: IconFileDescription, label: 'Explain GPX', prompt: 'Explain what a GPX file is and how it is used in trekking.' },
  { id: 'convert_coords', icon: IconNavigation, label: 'Convert Coordinates', prompt: 'Explain how to convert between different coordinate formats for trekking.' },
];

export function AIAssistant({ conversationId, messages, onInsertText, onClose }: AIAssistantProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('');

  const handleAction = useCallback(async (action: typeof ACTIONS[0]) => {
    setActiveAction(action.id);
    setLoading(true);
    setResult(null);

    let prompt = action.prompt;

    if (action.id === 'translate') {
      const lang = language || 'English';
      prompt = prompt.replace('{language}', lang);
    }

    if (action.id === 'summarize' || action.id === 'suggest') {
      const recentMessages = messages.slice(-10).map(m => m.content).filter(Boolean).join('\n');
      prompt += `\n\nContext:\n${recentMessages}`;
    }

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, conversationId }),
      });
      const data = await res.json();
      setResult(data.reply || data.text || 'No response from AI.');
    } catch {
      setResult('Error connecting to AI service. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [conversationId, messages, language]);

  const handleInsert = () => {
    if (result) {
      onInsertText(result);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full flex flex-col bg-white border-l border-black/5"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-black/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
            <IconRobot className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-bold text-sm">AI Assistant</h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5">
          <IconX className="w-4 h-4" />
        </button>
      </div>

      {/* Action buttons */}
      <div className="p-3 space-y-1.5 overflow-y-auto flex-shrink-0">
        {ACTIONS.map(action => {
          const Icon = action.icon;
          const isActive = activeAction === action.id;
          return (
            <motion.button
              key={action.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction(action)}
              disabled={loading}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                  : 'bg-black/5 hover:bg-black/10 text-gray-700'
              } disabled:opacity-50`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{action.label}</span>
            </motion.button>
          );
        })}

        {/* Language input for translate */}
        {activeAction === 'translate' && (
          <div className="pt-1 px-1">
            <input
              type="text"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              placeholder="Target language (e.g., French)"
              className="w-full px-3 py-2 bg-black/5 border border-black/10 rounded-xl text-sm focus:outline-none focus:border-purple-400"
            />
          </div>
        )}
      </div>

      {/* Result area */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-12"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-gray-400 font-medium">Thinking...</span>
              </div>
            </motion.div>
          )}

          {result && !loading && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-4 border border-purple-100"
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed text-gray-700">{result}</p>
              <button
                onClick={handleInsert}
                className="mt-3 w-full py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
              >
                <IconSend className="w-4 h-4" /> Insert into Chat
              </button>
            </motion.div>
          )}

          {!result && !loading && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-3">
                <IconRobot className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-sm font-medium text-gray-500">Select an action above</p>
              <p className="text-xs text-gray-400 mt-1">to get AI-powered assistance</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
