'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket } from '@/hooks/useSocket';
import { useVideoCall } from '@/hooks/useVideoCall';
import { ChatContainer } from '@/components/chat/ChatContainer';
import { VideoCall } from '@/components/video/VideoCall';
import { IncomingCallModal } from '@/components/video/IncomingCallModal';
import { RoomHeader } from '@/components/shared/RoomHeader';
import { UsersSidebar } from '@/components/shared/UsersSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [userName, setUserName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    const storedName = localStorage.getItem('roomlink-username');
    if (storedName) {
      setUserName(storedName);
      setIsReady(true);
    }
    // Don't redirect - show name input modal instead
  }, []);

  const handleJoinRoom = () => {
    if (!nameInput.trim()) {
      toast.error('Please enter your name');
      return;
    }
    localStorage.setItem('roomlink-username', nameInput.trim());
    setUserName(nameInput.trim());
    setIsReady(true);
  };

  const {
    socket,
    isConnected,
    users,
    messages,
    typingUsers,
    currentUser,
    sendMessage,
    sendTyping,
    sendStopTyping,
  } = useSocket({ roomId, userName });

  const {
    localStream,
    remoteStream,
    isCallActive,
    isVideo,
    isMuted,
    isCameraOff,
    incomingCall,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  } = useVideoCall({ socket, currentUser, users });

  useEffect(() => {
    if (isConnected) {
      toast.success('Connected to room');
    }
  }, [isConnected]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success('Room link copied to clipboard');
  };

  const handleLeave = () => {
    router.push('/');
  };

  // Show name input modal if no username
  if (!isReady) {
    return (
      <div className="min-h-screen gradient-bg relative overflow-hidden flex items-center justify-center">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute w-96 h-96 rounded-full bg-white/5 blur-3xl"
            style={{ top: '10%', left: '10%' }}
            animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute w-80 h-80 rounded-full bg-white/5 blur-3xl"
            style={{ bottom: '20%', right: '15%' }}
            animate={{ x: [0, -40, 0], y: [0, -40, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md mx-4"
        >
          <Card className="glass p-8 space-y-6">
            <div className="text-center">
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 mb-4"
                whileHover={{ scale: 1.05 }}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">Join Room</h2>
              <p className="text-white/60 text-sm">
                Room: <span className="font-mono text-white/80">{roomId}</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Your Name</label>
              <Input
                placeholder="Enter your name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-primary focus:ring-primary"
                autoFocus
              />
            </div>

            <Button
              onClick={handleJoinRoom}
              className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Join Room
              </span>
            </Button>

            <p className="text-center text-white/40 text-sm">
              Enter your name to join the conversation
            </p>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <RoomHeader
        roomId={roomId}
        usersCount={users.length}
        isConnected={isConnected}
        onCopyLink={handleCopyLink}
        onLeave={handleLeave}
        onToggleSidebar={() => setShowSidebar(!showSidebar)}
        onStartVoiceCall={() => startCall(false)}
        onStartVideoCall={() => startCall(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatContainer
            messages={messages}
            typingUsers={typingUsers}
            currentUserId={currentUser?.id || ''}
            onSendMessage={sendMessage}
            onTyping={sendTyping}
            onStopTyping={sendStopTyping}
            socket={socket}
          />
        </div>

        {/* Users Sidebar */}
        <AnimatePresence>
          {showSidebar && (
            <UsersSidebar
              users={users}
              currentUserId={currentUser?.id || ''}
              onClose={() => setShowSidebar(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Video Call Overlay */}
      <AnimatePresence>
        {isCallActive && (
          <VideoCall
            localStream={localStream}
            remoteStream={remoteStream}
            isVideo={isVideo}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            onToggleMute={toggleMute}
            onToggleCamera={toggleCamera}
            onEndCall={endCall}
            remoteName={users.find(u => u.id !== currentUser?.id)?.name || 'User'}
            localName={currentUser?.name || 'You'}
          />
        )}
      </AnimatePresence>

      {/* Incoming Call Modal */}
      <AnimatePresence>
        {incomingCall && (
          <IncomingCallModal
            callerName={incomingCall.callerName}
            isVideo={incomingCall.isVideo}
            onAccept={acceptCall}
            onReject={rejectCall}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
