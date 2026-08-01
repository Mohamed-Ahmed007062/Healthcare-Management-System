import { randomUUID } from 'crypto';
import appointmentRepo from '../repositories/appointment.repo';
import ApiError from '../utils/ApiError';
import { env } from '../config/env';
import type { VideoRoomStatus } from '../models/constants';

const getDocId = (doc: any): string => {
  if (!doc) return '';
  return doc._id ? doc._id.toString() : doc.toString();
};

const getPatId = (pat: any): string => {
  if (!pat) return '';
  return pat._id ? pat._id.toString() : pat.toString();
};

export class VideoService {
  /**
   * Creates a video room ID when a video appointment is confirmed.
   */
  async provisionRoom(appointmentId: string) {
    const appointment = await appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }

    if (appointment.meetingType !== 'video') {
      return appointment;
    }

    if (appointment.videoRoom?.roomId) {
      return appointment;
    }

    const roomId = randomUUID();
    return await appointmentRepo.updateVideoRoom(appointmentId, {
      roomId,
      status: 'idle' as VideoRoomStatus,
    });
  }

  /**
   * Validates whether a user can join a video session and returns session metadata.
   */
  async getSession(appointmentId: string, userId: string, role: string) {
    const appointment = await appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }

    if (appointment.meetingType !== 'video') {
      throw new ApiError(400, 'This appointment is not a video consultation');
    }

    if (!['confirmed', 'completed'].includes(appointment.status)) {
      throw new ApiError(400, 'Video session is only available for confirmed or completed appointments');
    }

    if (role !== 'admin') {
      const isPatient = getPatId(appointment.patientId) === userId;
      const isDoctor = getDocId(appointment.doctorId) === userId;
      if (!isPatient && !isDoctor) {
        throw new ApiError(403, 'You do not have permission to join this video session');
      }
    }

    let currentVideoRoom = appointment.videoRoom;
    if (!currentVideoRoom?.roomId) {
      const roomId = randomUUID();
      const updated = await appointmentRepo.updateVideoRoom(appointmentId, {
        roomId,
        status: 'idle' as VideoRoomStatus,
      });
      if (updated) {
        currentVideoRoom = updated.videoRoom;
      }
    }

    const canJoin = this.isWithinJoinWindow(appointment.slot?.start, appointment.slot?.end);

    return {
      roomId: currentVideoRoom?.roomId ?? null,
      canJoin,
      videoRoom: currentVideoRoom ?? null,
      slot: appointment.slot,
      meetingType: appointment.meetingType,
      status: appointment.status,
      appointmentId: appointment._id?.toString() ?? appointmentId,
    };
  }

  /**
   * Validates join by room ID (used by socket handler).
   */
  async validateRoomJoin(roomId: string, userId: string, role: string) {
    const appointment = await appointmentRepo.findByVideoRoomId(roomId);
    if (!appointment) {
      throw new ApiError(404, 'Video room not found');
    }

    if (appointment.meetingType !== 'video') {
      throw new ApiError(400, 'Invalid video room');
    }

    if (!['confirmed', 'completed'].includes(appointment.status)) {
      throw new ApiError(400, 'Video session is not active');
    }

    if (role !== 'admin') {
      const isPatient = getPatId(appointment.patientId) === userId;
      const isDoctor = getDocId(appointment.doctorId) === userId;
      if (!isPatient && !isDoctor) {
        throw new ApiError(403, 'Access denied to this video room');
      }
    }

    const canJoin = this.isWithinJoinWindow(appointment.slot?.start, appointment.slot?.end);
    if (!canJoin) {
      throw new ApiError(400, 'Video session is outside the allowed join window');
    }

    return appointment;
  }

  async markSessionStarted(appointmentId: string) {
    const appointment = await appointmentRepo.findById(appointmentId);
    if (!appointment?.videoRoom?.roomId) return null;

    return await appointmentRepo.updateVideoRoom(appointmentId, {
      ...appointment.videoRoom,
      status: 'active',
      startedAt: appointment.videoRoom.startedAt ?? new Date(),
    });
  }

  async markSessionEnded(appointmentId: string) {
    const appointment = await appointmentRepo.findById(appointmentId);
    if (!appointment?.videoRoom?.roomId) return null;

    return await appointmentRepo.updateVideoRoom(appointmentId, {
      ...appointment.videoRoom,
      status: 'ended',
      endedAt: new Date(),
    });
  }

  async markSessionEndedByRoomId(roomId: string) {
    const appointment = await appointmentRepo.findByVideoRoomId(roomId);
    if (!appointment) return null;
    const id = appointment._id?.toString();
    if (!id) return null;
    return this.markSessionEnded(id);
  }

  private isWithinJoinWindow(slotStart?: Date | string, slotEnd?: Date | string): boolean {
    // Bypass slot window validation in development/test environment for easy developer verification
    if (env.NODE_ENV !== 'production') {
      return true;
    }

    if (!slotStart) return false;

    const start = new Date(slotStart);
    const end = slotEnd ? new Date(slotEnd) : new Date(start.getTime() + 30 * 60 * 1000);
    const windowMs = env.VIDEO_JOIN_WINDOW_MINUTES * 60 * 1000;
    const now = Date.now();

    return now >= start.getTime() - windowMs && now <= end.getTime() + windowMs;
  }
}

export const videoService = new VideoService();
export default videoService;
