import type { Socket } from 'socket.io';
import videoService from '../../services/video.service';
import { logger } from '../../config/logger';
import ApiError from '../../utils/ApiError';

interface VideoJoinPayload {
  roomId: string;
}

interface VideoSignalPayload {
  roomId: string;
  signal: unknown;
}

export function registerVideoHandlers(socket: Socket): void {
  const userId = (socket as any).userId as string;
  const userRole = (socket as any).userRole as string;

  socket.on('video:join', async (payload: VideoJoinPayload, callback?: (response: unknown) => void) => {
    try {
      const { roomId } = payload;
      if (!roomId) {
        throw new ApiError(400, 'roomId is required');
      }

      const appointment = await videoService.validateRoomJoin(roomId, userId, userRole);
      const socketRoom = `video:${roomId}`;
      await socket.join(socketRoom);

      if (appointment.videoRoom?.status === 'idle') {
        const appointmentId = appointment._id?.toString();
        if (appointmentId) {
          await videoService.markSessionStarted(appointmentId);
        }
      }

      socket.to(socketRoom).emit('video:peer-joined', { userId, roomId });

      callback?.({ success: true, roomId, appointmentId: appointment._id?.toString() });
    } catch (err: any) {
      logger.warn({ userId, err: err.message }, 'video:join failed');
      callback?.({ success: false, message: err.message ?? 'Failed to join video room' });
    }
  });

  socket.on('video:offer', (payload: VideoSignalPayload) => {
    if (!payload?.roomId) return;
    socket.to(`video:${payload.roomId}`).emit('video:offer', {
      signal: payload.signal,
      from: userId,
    });
  });

  socket.on('video:answer', (payload: VideoSignalPayload) => {
    if (!payload?.roomId) return;
    socket.to(`video:${payload.roomId}`).emit('video:answer', {
      signal: payload.signal,
      from: userId,
    });
  });

  socket.on('video:ice-candidate', (payload: VideoSignalPayload) => {
    if (!payload?.roomId) return;
    socket.to(`video:${payload.roomId}`).emit('video:ice-candidate', {
      signal: payload.signal,
      from: userId,
    });
  });

  socket.on('video:leave', async (payload: VideoJoinPayload) => {
    const { roomId } = payload ?? {};
    if (!roomId) return;

    const socketRoom = `video:${roomId}`;
    socket.to(socketRoom).emit('video:peer-left', { userId, roomId });
    socket.leave(socketRoom);

    try {
      await videoService.markSessionEndedByRoomId(roomId);
    } catch (err) {
      logger.warn({ userId, roomId, err }, 'Failed to mark video session ended');
    }
  });
}

export default registerVideoHandlers;
