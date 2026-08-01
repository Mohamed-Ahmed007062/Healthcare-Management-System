import { getIO } from '../../config/socket';
import { logger } from '../../config/logger';

/**
 * Emit a notification event to a specific user.
 */
export function emitToUser(userId: string, event: string, data: any): void {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit(event, data);
  } catch (err) {
    logger.warn({ userId, event, err }, 'Failed to emit socket event (Socket.io may not be initialized)');
  }
}

/**
 * Emit an event to all connected clients (e.g., system announcements).
 */
export function emitToAll(event: string, data: any): void {
  try {
    const io = getIO();
    io.emit(event, data);
  } catch (err) {
    logger.warn({ event, err }, 'Failed to broadcast socket event');
  }
}
