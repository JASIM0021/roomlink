# RoomLink

A real-time private messaging application with video/audio calls and file sharing. Create instant chat rooms with shareable links - no signup required.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Socket.io](https://img.shields.io/badge/Socket.io-4.8-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Instant Room Creation** - Generate shareable room links with one click
- **Real-time Messaging** - Send and receive messages instantly via WebSockets
- **Video & Audio Calls** - Peer-to-peer calls using WebRTC
- **File Sharing** - Share images, videos, audio, and documents
- **Typing Indicators** - See when others are typing
- **No Database Required** - All sessions are ephemeral and in-memory
- **Beautiful UI** - Vibrant gradient theme with smooth animations

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Real-time**: [Socket.io](https://socket.io/) for messaging and signaling
- **Video/Audio**: WebRTC for peer-to-peer media streaming
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/roomlink.git
   cd roomlink
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Usage

1. Click "Create Room" on the landing page
2. Enter your name to join the room
3. Share the room link with others
4. Start chatting, sharing files, or make video/audio calls

## Project Structure

```
roomlink/
├── src/
│   ├── app/
│   │   ├── page.tsx                 # Landing page
│   │   ├── room/[roomId]/page.tsx   # Chat room page
│   │   ├── layout.tsx               # Root layout
│   │   └── globals.css              # Global styles
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── chat/
│   │   │   ├── ChatContainer.tsx    # Main chat area
│   │   │   ├── ChatInput.tsx        # Message input
│   │   │   └── MessageBubble.tsx    # Message display
│   │   ├── video/
│   │   │   ├── VideoCall.tsx        # Video call interface
│   │   │   └── IncomingCallModal.tsx # Incoming call notification
│   │   └── shared/
│   │       ├── RoomHeader.tsx       # Room header with controls
│   │       └── UsersSidebar.tsx     # Users list sidebar
│   ├── hooks/
│   │   ├── useSocket.ts             # Socket.io connection hook
│   │   └── useVideoCall.ts          # WebRTC video call hook
│   ├── lib/
│   │   └── socket.ts                # Socket.io client setup
│   └── types/
│       └── index.ts                 # TypeScript interfaces
├── server.ts                        # Custom server with Socket.io
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js Application                   │
├─────────────────────────────────────────────────────────┤
│  Frontend (React)          │  Backend (Custom Server)   │
│  ├── Landing Page          │  ├── Socket.io Server      │
│  ├── Room Page             │  ├── Room Management       │
│  ├── Chat Components       │  └── WebRTC Signaling      │
│  ├── Video Call            │                            │
│  └── File Sharing          │                            │
├─────────────────────────────────────────────────────────┤
│                    In-Memory Storage                     │
│  rooms: Map<roomId, { users, messages, createdAt }>     │
└─────────────────────────────────────────────────────────┘
```

## How It Works

### Room Creation
1. User clicks "Create Room"
2. Server generates a unique room ID (format: `xxx-xxx-xxx`)
3. User is redirected to the room page
4. Room exists in memory until all users leave

### Real-time Messaging
1. Messages are sent via Socket.io events
2. Server broadcasts messages to all room participants
3. Files are converted to base64 and sent as data URLs

### Video/Audio Calls
1. Caller initiates call via Socket.io
2. Receiver gets incoming call notification with ringtone
3. On accept, WebRTC peer connection is established
4. ICE candidates are exchanged via Socket.io (signaling)
5. Media streams flow directly peer-to-peer

## Socket Events

### Client → Server

| Event | Description |
|-------|-------------|
| `join-room` | Join a chat room |
| `leave-room` | Leave current room |
| `send-message` | Send text or file message |
| `typing` | User started typing |
| `stop-typing` | User stopped typing |
| `initiate-call` | Start a video/audio call |
| `accept-call` | Accept incoming call |
| `reject-call` | Reject incoming call |
| `end-call` | End active call |
| `webrtc-offer` | Send WebRTC offer |
| `webrtc-answer` | Send WebRTC answer |
| `webrtc-ice-candidate` | Send ICE candidate |

### Server → Client

| Event | Description |
|-------|-------------|
| `room-users` | List of users in room |
| `user-joined` | New user joined |
| `user-left` | User left room |
| `new-message` | New message received |
| `user-typing` | User is typing |
| `user-stop-typing` | User stopped typing |
| `call-initiated` | Incoming call notification |
| `call-accepted` | Call was accepted |
| `call-rejected` | Call was rejected |
| `call-ended` | Call ended |
| `webrtc-offer` | Received WebRTC offer |
| `webrtc-answer` | Received WebRTC answer |
| `webrtc-ice-candidate` | Received ICE candidate |

## Contributing

Contributions are welcome! Here's how you can help:

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run linting: `npm run lint`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Areas for Contribution

- **UI/UX Improvements** - Enhance the user interface
- **New Features** - Screen sharing, message reactions, etc.
- **Bug Fixes** - Fix any issues you find
- **Documentation** - Improve docs or add examples
- **Testing** - Add unit or integration tests
- **Performance** - Optimize for better performance

### Code Style

- Use TypeScript for type safety
- Follow the existing code patterns
- Use functional components with hooks
- Keep components small and focused

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Known Limitations

- **No Persistence** - Messages are lost when room is empty
- **Two Users Max for Calls** - Video/audio calls work best with 2 users
- **File Size Limit** - Maximum 10MB per file
- **Browser Support** - Requires modern browser with WebRTC support

## Future Improvements

- [ ] Screen sharing
- [ ] Message reactions
- [ ] Room passwords
- [ ] Message persistence (optional)
- [ ] Multi-party video calls
- [ ] End-to-end encryption
- [ ] Mobile app (React Native)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Socket.io](https://socket.io/) for real-time communication
- [Framer Motion](https://www.framer.com/motion/) for animations

---

Made with love by contributors worldwide
