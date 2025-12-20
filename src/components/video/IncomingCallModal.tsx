'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface IncomingCallModalProps {
  callerName: string;
  isVideo: boolean;
  onAccept: () => void;
  onReject: () => void;
}

// Generate ringtone using Web Audio API
function createRingtone(): { start: () => void; stop: () => void } {
  let audioContext: AudioContext | null = null;
  let oscillator: OscillatorNode | null = null;
  let gainNode: GainNode | null = null;
  let intervalId: NodeJS.Timeout | null = null;

  const start = () => {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = 0;

      oscillator = audioContext.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4 note
      oscillator.connect(gainNode);
      oscillator.start();

      // Ring pattern: ring for 1s, pause for 2s
      let isRinging = false;
      const toggleRing = () => {
        if (gainNode) {
          isRinging = !isRinging;
          if (isRinging) {
            // Ring: oscillate between two frequencies
            gainNode.gain.setValueAtTime(0.3, audioContext!.currentTime);
            if (oscillator) {
              oscillator.frequency.setValueAtTime(440, audioContext!.currentTime);
              oscillator.frequency.setValueAtTime(480, audioContext!.currentTime + 0.25);
              oscillator.frequency.setValueAtTime(440, audioContext!.currentTime + 0.5);
              oscillator.frequency.setValueAtTime(480, audioContext!.currentTime + 0.75);
            }
          } else {
            gainNode.gain.setValueAtTime(0, audioContext!.currentTime);
          }
        }
      };

      toggleRing(); // Start ringing immediately
      intervalId = setInterval(toggleRing, 1500);
    } catch (error) {
      console.error('Failed to create ringtone:', error);
    }
  };

  const stop = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (oscillator) {
      oscillator.stop();
      oscillator = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  };

  return { start, stop };
}

export function IncomingCallModal({
  callerName,
  isVideo,
  onAccept,
  onReject
}: IncomingCallModalProps) {
  const ringtoneRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    // Create and start ringtone when modal appears
    ringtoneRef.current = createRingtone();
    ringtoneRef.current.start();

    return () => {
      // Stop ringtone when modal closes
      if (ringtoneRef.current) {
        ringtoneRef.current.stop();
      }
    };
  }, []);

  const handleAccept = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    onAccept();
  };

  const handleReject = () => {
    if (ringtoneRef.current) {
      ringtoneRef.current.stop();
    }
    onReject();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="glass p-8 rounded-3xl text-center max-w-sm mx-4"
      >
        {/* Animated rings */}
        <div className="relative w-32 h-32 mx-auto mb-6">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-green-500/30"
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            className="absolute inset-0 rounded-full bg-green-500/30"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">
                {callerName[0]?.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">{callerName}</h2>
        <p className="text-white/70 mb-8">
          Incoming {isVideo ? 'video' : 'voice'} call...
        </p>

        <div className="flex items-center justify-center gap-6">
          {/* Decline */}
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              onClick={handleReject}
              size="lg"
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
            >
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </motion.div>

          {/* Accept */}
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              onClick={handleAccept}
              size="lg"
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
            >
              {isVideo ? (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              )}
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
