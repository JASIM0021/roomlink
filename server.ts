import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import type { ServerToClientEvents, ClientToServerEvents, User, Message, Room, FileInfo } from './src/types';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory storage
const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const fileChunks = new Map<string, ArrayBuffer[]>();

// User colors for avatars
const userColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

function getRandomColor(): string {
  return userColors[Math.floor(Math.random() * userColors.length)];
}

function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const segments = [];
  for (let i = 0; i < 3; i++) {
    let segment = '';
    for (let j = 0; j < 3; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(segment);
  }
  return segments.join('-');
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);

    // API endpoint to create a new room
    if (parsedUrl.pathname === '/api/create-room' && req.method === 'POST') {
      const roomId = generateRoomId();
      rooms.set(roomId, {
        id: roomId,
        users: new Map(),
        createdAt: new Date()
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ roomId }));
      return;
    }

    // API endpoint to check if room exists
    if (parsedUrl.pathname?.startsWith('/api/room/') && req.method === 'GET') {
      const roomId = parsedUrl.pathname.split('/').pop();
      const exists = rooms.has(roomId!);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ exists }));
      return;
    }

    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    maxHttpBufferSize: 10 * 1024 * 1024 // 10MB for file transfers
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('join-room', ({ roomId, userName }) => {
      // Create room if it doesn't exist
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          id: roomId,
          users: new Map(),
          createdAt: new Date()
        });
      }

      const room = rooms.get(roomId)!;

      // Create user
      const user: User = {
        id: uuidv4(),
        socketId: socket.id,
        name: userName || `User ${room.users.size + 1}`,
        avatar: userName?.[0]?.toUpperCase() || 'U',
        color: getRandomColor(),
        joinedAt: new Date()
      };

      // Add user to room
      room.users.set(socket.id, user);
      socketToRoom.set(socket.id, roomId);

      // Join socket room
      socket.join(roomId);

      // Send current users to the new user
      const users = Array.from(room.users.values());
      socket.emit('room-users', users);

      // Notify others about new user
      socket.to(roomId).emit('user-joined', user);

      // Send system message
      const systemMessage: Message = {
        id: uuidv4(),
        type: 'system',
        content: `${user.name} joined the room`,
        senderId: 'system',
        senderName: 'System',
        senderColor: '#888888',
        timestamp: new Date()
      };
      io.to(roomId).emit('new-message', systemMessage);

      console.log(`${user.name} joined room ${roomId}`);
    });

    socket.on('leave-room', () => {
      handleLeaveRoom(socket);
    });

    socket.on('send-message', ({ content, type, file }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(socket.id);
      if (!user) return;

      const message: Message = {
        id: uuidv4(),
        type,
        content,
        senderId: user.id,
        senderName: user.name,
        senderColor: user.color,
        timestamp: new Date(),
        file: file
      };

      io.to(roomId).emit('new-message', message);
    });

    socket.on('typing', () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(socket.id);
      if (!user) return;

      socket.to(roomId).emit('user-typing', { id: user.id, name: user.name });
    });

    socket.on('stop-typing', () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(socket.id);
      if (!user) return;

      socket.to(roomId).emit('user-stop-typing', user.id);
    });

    // File transfer handling
    socket.on('send-file-chunk', ({ fileId, fileName, fileType, fileSize, chunk, chunkIndex, totalChunks }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(socket.id);
      if (!user) return;

      // Initialize file chunks storage
      if (!fileChunks.has(fileId)) {
        fileChunks.set(fileId, new Array(totalChunks));
      }

      const chunks = fileChunks.get(fileId)!;
      chunks[chunkIndex] = chunk;

      // Calculate progress
      const receivedChunks = chunks.filter(c => c !== undefined).length;
      const progress = (receivedChunks / totalChunks) * 100;

      // Broadcast progress
      io.to(roomId).emit('file-chunk', { fileId, chunk, progress });

      // Check if file is complete
      if (receivedChunks === totalChunks) {
        const fileInfo: FileInfo = {
          id: fileId,
          name: fileName,
          size: fileSize,
          type: fileType,
          progress: 100
        };

        // Create file message
        const message: Message = {
          id: uuidv4(),
          type: 'file',
          content: fileName,
          senderId: user.id,
          senderName: user.name,
          senderColor: user.color,
          timestamp: new Date(),
          file: fileInfo
        };

        io.to(roomId).emit('new-message', message);
        io.to(roomId).emit('file-complete', fileInfo);

        // Clean up chunks
        fileChunks.delete(fileId);
      }
    });

    // WebRTC signaling for calls
    socket.on('initiate-call', ({ isVideo }) => {
      console.log('Received initiate-call from:', socket.id, 'isVideo:', isVideo);
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) {
        console.log('No room found for socket');
        return;
      }

      const room = rooms.get(roomId);
      if (!room) {
        console.log('Room not found:', roomId);
        return;
      }

      const user = room.users.get(socket.id);
      if (!user) {
        console.log('User not found in room');
        return;
      }

      console.log('Broadcasting call-initiated to room:', roomId, 'from user:', user.name);
      socket.to(roomId).emit('call-initiated', {
        callerId: user.id,
        callerName: user.name,
        isVideo
      });

      // Send system message
      const systemMessage: Message = {
        id: uuidv4(),
        type: 'call',
        content: `${user.name} started a ${isVideo ? 'video' : 'voice'} call`,
        senderId: 'system',
        senderName: 'System',
        senderColor: '#888888',
        timestamp: new Date()
      };
      io.to(roomId).emit('new-message', systemMessage);
    });

    socket.on('accept-call', () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(socket.id);
      if (!user) return;

      socket.to(roomId).emit('call-accepted', { accepterId: user.id });
    });

    socket.on('reject-call', () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      const user = room.users.get(socket.id);
      if (!user) return;

      socket.to(roomId).emit('call-rejected', { rejecterId: user.id });
    });

    socket.on('end-call', () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      io.to(roomId).emit('call-ended');
    });

    socket.on('webrtc-offer', ({ offer, to }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      // Find target socket
      for (const [socketId, user] of room.users) {
        if (user.id === to) {
          io.to(socketId).emit('webrtc-offer', { offer, from: room.users.get(socket.id)!.id });
          break;
        }
      }
    });

    socket.on('webrtc-answer', ({ answer, to }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      for (const [socketId, user] of room.users) {
        if (user.id === to) {
          io.to(socketId).emit('webrtc-answer', { answer, from: room.users.get(socket.id)!.id });
          break;
        }
      }
    });

    socket.on('webrtc-ice-candidate', ({ candidate, to }) => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;

      const room = rooms.get(roomId);
      if (!room) return;

      for (const [socketId, user] of room.users) {
        if (user.id === to) {
          io.to(socketId).emit('webrtc-ice-candidate', { candidate, from: room.users.get(socket.id)!.id });
          break;
        }
      }
    });

    socket.on('disconnect', () => {
      handleLeaveRoom(socket);
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  function handleLeaveRoom(socket: any) {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    const user = room.users.get(socket.id);
    if (user) {
      // Send system message
      const systemMessage: Message = {
        id: uuidv4(),
        type: 'system',
        content: `${user.name} left the room`,
        senderId: 'system',
        senderName: 'System',
        senderColor: '#888888',
        timestamp: new Date()
      };
      io.to(roomId).emit('new-message', systemMessage);

      // Notify others
      socket.to(roomId).emit('user-left', user.id);
    }

    // Remove user from room
    room.users.delete(socket.id);
    socketToRoom.delete(socket.id);

    // Leave socket room
    socket.leave(roomId);

    // Delete room if empty
    if (room.users.size === 0) {
      rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    }
  }

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
