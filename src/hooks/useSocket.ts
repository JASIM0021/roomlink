'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket';
import type { ServerToClientEvents, ClientToServerEvents, User, Message, TypingUser } from '@/types';

interface UseSocketOptions {
  roomId: string;
  userName: string;
}

interface UseSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  users: User[];
  messages: Message[];
  typingUsers: TypingUser[];
  currentUser: User | null;
  sendMessage: (content: string) => void;
  sendTyping: () => void;
  sendStopTyping: () => void;
  initiateCall: (isVideo: boolean) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
}

export function useSocket({ roomId, userName }: UseSocketOptions): UseSocketReturn {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socketInstance = connectSocket();
    setSocket(socketInstance);

    const onConnect = () => {
      setIsConnected(true);
      socketInstance.emit('join-room', { roomId, userName });
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onRoomUsers = (roomUsers: User[]) => {
      setUsers(roomUsers);
      // Find current user (the one that just joined)
      const me = roomUsers.find(u => u.socketId === socketInstance.id);
      if (me) {
        setCurrentUser(me);
      }
    };

    const onUserJoined = (user: User) => {
      setUsers(prev => [...prev, user]);
    };

    const onUserLeft = (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setTypingUsers(prev => prev.filter(u => u.id !== userId));
    };

    const onNewMessage = (message: Message) => {
      setMessages(prev => [...prev, message]);
    };

    const onUserTyping = (user: TypingUser) => {
      setTypingUsers(prev => {
        if (prev.find(u => u.id === user.id)) return prev;
        return [...prev, user];
      });
    };

    const onUserStopTyping = (userId: string) => {
      setTypingUsers(prev => prev.filter(u => u.id !== userId));
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('disconnect', onDisconnect);
    socketInstance.on('room-users', onRoomUsers);
    socketInstance.on('user-joined', onUserJoined);
    socketInstance.on('user-left', onUserLeft);
    socketInstance.on('new-message', onNewMessage);
    socketInstance.on('user-typing', onUserTyping);
    socketInstance.on('user-stop-typing', onUserStopTyping);

    if (socketInstance.connected) {
      onConnect();
    }

    return () => {
      socketInstance.off('connect', onConnect);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.off('room-users', onRoomUsers);
      socketInstance.off('user-joined', onUserJoined);
      socketInstance.off('user-left', onUserLeft);
      socketInstance.off('new-message', onNewMessage);
      socketInstance.off('user-typing', onUserTyping);
      socketInstance.off('user-stop-typing', onUserStopTyping);
      socketInstance.emit('leave-room');
      disconnectSocket();
    };
  }, [roomId, userName]);

  const sendMessage = useCallback((content: string) => {
    if (!socket || !content.trim()) return;
    socket.emit('send-message', { content: content.trim(), type: 'text' });
  }, [socket]);

  const sendTyping = useCallback(() => {
    if (!socket) return;
    socket.emit('typing');

    // Auto stop typing after 2 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('stop-typing');
    }, 2000);
  }, [socket]);

  const sendStopTyping = useCallback(() => {
    if (!socket) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit('stop-typing');
  }, [socket]);

  const initiateCall = useCallback((isVideo: boolean) => {
    if (!socket) return;
    socket.emit('initiate-call', { isVideo });
  }, [socket]);

  const acceptCall = useCallback(() => {
    if (!socket) return;
    socket.emit('accept-call');
  }, [socket]);

  const rejectCall = useCallback(() => {
    if (!socket) return;
    socket.emit('reject-call');
  }, [socket]);

  const endCall = useCallback(() => {
    if (!socket) return;
    socket.emit('end-call');
  }, [socket]);

  return {
    socket,
    isConnected,
    users,
    messages,
    typingUsers,
    currentUser,
    sendMessage,
    sendTyping,
    sendStopTyping,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall
  };
}
