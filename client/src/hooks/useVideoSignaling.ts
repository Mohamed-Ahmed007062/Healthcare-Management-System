import { useCallback, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

interface UseVideoSignalingOptions {
  socket: Socket | null;
  roomId: string | null;
  userId: string | undefined;
  onOffer: (signal: RTCSessionDescriptionInit) => Promise<void>;
  onAnswer: (signal: RTCSessionDescriptionInit) => Promise<void>;
  onIceCandidate: (signal: RTCIceCandidateInit) => Promise<void>;
  onPeerJoined?: () => void;
  onPeerLeft?: () => void;
}

export function useVideoSignaling({
  socket,
  roomId,
  userId,
  onOffer,
  onAnswer,
  onIceCandidate,
  onPeerJoined,
  onPeerLeft,
}: UseVideoSignalingOptions) {
  const isInitiatorRef = useRef(false);
  const joinedRef = useRef(false);

  const joinRoom = useCallback(async () => {
    if (!socket || !roomId || joinedRef.current) return;

    return new Promise<boolean>((resolve) => {
      socket.emit('video:join', { roomId }, async (response: { success?: boolean; message?: string }) => {
        if (response?.success) {
          joinedRef.current = true;
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }, [roomId, socket]);

  const leaveRoom = useCallback(() => {
    if (!socket || !roomId || !joinedRef.current) return;
    socket.emit('video:leave', { roomId });
    joinedRef.current = false;
  }, [roomId, socket]);

  const sendOffer = useCallback(
    (signal: RTCSessionDescriptionInit) => {
      if (!socket || !roomId) return;
      socket.emit('video:offer', { roomId, signal });
    },
    [roomId, socket]
  );

  const sendAnswer = useCallback(
    (signal: RTCSessionDescriptionInit) => {
      if (!socket || !roomId) return;
      socket.emit('video:answer', { roomId, signal });
    },
    [roomId, socket]
  );

  const sendIceCandidate = useCallback(
    (signal: RTCIceCandidateInit) => {
      if (!socket || !roomId) return;
      socket.emit('video:ice-candidate', { roomId, signal });
    },
    [roomId, socket]
  );

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleOffer = async (payload: { signal: RTCSessionDescriptionInit; from: string }) => {
      if (payload.from === userId) return;
      await onOffer(payload.signal);
    };

    const handleAnswer = async (payload: { signal: RTCSessionDescriptionInit; from: string }) => {
      if (payload.from === userId) return;
      await onAnswer(payload.signal);
    };

    const handleIce = async (payload: { signal: RTCIceCandidateInit; from: string }) => {
      if (payload.from === userId) return;
      await onIceCandidate(payload.signal);
    };

    const handlePeerJoined = async (payload: { userId: string }) => {
      if (payload.userId === userId) return;
      onPeerJoined?.();
      if (isInitiatorRef.current) return;
      isInitiatorRef.current = true;
    };

    const handlePeerLeft = (payload: { userId: string }) => {
      if (payload.userId === userId) return;
      onPeerLeft?.();
    };

    socket.on('video:offer', handleOffer);
    socket.on('video:answer', handleAnswer);
    socket.on('video:ice-candidate', handleIce);
    socket.on('video:peer-joined', handlePeerJoined);
    socket.on('video:peer-left', handlePeerLeft);

    return () => {
      socket.off('video:offer', handleOffer);
      socket.off('video:answer', handleAnswer);
      socket.off('video:ice-candidate', handleIce);
      socket.off('video:peer-joined', handlePeerJoined);
      socket.off('video:peer-left', handlePeerLeft);
    };
  }, [onAnswer, onIceCandidate, onOffer, onPeerJoined, onPeerLeft, roomId, socket, userId]);

  const startAsInitiator = useCallback(() => {
    isInitiatorRef.current = true;
  }, []);

  return {
    joinRoom,
    leaveRoom,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    startAsInitiator,
  };
}

export default useVideoSignaling;
