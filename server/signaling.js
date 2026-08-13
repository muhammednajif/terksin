import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '..', '.env') });

const PORT = process.env.SIGNALING_PORT || 3098;

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});

const rooms = new Map();

io.on('connection', (socket) => {
  const { userId, roomId } = socket.handshake.query;

  if (!userId) { socket.disconnect(); return; }

  socket.data.userId = userId;

  // Join a signaling room (conversationId)
  socket.on('join-room', (convId) => {
    socket.join(`call:${convId}`);
    socket.data.roomId = convId;
    rooms.set(socket.id, convId);
    socket.to(`call:${convId}`).emit('user-joined', { userId: socket.data.userId });
  });

  socket.on('leave-room', (convId) => {
    socket.leave(`call:${convId}`);
    rooms.delete(socket.id);
    socket.to(`call:${convId}`).emit('user-left', { userId: socket.data.userId });
  });

  // WebRTC Signaling
  socket.on('offer', ({ to, offer, conversationId }) => {
    socket.to(`call:${conversationId}`).emit('offer', {
      offer,
      from: socket.data.userId,
    });
  });

  socket.on('answer', ({ to, answer, conversationId }) => {
    socket.to(`call:${conversationId}`).emit('answer', {
      answer,
      from: socket.data.userId,
    });
  });

  socket.on('ice-candidate', ({ to, candidate, conversationId }) => {
    socket.to(`call:${conversationId}`).emit('ice-candidate', {
      candidate,
      from: socket.data.userId,
    });
  });

  // Call state management
  socket.on('call-user', ({ to, offer, conversationId, callType }) => {
    io.to(`call:${conversationId}`).emit('incoming-call', {
      from: socket.data.userId,
      offer,
      callType,
      conversationId,
    });
  });

  socket.on('accept-call', ({ to, answer, conversationId }) => {
    io.to(`call:${conversationId}`).emit('call-accepted', {
      from: socket.data.userId,
      answer,
    });
  });

  socket.on('reject-call', ({ to, conversationId }) => {
    io.to(`call:${conversationId}`).emit('call-rejected', {
      from: socket.data.userId,
    });
  });

  socket.on('end-call', ({ conversationId }) => {
    io.to(`call:${conversationId}`).emit('call-ended', {
      from: socket.data.userId,
    });
  });

  socket.on('mute-toggle', ({ conversationId, isMuted }) => {
    socket.to(`call:${conversationId}`).emit('user-muted', {
      userId: socket.data.userId,
      isMuted,
    });
  });

  socket.on('video-toggle', ({ conversationId, isVideoOff }) => {
    socket.to(`call:${conversationId}`).emit('user-video-toggle', {
      userId: socket.data.userId,
      isVideoOff,
    });
  });

  socket.on('screen-share-start', ({ conversationId }) => {
    socket.to(`call:${conversationId}`).emit('screen-share-started', {
      userId: socket.data.userId,
    });
  });

  socket.on('screen-share-stop', ({ conversationId }) => {
    socket.to(`call:${conversationId}`).emit('screen-share-stopped', {
      userId: socket.data.userId,
    });
  });

  // Live location sharing
  socket.on('location-update', ({ conversationId, lat, lng, accuracy, altitude, speed, heading, battery }) => {
    socket.to(`call:${conversationId}`).emit('location-update', {
      userId: socket.data.userId,
      lat, lng, accuracy, altitude, speed, heading, battery,
    });
  });

  // Live trek updates
  socket.on('trek-update', ({ conversationId, data }) => {
    socket.to(`call:${conversationId}`).emit('trek-update', {
      userId: socket.data.userId,
      ...data,
    });
  });

  // Typing (supplement to DB-based)
  socket.on('typing', ({ conversationId, isTyping }) => {
    socket.to(`call:${conversationId}`).emit('typing', {
      userId: socket.data.userId,
      isTyping,
    });
  });

  socket.on('disconnect', () => {
    const roomId = rooms.get(socket.id);
    if (roomId) {
      io.to(`call:${roomId}`).emit('user-left', { userId: socket.data.userId });
      rooms.delete(socket.id);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`\nTreksin Signaling Server running on ws://localhost:${PORT}`);
  console.log(`WebRTC peer connection relay enabled`);
  console.log('');
});
