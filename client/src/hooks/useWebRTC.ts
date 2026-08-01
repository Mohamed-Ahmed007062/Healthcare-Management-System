import { useCallback, useEffect, useRef, useState } from 'react';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
];

interface UseWebRTCOptions {
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void;
}

function createSyntheticStream(): MediaStream {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#3b82f6';
    ctx.font = '24px sans-serif';
    ctx.fillText('Demo Camera Stream', 200, 240);
  }

  const canvasStream = canvas.captureStream(30);

  let audioTrack: MediaStreamTrack | null = null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const osc = audioCtx.createOscillator();
      const dst = audioCtx.createMediaStreamDestination();
      osc.connect(dst);
      osc.start();
      audioTrack = dst.stream.getAudioTracks()[0];
    }
  } catch {
    // audio fallback silent
  }

  const videoTrack = canvasStream.getVideoTracks()[0];
  const tracks = [videoTrack];
  if (audioTrack) tracks.push(audioTrack);

  return new MediaStream(tracks);
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPeerConnection = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.close();
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        setRemoteStream(stream);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && options.onIceCandidate) {
        options.onIceCandidate(event.candidate.toJSON());
      }
    };

    peerRef.current = pc;
    return pc;
  }, [options]);

  const startLocalMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setError(null);
      return stream;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Camera/microphone permission denied or unavailable';
      setError(`${message} (Using demo video stream)`);
      try {
        const fallbackStream = createSyntheticStream();
        localStreamRef.current = fallbackStream;
        setLocalStream(fallbackStream);
        return fallbackStream;
      } catch {
        throw err;
      }
    }
  }, []);

  const attachLocalTracks = useCallback((pc: RTCPeerConnection, stream: MediaStream) => {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
  }, []);

  const createOffer = useCallback(async () => {
    const pc = createPeerConnection();
    const stream = localStreamRef.current ?? (await startLocalMedia());
    attachLocalTracks(pc, stream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }, [attachLocalTracks, createPeerConnection, startLocalMedia]);

  const handleRemoteOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
    const pc = createPeerConnection();
    const stream = localStreamRef.current ?? (await startLocalMedia());
    attachLocalTracks(pc, stream);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }, [attachLocalTracks, createPeerConnection, startLocalMedia]);

  const handleRemoteAnswer = useCallback(async (answer: RTCSessionDescriptionInit) => {
    if (!peerRef.current) return;
    await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const addIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
    if (!peerRef.current) return;
    await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
  }, []);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMicMuted((prev) => !prev);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsCameraOff((prev) => !prev);
  }, []);

  const cleanup = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    localStream,
    remoteStream,
    isMicMuted,
    isCameraOff,
    error,
    startLocalMedia,
    createOffer,
    handleRemoteOffer,
    handleRemoteAnswer,
    addIceCandidate,
    toggleMic,
    toggleCamera,
    cleanup,
  };
}

export default useWebRTC;
