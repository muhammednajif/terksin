import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconPhone, IconPhoneOff, IconVideo, IconVideoOff, IconMicrophone, IconMicrophoneOff, IconScreenShare, IconDeviceSpeaker, IconX } from '@tabler/icons-react';
import type { ChatCallLog } from '@/lib/database.types';

interface CallUIProps {
  call: {
    status: string;
    callerId: string;
    callType: string;
    conversationId: string;
  } | null;
  userId: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function CallUI({
  call, userId, localStream, remoteStream,
  isMuted, isVideoOff, isScreenSharing,
  onAccept, onReject, onEnd, onToggleMute, onToggleVideo, onToggleScreenShare, onClose,
}: CallUIProps) {
  const [callTimer, setCallTimer] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pipPos, setPipPos] = useState({ x: 16, y: 16 });
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0 });

  useEffect(() => {
    if (call?.status === 'connected') {
      const interval = setInterval(() => setCallTimer(t => t + 1), 1000);
      setCallTimer(0);
      return () => clearInterval(interval);
    }
  }, [call?.status]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const isIncoming = call?.status === 'ringing' && call.callerId !== userId;
  const isConnected = call?.status === 'connected';
  const isEnded = call?.status === 'ended' || call?.status === 'missed' || call?.status === 'rejected';

  const handleMouseDown = (e: React.MouseEvent) => {
    setDragging(true);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pipPos.x, origY: pipPos.y };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPipPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };

  const handleMouseUp = () => {
    setDragging(false);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  return (
    <AnimatePresence>
      {call && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] bg-black flex flex-col"
        >
          {/* Incoming call */}
          <AnimatePresence mode="wait">
            {isIncoming && (
              <motion.div
                key="incoming"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-6"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-emerald to-emerald-400 flex items-center justify-center">
                  <IconPhone className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-white text-xl font-bold">Incoming {call.callType === 'video' ? 'Video' : 'Voice'} Call</h2>
                  <p className="text-gray-400 text-sm mt-1">from {call.callerId.slice(0, 8)}...</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={onReject}
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-colors"
                  >
                    <IconPhoneOff className="w-7 h-7 text-white" />
                  </button>
                  <button
                    onClick={onAccept}
                    className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center transition-colors"
                  >
                    <IconPhone className="w-7 h-7 text-white" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Connected call */}
            {isConnected && (
              <motion.div
                key="connected"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col relative"
              >
                {/* Remote video */}
                <div className="flex-1 bg-black relative">
                  {remoteStream ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
                        <IconVideoOff className="w-10 h-10 text-gray-400" />
                      </div>
                    </div>
                  )}

                  {/* Call timer */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-1.5 rounded-full">
                    <span className="text-white text-sm font-mono">{formatDuration(callTimer)}</span>
                  </div>

                  {/* Local video (Picture-in-Picture) */}
                  <motion.div
                    drag
                    dragMomentum={false}
                    onDragStart={() => setDragging(true)}
                    onDragEnd={() => setDragging(false)}
                    style={{ left: pipPos.x, top: pipPos.y }}
                    className="absolute w-32 h-48 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 cursor-grab active:cursor-grabbing"
                  >
                    {localStream && !isVideoOff ? (
                      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                        <IconVideoOff className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </motion.div>

                  {/* Controls */}
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/50 backdrop-blur-md px-5 py-3 rounded-2xl">
                    <button
                      onClick={onToggleMute}
                      className={`p-3 rounded-full transition-colors ${isMuted ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                    >
                      {isMuted ? <IconMicrophoneOff className="w-5 h-5" /> : <IconMicrophone className="w-5 h-5" />}
                    </button>
                    {call.callType === 'video' && (
                      <button
                        onClick={onToggleVideo}
                        className={`p-3 rounded-full transition-colors ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                      >
                        {isVideoOff ? <IconVideoOff className="w-5 h-5" /> : <IconVideo className="w-5 h-5" />}
                      </button>
                    )}
                    <button
                      onClick={onToggleScreenShare}
                      className={`p-3 rounded-full transition-colors ${isScreenSharing ? 'bg-brand-emerald text-white' : 'bg-white/20 text-white hover:bg-white/30'}`}
                    >
                      <IconScreenShare className="w-5 h-5" />
                    </button>
                    <button className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors">
                      <IconDeviceSpeaker className="w-5 h-5" />
                    </button>
                    <button
                      onClick={onEnd}
                      className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      <IconPhoneOff className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Call ended */}
            {isEnded && (
              <motion.div
                key="ended"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center gap-4"
              >
                <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
                  <IconPhoneOff className="w-8 h-8 text-gray-400" />
                </div>
                <div className="text-center">
                  <h2 className="text-white text-lg font-bold">Call Ended</h2>
                  <p className="text-gray-400 text-sm mt-0.5">{formatDuration(callTimer)}</p>
                </div>
                {call.status === 'missed' && (
                  <p className="text-gray-500 text-xs">Missed call</p>
                )}
                <button
                  onClick={onClose}
                  className="mt-2 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm transition-colors"
                >
                  Close
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Close button */}
          {!isIncoming && (
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10">
              <IconX className="w-5 h-5" />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
