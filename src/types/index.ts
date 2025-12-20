export interface User {
  id: string;
  socketId: string;
  name: string;
  avatar: string;
  color: string;
  joinedAt: Date;
}

export interface Message {
  id: string;
  type: 'text' | 'file' | 'system' | 'call';
  content: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  timestamp: Date;
  file?: FileInfo;
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  progress?: number;
}

export interface Room {
  id: string;
  users: Map<string, User>;
  createdAt: Date;
}

export interface CallState {
  isActive: boolean;
  isVideo: boolean;
  isAudio: boolean;
  callerId?: string;
  receiverId?: string;
}

export interface TypingUser {
  id: string;
  name: string;
}

// Socket event types
export interface ServerToClientEvents {
  'user-joined': (user: User) => void;
  'user-left': (userId: string) => void;
  'room-users': (users: User[]) => void;
  'new-message': (message: Message) => void;
  'user-typing': (user: TypingUser) => void;
  'user-stop-typing': (userId: string) => void;
  'file-chunk': (data: { fileId: string; chunk: ArrayBuffer; progress: number }) => void;
  'file-complete': (file: FileInfo) => void;
  'call-initiated': (data: { callerId: string; callerName: string; isVideo: boolean }) => void;
  'call-accepted': (data: { accepterId: string }) => void;
  'call-rejected': (data: { rejecterId: string }) => void;
  'call-ended': () => void;
  'webrtc-offer': (data: { offer: RTCSessionDescriptionInit; from: string }) => void;
  'webrtc-answer': (data: { answer: RTCSessionDescriptionInit; from: string }) => void;
  'webrtc-ice-candidate': (data: { candidate: RTCIceCandidateInit; from: string }) => void;
  'error': (message: string) => void;
}

export interface ClientToServerEvents {
  'join-room': (data: { roomId: string; userName: string }) => void;
  'leave-room': () => void;
  'send-message': (data: { content: string; type: 'text' | 'file' | 'system'; file?: FileInfo }) => void;
  'typing': () => void;
  'stop-typing': () => void;
  'initiate-call': (data: { isVideo: boolean }) => void;
  'accept-call': () => void;
  'reject-call': () => void;
  'end-call': () => void;
  'webrtc-offer': (data: { offer: RTCSessionDescriptionInit; to: string }) => void;
  'webrtc-answer': (data: { answer: RTCSessionDescriptionInit; to: string }) => void;
  'webrtc-ice-candidate': (data: { candidate: RTCIceCandidateInit; to: string }) => void;
  'send-file-chunk': (data: {
    fileId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    chunk: ArrayBuffer;
    chunkIndex: number;
    totalChunks: number;
  }) => void;
}
