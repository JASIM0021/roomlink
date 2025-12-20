'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { Message, TypingUser, ServerToClientEvents, ClientToServerEvents } from '@/types';

interface ChatContainerProps {
  messages: Message[];
  typingUsers: TypingUser[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export function ChatContainer({
  messages,
  typingUsers,
  currentUserId,
  onSendMessage,
  onTyping,
  onStopTyping,
  socket
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileDrop = useCallback((files: FileList) => {
    if (!socket || files.length === 0) return;

    Array.from(files).forEach(file => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        return;
      }

      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setUploadingFiles(prev => [...prev, fileId]);

      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          const dataUrl = e.target.result as string;

          // Send file as message
          socket.emit('send-message', {
            content: file.name,
            type: 'file',
            file: {
              id: fileId,
              name: file.name,
              size: file.size,
              type: file.type,
              url: dataUrl
            }
          });

          setUploadingFiles(prev => prev.filter(id => id !== fileId));
          toast.success(`File "${file.name}" sent`);
        }
      };

      reader.onerror = () => {
        setUploadingFiles(prev => prev.filter(id => id !== fileId));
        toast.error(`Failed to read file "${file.name}"`);
      };

      // Read as data URL (base64)
      reader.readAsDataURL(file);
    });
  }, [socket]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileDrop(e.dataTransfer.files);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col relative protected-content"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-primary/20 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="glass p-8 rounded-2xl text-center">
              <svg className="w-16 h-16 mx-auto mb-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xl font-semibold text-white">Drop files here</p>
              <p className="text-white/60 mt-2">Files will be shared with everyone in the room</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload progress */}
      <AnimatePresence>
        {uploadingFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-2 left-1/2 -translate-x-1/2 z-40 bg-primary text-white px-4 py-2 rounded-full text-sm flex items-center gap-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
            Uploading {uploadingFiles.length} file(s)...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div ref={scrollRef} className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg">No messages yet</p>
                <p className="text-sm mt-1">Start the conversation!</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
                showAvatar={
                  index === 0 ||
                  messages[index - 1]?.senderId !== message.senderId ||
                  messages[index - 1]?.type === 'system'
                }
              />
            ))
          )}

          {/* Typing indicators */}
          <AnimatePresence>
            {typingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <div className="flex gap-1">
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-2 h-2 bg-primary rounded-full"
                  />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-primary rounded-full"
                  />
                  <motion.span
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    className="w-2 h-2 bg-primary rounded-full"
                  />
                </div>
                <span>
                  {typingUsers.length === 1
                    ? `${typingUsers[0].name} is typing...`
                    : `${typingUsers.length} people are typing...`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={onSendMessage}
        onTyping={onTyping}
        onStopTyping={onStopTyping}
        onFileSelect={handleFileDrop}
      />
    </div>
  );
}
