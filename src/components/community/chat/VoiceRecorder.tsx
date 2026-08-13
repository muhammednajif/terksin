import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconMicrophone, IconPlayerStop, IconPlayerPlay, IconPlayerTrackNext, IconSend, IconTrash, IconX } from '@tabler/icons-react';

interface VoiceRecorderProps {
  onSend: (blob: Blob) => void;
  onCancel: () => void;
}

export function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const [mode, setMode] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [holdMode, setHoldMode] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  // Cleanup
  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
    if (playbackRef.current) { playbackRef.current.pause(); playbackRef.current = null; }
    cancelAnimationFrame(animationRef.current);
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Waveform animation
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const bars = 48;
    const barWidth = (w - (bars - 1) * 2) / bars;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < bars; i++) {
      let barHeight: number;
      if (mode === 'recording') {
        barHeight = Math.max(2, Math.random() * audioLevel * h * 0.8);
      } else if (mode === 'preview' && audioUrl) {
        barHeight = Math.max(2, Math.sin(Date.now() / 200 + i * 0.5) * 10 + 15);
      } else {
        barHeight = 3;
      }
      const x = i * (barWidth + 2);
      const y = (h - barHeight) / 2;

      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#10b981');
      gradient.addColorStop(1, '#059669');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, 2);
      ctx.fill();
    }
    animationRef.current = requestAnimationFrame(drawWaveform);
  }, [mode, audioLevel, audioUrl]);

  useEffect(() => {
    if (mode === 'recording' || mode === 'preview') {
      drawWaveform();
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [mode, drawWaveform]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      // Audio analysis
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (analyserRef.current && mode === 'recording') {
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg / 255);
        }
        if (mode === 'recording') {
          requestAnimationFrame(updateLevel);
        }
      };
      updateLevel();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setMode('preview');
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (audioContextRef.current) audioContextRef.current.close();
      };

      recorder.start(100);
      setMode('recording');
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch {
      alert('Microphone not available');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const togglePlayback = () => {
    if (!audioUrl) return;
    if (isPlaying) {
      playbackRef.current?.pause();
      setIsPlaying(false);
    } else {
      const audio = new Audio(audioUrl);
      playbackRef.current = audio;
      audio.onended = () => setIsPlaying(false);
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSend = () => {
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      onSend(blob);
    }
    cleanup();
  };

  const handleDelete = () => {
    cleanup();
    setMode('idle');
    setAudioUrl(null);
    setDuration(0);
    setShowDeleteConfirm(false);
  };

  const handleCancel = () => {
    cleanup();
    onCancel();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      className="bg-white border-t border-black/5 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        {/* Waveform */}
        <div className="flex-1 bg-black/5 rounded-2xl h-16 p-2">
          <canvas
            ref={canvasRef}
            width={300}
            height={48}
            className="w-full h-full"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {mode === 'idle' && (
            <>
              <button
                onClick={() => setHoldMode(!holdMode)}
                className={`text-[10px] px-2 py-1 rounded-full font-medium ${holdMode ? 'bg-brand-emerald text-white' : 'bg-black/5 text-gray-500'}`}
              >
                {holdMode ? 'Hold' : 'Tap'}
              </button>
              <button
                onClick={startRecording}
                className="p-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-lg shadow-red-500/30 hover:shadow-xl transition-all active:scale-95"
              >
                <IconMicrophone className="w-5 h-5" />
              </button>
            </>
          )}

          {mode === 'recording' && (
            <>
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm font-mono font-bold text-red-500">{formatTime(duration)}</span>
              </motion.div>
              <button
                onClick={stopRecording}
                className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors active:scale-95"
              >
                <IconPlayerStop className="w-5 h-5" />
              </button>
            </>
          )}

          {mode === 'preview' && (
            <>
              <span className="text-sm font-mono font-bold">{formatTime(duration)}</span>
              <button
                onClick={togglePlayback}
                className="p-2.5 bg-brand-emerald text-white rounded-full hover:bg-emerald-600 transition-colors"
              >
                {isPlaying ? <IconPlayerStop className="w-4 h-4" /> : <IconPlayerPlay className="w-4 h-4" />}
              </button>
              {showDeleteConfirm ? (
                <div className="flex gap-1">
                  <button onClick={handleDelete} className="px-3 py-2 bg-red-500 text-white text-xs rounded-xl font-semibold">Delete</button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-2 bg-black/5 text-xs rounded-xl">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2.5 bg-black/5 text-red-500 rounded-full hover:bg-red-50 transition-colors"
                >
                  <IconTrash className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={handleSend}
                className="p-2.5 bg-gradient-to-r from-brand-emerald to-emerald-500 text-white rounded-full hover:shadow-lg transition-all active:scale-95"
              >
                <IconSend className="w-4 h-4" />
              </button>
            </>
          )}

          <button onClick={handleCancel} className="p-2 rounded-full hover:bg-black/5 transition-colors">
            <IconX className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
