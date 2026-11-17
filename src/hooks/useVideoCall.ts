'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents, User } from '@/types';

interface CallInfo {
  callerId: string;
  callerName: string;
  isVideo: boolean;
}

interface UseVideoCallOptions {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  currentUser: User | null;
  users: User[];
}

interface UseVideoCallReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isCallActive: boolean;
  isVideo: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  incomingCall: CallInfo | null;
  startCall: (video: boolean) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
    // For users behind strict NAT add a TURN server here, e.g.
    // { urls: 'turn:your.turn.host:3478', username: '...', credential: '...' }
  ],
  // Gather candidates early to shorten call setup time
  iceCandidatePoolSize: 4,
  // Single transport for audio+video: fewer ports, faster connect
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// Quality / bandwidth targets
const VIDEO_MAX_BITRATE = 1_500_000; // 1.5 Mbps is plenty for 720p30 with VP9/VP8
const VIDEO_MAX_FRAMERATE = 30;
const AUDIO_MAX_BITRATE = 32_000; // Opus 32 kbps = clear voice

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280, max: 1920 },
  height: { ideal: 720, max: 1080 },
  frameRate: { ideal: 30, max: 30 },
  facingMode: 'user'
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000
};

// Prefer efficient codecs (VP9 -> VP8), keep the rest (rtx/red/fec) as fallback
function preferVideoCodecs(transceiver: RTCRtpTransceiver) {
  try {
    const caps = RTCRtpReceiver.getCapabilities('video');
    if (!caps || !transceiver.setCodecPreferences) return;
    const rank = (mime: string) => {
      const m = mime.toLowerCase();
      if (m === 'video/vp9') return 0;
      if (m === 'video/vp8') return 1;
      return 2;
    };
    const sorted = [...caps.codecs].sort((a, b) => rank(a.mimeType) - rank(b.mimeType));
    transceiver.setCodecPreferences(sorted);
  } catch (error) {
    console.warn('Could not set codec preferences:', error);
  }
}

async function tuneSender(sender: RTCRtpSender, kind: string) {
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    const enc = params.encodings[0];
    if (kind === 'video') {
      enc.maxBitrate = VIDEO_MAX_BITRATE;
      enc.maxFramerate = VIDEO_MAX_FRAMERATE;
      enc.networkPriority = 'high';
      // Under congestion keep the frame rate smooth (low latency), drop resolution first
      (params as RTCRtpSendParameters & { degradationPreference?: string })
        .degradationPreference = 'maintain-framerate';
    } else {
      enc.maxBitrate = AUDIO_MAX_BITRATE;
      enc.networkPriority = 'high';
      enc.priority = 'high';
    }
    await sender.setParameters(params);
  } catch (error) {
    console.warn(`Could not tune ${kind} sender:`, error);
  }
}

function addTracksWithQuality(pc: RTCPeerConnection, stream: MediaStream) {
  stream.getTracks().forEach(track => {
    const sender = pc.addTrack(track, stream);
    if (track.kind === 'video') {
      // Motion hint: favour smoothness over fine detail for camera video
      track.contentHint = 'motion';
      const transceiver = pc.getTransceivers().find(t => t.sender === sender);
      if (transceiver) preferVideoCodecs(transceiver);
    }
    void tuneSender(sender, track.kind);
  });
}

// Opus: in-band FEC (loss resilience), DTX (silence = no bandwidth), mono voice bitrate cap
function optimizeSdp(sdp: string | undefined): string | undefined {
  if (!sdp) return sdp;
  return sdp.replace(
    /a=fmtp:(\d+) (.*minptime=10.*)/g,
    (line, pt, params) => {
      if (params.includes('useinbandfec')) {
        return line.includes('usedtx')
          ? line
          : `a=fmtp:${pt} ${params};usedtx=1;maxaveragebitrate=${AUDIO_MAX_BITRATE}`;
      }
      return `a=fmtp:${pt} ${params};useinbandfec=1;usedtx=1;maxaveragebitrate=${AUDIO_MAX_BITRATE}`;
    }
  );
}

