'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface VideoCallProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isVideo: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndCall: () => void;
  remoteName: string;
  localName?: string;
}

export function VideoCall({
  localStream,
  remoteStream,
  isVideo,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  remoteName,
  localName = 'You'
}: VideoCallProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const playAudio = () => {
    // Try to play audio from both video and audio elements
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.play().catch(console.error);
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.play().catch(console.error);
    }
    setAudioBlocked(false);
  };

  // Set up local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Set up remote video stream with audio
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.muted = false;
      remoteVideoRef.current.volume = 1.0;
      remoteVideoRef.current.play().catch(err => {
        console.log('Video autoplay prevented:', err);
      });
    }
  }, [remoteStream]);

  // Set up remote audio stream as backup (for both voice and video calls)
  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = false;
      remoteAudioRef.current.volume = 1.0;
      // Ensure audio plays
      remoteAudioRef.current.play().catch(err => {
        console.log('Audio autoplay prevented:', err);
      });
    }
  }, [remoteStream]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black flex flex-col"
    >
      {/* Hidden audio element for remote stream audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={false} />

      {/* Main content area */}
      <div className="flex-1 relative">
        {isVideo ? (
          // Video Call Layout - Grid with both videos
          <div className="w-full h-full flex items-center justify-center p-4">
            {/* Remote Video (main/large) */}
            <div className="relative w-full h-full max-w-5xl">
              {remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted={false}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl">
                  <div className="text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-32 h-32 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4"
                    >
                      <span className="text-5xl font-bold text-white">
                        {remoteName[0]?.toUpperCase()}
                      </span>
                    </motion.div>
                    <p className="text-xl text-white font-medium">{remoteName}</p>
                    <div className="flex items-center justify-center gap-2 mt-2 text-white/60">
                      <motion.div
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-2 h-2 bg-yellow-400 rounded-full"
                      />
                      <span>Waiting to connect...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Remote name label */}
              {remoteStream && (
                <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 rounded-lg">
                  <span className="text-white text-sm font-medium">{remoteName}</span>
                </div>
              )}

              {/* Local Video Preview (picture-in-picture) */}
              {localStream && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute bottom-4 right-4 w-48 h-36 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20"
                >
                  {!isCameraOff ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                          <span className="text-xl font-bold text-white">
                            {localName[0]?.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white/60 text-xs">Camera off</span>
                      </div>
                    </div>
                  )}
                  {/* Local name label */}
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 rounded">
                    <span className="text-white text-xs">{localName}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        ) : (
          // Voice Call Layout - Avatar based
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900">
            <div className="text-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-40 h-40 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6 ring-4 ring-green-400/30"
              >
                <span className="text-6xl font-bold text-white">
                  {remoteName[0]?.toUpperCase()}
                </span>
              </motion.div>
              <p className="text-2xl text-white font-medium mb-2">{remoteName}</p>
              <div className="flex items-center justify-center gap-2 text-white/60">
                {remoteStream ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-3 h-3 bg-green-400 rounded-full"
                    />
                    <span className="text-green-400">Connected - Voice Call</span>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-3 h-3 bg-yellow-400 rounded-full"
                    />
                    <span>Connecting...</span>
                  </>
                )}
              </div>

              {/* Audio wave animation when connected */}
              {remoteStream && (
                <div className="flex items-center justify-center gap-1 mt-6">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ['12px', '24px', '12px'] }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        delay: i * 0.1
                      }}
                      className="w-1 bg-green-400 rounded-full"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 p-4 bg-black/30 backdrop-blur-sm rounded-full"
      >
        {/* Mute Button */}
        <Button
          onClick={onToggleMute}
          size="lg"
          className={`w-14 h-14 rounded-full transition-all ${
            isMuted
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          {isMuted ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </Button>

        {/* Camera Button (only for video calls) */}
        {isVideo && (
          <Button
            onClick={onToggleCamera}
            size="lg"
            className={`w-14 h-14 rounded-full transition-all ${
              isCameraOff
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-white/20 hover:bg-white/30'
            }`}
          >
            {isCameraOff ? (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </Button>
        )}

        {/* End Call Button */}
        <Button
          onClick={onEndCall}
          size="lg"
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </Button>
      </motion.div>
    </motion.div>
  );
}
