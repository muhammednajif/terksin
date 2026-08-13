import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SIGNALING_URL = import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3098';

interface CallState {
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'rejected';
  callerId: string;
  callType: 'voice' | 'video' | 'group_voice' | 'group_video';
  conversationId: string;
}

interface PeerConnection {
  pc: RTCPeerConnection;
  stream: MediaStream;
}

export function useWebRTC(userId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const [call, setCall] = useState<CallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const peerRef = useRef<PeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const iceServers: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  useEffect(() => {
    if (!userId) return;
    const socket = io(SIGNALING_URL, { query: { userId } });
    socketRef.current = socket;

    socket.on('incoming-call', ({ from, offer, callType, conversationId }) => {
      setCall({ status: 'ringing', callerId: from, callType, conversationId });
      // Store offer for when user accepts
      (window as any).__pendingOffer = offer;
    });

    socket.on('call-accepted', async ({ from, answer }) => {
      if (peerRef.current) {
        await peerRef.current.pc.setRemoteDescription(new RTCSessionDescription(answer));
        for (const c of pendingCandidatesRef.current) {
          await peerRef.current.pc.addIceCandidate(new RTCIceCandidate(c));
        }
        pendingCandidatesRef.current = [];
        setCall(prev => prev ? { ...prev, status: 'connected' } : null);
      }
    });

    socket.on('call-rejected', () => {
      cleanup();
      setCall({ status: 'rejected', callerId: '', callType: 'voice', conversationId: '' });
      setTimeout(() => setCall(null), 2000);
    });

    socket.on('call-ended', () => {
      cleanup();
      setCall(prev => prev ? { ...prev, status: 'ended' } : null);
      setTimeout(() => setCall(null), 3000);
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      if (peerRef.current?.pc.remoteDescription) {
        await peerRef.current.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    socket.on('user-muted', ({ userId: uid, isMuted: muted }) => {
      // Could show indicator that specific user muted
    });

    socket.on('user-video-toggle', ({ userId: uid, isVideoOff: off }) => {
      // Could show indicator
    });

    socket.on('screen-share-started', ({ userId: uid }) => {
      // Could show indicator
    });

    socket.on('screen-share-stopped', ({ userId: uid }) => {
      // Could show indicator
    });

    return () => {
      cleanup();
      socket.disconnect();
    };
  }, [userId]);

  const cleanup = useCallback(() => {
    peerRef.current?.pc.close();
    peerRef.current = null;
    localStream?.getTracks().forEach(t => t.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
  }, [localStream]);

  const startCall = useCallback(async (
    conversationId: string,
    callType: 'voice' | 'video'
  ) => {
    if (!socketRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      setLocalStream(stream);
      setCall({ status: 'calling', callerId: userId!, callType, conversationId });

      const pc = new RTCPeerConnection(iceServers);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.emit('ice-candidate', {
            to: conversationId,
            candidate: e.candidate.toJSON(),
            conversationId,
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
        setCall(prev => prev ? { ...prev, status: 'connected' } : null);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      peerRef.current = { pc, stream };

      socketRef.current.emit('call-user', {
        to: conversationId,
        offer,
        callType,
        conversationId,
      });

      socketRef.current.emit('join-room', conversationId);
    } catch (err) {
      console.error('[WebRTC] startCall error:', err);
    }
  }, [userId]);

  const acceptCall = useCallback(async () => {
    if (!socketRef.current || !call) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.callType.includes('video'),
      });
      setLocalStream(stream);

      const pc = new RTCPeerConnection(iceServers);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.emit('ice-candidate', {
            to: call.conversationId,
            candidate: e.candidate.toJSON(),
            conversationId: call.conversationId,
          });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
      };

      const offer = (window as any).__pendingOffer;
      if (offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        peerRef.current = { pc, stream };

        socketRef.current.emit('accept-call', {
          to: call.conversationId,
          answer,
          conversationId: call.conversationId,
        });
      }

      socketRef.current.emit('join-room', call.conversationId);
      setCall(prev => prev ? { ...prev, status: 'connected' } : null);
    } catch (err) {
      console.error('[WebRTC] acceptCall error:', err);
    }
  }, [call]);

  const rejectCall = useCallback(() => {
    socketRef.current?.emit('reject-call', {
      to: call?.conversationId,
      conversationId: call?.conversationId,
    });
    cleanup();
    setCall(null);
  }, [call, cleanup]);

  const endCall = useCallback(() => {
    socketRef.current?.emit('end-call', {
      conversationId: call?.conversationId,
    });
    if (call?.conversationId) {
      socketRef.current?.emit('leave-room', call.conversationId);
    }
    cleanup();
    setCall(prev => prev ? { ...prev, status: 'ended' } : null);
    setTimeout(() => setCall(null), 2000);
  }, [call, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => { t.enabled = isMuted; });
      setIsMuted(!isMuted);
      socketRef.current?.emit('mute-toggle', {
        conversationId: call?.conversationId,
        isMuted: !isMuted,
      });
    }
  }, [localStream, isMuted, call]);

  const toggleVideo = useCallback(() => {
    if (localStream) {
      localStream.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
      setIsVideoOff(!isVideoOff);
      socketRef.current?.emit('video-toggle', {
        conversationId: call?.conversationId,
        isVideoOff: !isVideoOff,
      });
    }
  }, [localStream, isVideoOff, call]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen share - re-add camera
      if (peerRef.current && localStream) {
        const sender = peerRef.current.pc.getSenders().find(s =>
          s.track?.kind === 'video'
        );
        if (sender) {
          const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
          sender.replaceTrack(camStream.getVideoTracks()[0]);
        }
      }
      setIsScreenSharing(false);
      socketRef.current?.emit('screen-share-stop', {
        conversationId: call?.conversationId,
      });
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (peerRef.current) {
          const sender = peerRef.current.pc.getSenders().find(s =>
            s.track?.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(screenStream.getVideoTracks()[0]);
          }
        }
        setIsScreenSharing(true);
        socketRef.current?.emit('screen-share-start', {
          conversationId: call?.conversationId,
        });
        screenStream.getVideoTracks()[0].onended = () => {
          toggleScreenShare();
        };
      } catch {
        // User cancelled
      }
    }
  }, [isScreenSharing, call, localStream]);

  return {
    call,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    socket: socketRef.current,
  };
}
