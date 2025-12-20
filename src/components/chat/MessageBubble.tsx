'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar }: MessageBubbleProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const downloadFile = () => {
    if (!message.file?.url) return;

    const link = document.createElement('a');
    link.href = message.file.url;
    link.download = message.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // System message
  if (message.type === 'system' || message.type === 'call') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-4"
      >
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm text-muted-foreground">
          {message.type === 'call' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          )}
          <span>{message.content}</span>
        </div>
      </motion.div>
    );
  }

  // File message
  if (message.type === 'file' && message.file) {
    const isImage = message.file.type.startsWith('image/');
    const isVideo = message.file.type.startsWith('video/');
    const isAudio = message.file.type.startsWith('audio/');
    const fileUrl = message.file.url;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
      >
        {!isOwn && showAvatar && (
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback style={{ backgroundColor: message.senderColor }}>
              {message.senderName[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        {!isOwn && !showAvatar && <div className="w-8 shrink-0" />}

        <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {showAvatar && !isOwn && (
            <span className="text-xs text-muted-foreground ml-1 mb-1">
              {message.senderName}
            </span>
          )}
          <div
            className={`rounded-2xl overflow-hidden ${
              isOwn
                ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500'
                : 'bg-secondary'
            }`}
          >
            {/* Image preview */}
            {isImage && fileUrl && (
              <div className="relative">
                {!imageLoaded && (
                  <div className="w-full h-48 bg-black/20 flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
                    />
                  </div>
                )}
                <img
                  src={fileUrl}
                  alt={message.file.name}
                  className={`max-w-full max-h-64 object-contain cursor-pointer ${imageLoaded ? '' : 'hidden'}`}
                  onLoad={() => setImageLoaded(true)}
                  onClick={() => window.open(fileUrl, '_blank')}
                />
              </div>
            )}

            {/* Video preview */}
            {isVideo && fileUrl && (
              <video
                controls
                className="max-w-full max-h-64"
                preload="metadata"
              >
                <source src={fileUrl} type={message.file.type} />
                Your browser does not support video playback.
              </video>
            )}

            {/* Audio preview */}
            {isAudio && fileUrl && (
              <div className="p-3">
                <audio controls className="w-full min-w-[250px]" preload="metadata">
                  <source src={fileUrl} type={message.file.type} />
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            {/* File info and download button */}
            <div className="p-3 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isOwn ? 'bg-white/20' : 'bg-muted'
              }`}>
                {isImage ? (
                  <svg className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ) : isVideo ? (
                  <svg className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                ) : isAudio ? (
                  <svg className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                  </svg>
                ) : (
                  <svg className={`w-5 h-5 ${isOwn ? 'text-white' : 'text-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : ''}`}>
                  {message.file.name}
                </p>
                <p className={`text-xs ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                  {formatFileSize(message.file.size)}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={downloadFile}
                className={`shrink-0 ${isOwn ? 'text-white hover:bg-white/20' : ''}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </Button>
            </div>
          </div>
          <span className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right' : 'ml-1'}`}>
            {formatTime(message.timestamp)}
          </span>
        </div>
      </motion.div>
    );
  }

  // Text message
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} gap-2`}
    >
      {!isOwn && showAvatar && (
        <Avatar className="w-8 h-8 shrink-0">
          <AvatarFallback style={{ backgroundColor: message.senderColor }}>
            {message.senderName[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      {!isOwn && !showAvatar && <div className="w-8 shrink-0" />}

      <div className={`max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {showAvatar && !isOwn && (
          <span className="text-xs text-muted-foreground ml-3 mb-1">
            {message.senderName}
          </span>
        )}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded-br-md'
              : 'bg-secondary rounded-bl-md'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <span className={`text-xs text-muted-foreground mt-1 ${isOwn ? 'text-right' : 'ml-3'}`}>
          {formatTime(message.timestamp)}
        </span>
      </div>
    </motion.div>
  );
}
