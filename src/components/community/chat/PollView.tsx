import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { IconCheck, IconUsers, IconClock, IconEyeOff, IconList, IconListDetails } from '@tabler/icons-react';
import type { ChatPoll, ChatPollVote } from '@/lib/database.types';

interface PollViewProps {
  poll: ChatPoll;
  votes: ChatPollVote[];
  userId: string;
  onVote: (optionIndex: number) => void;
  isClosed?: boolean;
}

function getExpiryText(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m left`;
  return `${mins}m left`;
}

export function PollView({ poll, votes, userId, onVote, isClosed }: PollViewProps) {
  const options = useMemo(() => {
    const raw = poll.options;
    if (Array.isArray(raw)) return raw as string[];
    if (typeof raw === 'object' && raw !== null) return Object.values(raw) as string[];
    return [];
  }, [poll.options]);

  const totalVotes = votes.length;

  const optionVotes = useMemo(() => {
    const counts = Array(options.length).fill(0);
    votes.forEach(v => {
      if (v.option_index >= 0 && v.option_index < options.length) {
        counts[v.option_index]++;
      }
    });
    return counts;
  }, [votes, options.length]);

  const userVotedIndex = useMemo(() => {
    const userVote = votes.find(v => v.user_id === userId);
    return userVote?.option_index ?? -1;
  }, [votes, userId]);

  const closed = isClosed || poll.is_closed || (!!poll.expires_at && new Date(poll.expires_at).getTime() <= Date.now());

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white border border-black/5 shadow-sm p-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-bold text-sm leading-snug flex-1">{poll.question}</h4>
        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          {poll.is_multiple_choice && (
            <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <IconListDetails className="w-3 h-3" /> Multiple
            </span>
          )}
          {!poll.is_multiple_choice && (
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <IconList className="w-3 h-3" /> Single
            </span>
          )}
          {poll.is_anonymous && (
            <span className="text-[10px] font-semibold text-gray-500 bg-black/5 px-2 py-0.5 rounded-full flex items-center gap-0.5">
              <IconEyeOff className="w-3 h-3" /> Anonymous
            </span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {options.map((option, idx) => {
          const voteCount = optionVotes[idx];
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isVoted = userVotedIndex === idx;
          const canVote = !closed && (!isVoted || poll.is_multiple_choice);

          return (
            <motion.button
              key={idx}
              whileTap={canVote ? { scale: 0.98 } : undefined}
              onClick={() => { if (canVote) onVote(idx); }}
              disabled={!canVote}
              className={`w-full relative overflow-hidden rounded-xl border p-3 text-left transition-all ${
                isVoted
                  ? 'border-brand-emerald bg-emerald-50'
                  : closed
                    ? 'border-black/5 bg-gray-50/50 cursor-default'
                    : 'border-black/10 bg-white hover:border-brand-emerald/30 hover:bg-emerald-50/50 cursor-pointer'
              }`}
            >
              {/* Percentage bar */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className={`absolute inset-y-0 left-0 rounded-xl ${
                  isVoted ? 'bg-emerald-100/80' : 'bg-black/5'
                }`}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {isVoted && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <IconCheck className="w-4 h-4 text-brand-emerald flex-shrink-0" />
                    </motion.div>
                  )}
                  <span className="text-sm font-medium truncate">{option}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={`text-xs font-semibold ${isVoted ? 'text-brand-emerald' : 'text-gray-500'}`}>
                    {percentage}%
                  </span>
                  <span className="text-[11px] text-gray-400">({voteCount})</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <IconUsers className="w-3.5 h-3.5" />
          <span>{totalVotes} vote{totalVotes !== 1 ? 's' : ''}</span>
        </div>
        {poll.expires_at && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <IconClock className="w-3.5 h-3.5" />
            <span>{getExpiryText(poll.expires_at)}</span>
          </div>
        )}
        {closed && (
          <span className="text-[10px] font-semibold text-gray-400 bg-black/5 px-2 py-0.5 rounded-full">Closed</span>
        )}
      </div>
    </motion.div>
  );
}