export function useVideoCall({ socket, currentUser, users }: UseVideoCallOptions): UseVideoCallReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const isInitiatorRef = useRef(false);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket && currentUser) {
        const otherUser = users.find(u => u.id !== currentUser.id);
        if (otherUser) {
          socket.emit('webrtc-ice-candidate', {
            candidate: event.candidate.toJSON(),
            to: otherUser.id
          });
        }
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        endCallInternal();
      }
    };

    return pc;
  }, [socket, currentUser, users]);

  const getMediaStream = useCallback(async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: video ? VIDEO_CONSTRAINTS : false
      });
      return stream;
    } catch (error) {
      console.error('Failed to get media stream:', error);
      return null;
    }
  }, []);

  const endCallInternal = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    setRemoteStream(null);
    setIsCallActive(false);
    setIncomingCall(null);
    pendingCandidatesRef.current = [];
    isInitiatorRef.current = false;
  }, [localStream]);

  const startCall = useCallback(async (video: boolean) => {
    console.log('startCall called', { video, socket: !!socket, currentUser, usersCount: users.length });
    if (!socket || !currentUser || users.length < 2) {
      console.log('Cannot start call - missing requirements');
      return;
    }

    const stream = await getMediaStream(video);
    if (!stream) {
      console.log('Failed to get media stream');
      return;
    }

    console.log('Got media stream, setting up call');
    setLocalStream(stream);
    setIsVideo(video);
    setIsCallActive(true);
    isInitiatorRef.current = true;

    const pc = createPeerConnection();
    peerConnectionRef.current = pc;

    addTracksWithQuality(pc, stream);

    console.log('Emitting initiate-call event');
    socket.emit('initiate-call', { isVideo: video });
  }, [socket, currentUser, users, getMediaStream, createPeerConnection]);

  const acceptCall = useCallback(async () => {
    if (!socket || !incomingCall) return;

    const stream = await getMediaStream(incomingCall.isVideo);
    if (!stream) return;

    setLocalStream(stream);
    setIsVideo(incomingCall.isVideo);
    setIsCallActive(true);

    const pc = createPeerConnection();
    peerConnectionRef.current = pc;

    addTracksWithQuality(pc, stream);

    socket.emit('accept-call');
    setIncomingCall(null);
  }, [socket, incomingCall, getMediaStream, createPeerConnection]);

  const rejectCall = useCallback(() => {
    if (!socket) return;
    socket.emit('reject-call');
    setIncomingCall(null);
  }, [socket]);

  const endCall = useCallback(() => {
    if (!socket) return;
    socket.emit('end-call');
    endCallInternal();
  }, [socket, endCallInternal]);

  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
      }
    }
  }, [localStream]);

  useEffect(() => {
    if (!socket) return;

    const onCallInitiated = async (data: CallInfo) => {
      console.log('Received call-initiated event:', data);
      if (isCallActive) {
        console.log('Already in a call, ignoring incoming call');
        return;
      }
      console.log('Setting incoming call:', data);
      setIncomingCall(data);
    };

    const onCallAccepted = async () => {
      if (!peerConnectionRef.current || !isInitiatorRef.current) return;

      try {
        const offer = await peerConnectionRef.current.createOffer();
        offer.sdp = optimizeSdp(offer.sdp);
        await peerConnectionRef.current.setLocalDescription(offer);

        const otherUser = users.find(u => u.id !== currentUser?.id);
        if (otherUser && socket) {
          socket.emit('webrtc-offer', { offer, to: otherUser.id });
        }
      } catch (error) {
        console.error('Failed to create offer:', error);
      }
    };

    const onCallRejected = () => {
      endCallInternal();
    };

    const onCallEnded = () => {
      endCallInternal();
    };

    const onWebRTCOffer = async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
      if (!peerConnectionRef.current) return;

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.offer));

        // Add any pending candidates
        for (const candidate of pendingCandidatesRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];

        const answer = await peerConnectionRef.current.createAnswer();
        answer.sdp = optimizeSdp(answer.sdp);
        await peerConnectionRef.current.setLocalDescription(answer);

        socket.emit('webrtc-answer', { answer, to: data.from });
      } catch (error) {
        console.error('Failed to handle offer:', error);
      }
    };

    const onWebRTCAnswer = async (data: { answer: RTCSessionDescriptionInit; from: string }) => {
      if (!peerConnectionRef.current) return;

      try {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));

        // Add any pending candidates
        for (const candidate of pendingCandidatesRef.current) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];
      } catch (error) {
        console.error('Failed to handle answer:', error);
      }
    };

    const onWebRTCIceCandidate = async (data: { candidate: RTCIceCandidateInit; from: string }) => {
      if (!peerConnectionRef.current) {
        pendingCandidatesRef.current.push(data.candidate);
        return;
      }

      if (!peerConnectionRef.current.remoteDescription) {
        pendingCandidatesRef.current.push(data.candidate);
        return;
      }

      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('Failed to add ICE candidate:', error);
      }
    };

    socket.on('call-initiated', onCallInitiated);
    socket.on('call-accepted', onCallAccepted);
    socket.on('call-rejected', onCallRejected);
    socket.on('call-ended', onCallEnded);
    socket.on('webrtc-offer', onWebRTCOffer);
    socket.on('webrtc-answer', onWebRTCAnswer);
    socket.on('webrtc-ice-candidate', onWebRTCIceCandidate);

    return () => {
      socket.off('call-initiated', onCallInitiated);
      socket.off('call-accepted', onCallAccepted);
      socket.off('call-rejected', onCallRejected);
      socket.off('call-ended', onCallEnded);
      socket.off('webrtc-offer', onWebRTCOffer);
      socket.off('webrtc-answer', onWebRTCAnswer);
      socket.off('webrtc-ice-candidate', onWebRTCIceCandidate);
    };
  }, [socket, currentUser, users, isCallActive, endCallInternal]);

  return {
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
    toggleCamera
  };
}
