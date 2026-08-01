import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import appointmentApi from '../../api/appointment.api';
import { useAuthStore } from '../../store/authSlice';
import { useSocket } from '../../context/SocketContext';
import useWebRTC from '../../hooks/useWebRTC';
import useVideoSignaling from '../../hooks/useVideoSignaling';
import type { VideoSession } from '../../types/appointment.types';
import Button from '../../components/ui/button';
import Card from '../../components/ui/card';
import PATHS from '../../routes/routeConfig';

export const VideoCall: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { socket } = useSocket();

  const [session, setSession] = useState<VideoSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callStarted, setCallStarted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const {
    localStream,
    remoteStream,
    isMicMuted,
    isCameraOff,
    error: mediaError,
    createOffer,
    handleRemoteOffer,
    handleRemoteAnswer,
    addIceCandidate,
    toggleMic,
    toggleCamera,
    cleanup,
  } = useWebRTC({
    onIceCandidate: (candidate) => {
      signaling.sendIceCandidate(candidate);
    },
  });

  const handleRemoteOfferWrapped = useCallback(
    async (signal: RTCSessionDescriptionInit) => {
      const answer = await handleRemoteOffer(signal);
      signaling.sendAnswer(answer);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleRemoteOffer]
  );

  const handleRemoteAnswerWrapped = useCallback(
    async (signal: RTCSessionDescriptionInit) => {
      await handleRemoteAnswer(signal);
    },
    [handleRemoteAnswer]
  );

  const handleIceWrapped = useCallback(
    async (signal: RTCIceCandidateInit) => {
      await addIceCandidate(signal);
    },
    [addIceCandidate]
  );

  const signalingRef = useRef<ReturnType<typeof useVideoSignaling> | null>(null);

  const signaling = useVideoSignaling({
    socket,
    roomId: session?.roomId ?? null,
    userId: user?.id,
    onOffer: handleRemoteOfferWrapped,
    onAnswer: handleRemoteAnswerWrapped,
    onIceCandidate: handleIceWrapped,
    onPeerJoined: async () => {
      if (!signalingRef.current) return;
      try {
        signalingRef.current.startAsInitiator();
        const offer = await createOffer();
        signalingRef.current.sendOffer(offer);
      } catch {
        toast.error('Failed to start video call');
      }
    },
    onPeerLeft: () => {
      toast.info('The other participant left the call');
    },
  });

  signalingRef.current = signaling;

  useEffect(() => {
    if (!id) return;

    const loadSession = async () => {
      setIsLoading(true);
      try {
        const res = await appointmentApi.getVideoSession(id);
        if (res.success) {
          setSession(res.data);
          if (!res.data.canJoin) {
            toast.warning('Video call is not available yet. Join within the appointment window.');
          }
        }
      } catch (err: unknown) {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(message || 'Failed to load video session');
        navigate(PATHS.APPOINTMENTS);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [id, navigate]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const startCall = async () => {
    if (!session?.roomId || !session.canJoin) {
      toast.error('Cannot join this video session right now');
      return;
    }

    setIsConnecting(true);
    try {
      const joined = await signaling.joinRoom();
      if (!joined) {
        toast.error('Failed to join video room');
        return;
      }

      setCallStarted(true);
      signaling.startAsInitiator();
      const offer = await createOffer();
      signaling.sendOffer(offer);
      toast.success('Connected to video room');
    } catch {
      toast.error('Failed to start video call');
    } finally {
      setIsConnecting(false);
    }
  };

  const endCall = () => {
    signaling.leaveRoom();
    cleanup();
    navigate(PATHS.APPOINTMENTS);
  };

  useEffect(() => {
    return () => {
      signaling.leaveRoom();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-slate-500">Loading video session...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-850 dark:text-white">Video Consultation</h1>
          <p className="text-sm text-slate-500">
            {session?.canJoin ? 'You can join this consultation now.' : 'Waiting for the appointment window.'}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate(PATHS.APPOINTMENTS)}>
          Back to Appointments
        </Button>
      </div>

      {(mediaError) && (
        <Card className="p-4 border-red-200 bg-red-50 text-red-700 text-sm">{mediaError}</Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {!remoteStream && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              Waiting for remote participant...
            </div>
          )}
          <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">Remote</span>
        </div>

        <div className="relative aspect-video bg-slate-800 rounded-xl overflow-hidden">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover mirror" />
          {!localStream && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              Your camera preview
            </div>
          )}
          <span className="absolute bottom-2 left-2 text-xs bg-black/60 text-white px-2 py-1 rounded">You</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!callStarted ? (
          <Button onClick={startCall} isLoading={isConnecting} disabled={!session?.canJoin}>
            Join Video Call
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={toggleMic}>
              {isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
            </Button>
            <Button variant="outline" onClick={toggleCamera}>
              {isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            </Button>
            <Button onClick={endCall} className="bg-red-600 hover:bg-red-700">
              End Call
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
