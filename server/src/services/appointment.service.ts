import appointmentRepo from '../repositories/appointment.repo';
import notificationService from './notification.service';
import videoService from './video.service';
import userRepo from '../repositories/user.repo';
import departmentRepo from '../repositories/department.repo';
import ApiError from '../utils/ApiError';
import type { PaginationOptions } from '../utils/pagination';
import type { AppointmentStatus } from '../models/constants';

const getDocId = (doc: any): string => {
  if (!doc) return '';
  return doc._id ? doc._id.toString() : doc.toString();
};

const getPatId = (pat: any): string => {
  if (!pat) return '';
  return pat._id ? pat._id.toString() : pat.toString();
};

export class AppointmentService {
  /**
   * Book a new appointment.
   *
   * @param data Appointment details including patientId, doctorId, slot, etc.
   * @returns The created appointment.
   */
  async bookAppointment(data: {
    patientId: string;
    doctorId: string;
    slot: { start: Date; end: Date };
    reason?: string;
    symptoms?: string[];
    meetingType?: string;
  }) {
    // 1. Verify doctor exists and is active
    const doctor = await userRepo.findById(data.doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      throw new ApiError(404, 'Doctor not found or invalid role.', { code: 'DOCTOR_NOT_FOUND' });
    }
    if (!doctor.isActive || !doctor.isAvailable) {
      throw new ApiError(400, 'Doctor is not currently active or available.', { code: 'DOCTOR_UNAVAILABLE' });
    }

    // 2. Verify patient exists
    const patient = await userRepo.findById(data.patientId);
    if (!patient || patient.role !== 'patient') {
      throw new ApiError(404, 'Patient not found or invalid role.', { code: 'PATIENT_NOT_FOUND' });
    }

    // 3. Validate slot.start is in the future
    const now = new Date();
    const startTime = new Date(data.slot.start);
    const endTime = new Date(data.slot.end);

    if (startTime <= now) {
      throw new ApiError(400, 'Appointment start time must be in the future.', { code: 'INVALID_START_TIME' });
    }

    // 4. Validate slot.end is after slot.start
    if (endTime <= startTime) {
      throw new ApiError(400, 'Appointment end time must be after start time.', { code: 'INVALID_END_TIME' });
    }

    // 5. Check for slot conflicts
    const conflict = await appointmentRepo.checkSlotConflict(data.doctorId, startTime, endTime);
    if (conflict) {
      throw new ApiError(409, 'Doctor already has an appointment in this time slot.', { code: 'SLOT_CONFLICT' });
    }

    // 6. Create appointment
    const appointmentData = {
      ...data,
      status: 'pending' as AppointmentStatus,
    };
    const appointment = await appointmentRepo.create(appointmentData);

    // 7. Create notification for doctor
    await notificationService.createAndEmit({
      recipientId: data.doctorId,
      senderId: data.patientId,
      type: 'appointment_request',
      title: 'New Appointment Request',
      message: `You have a new appointment request from ${patient.firstName} ${patient.lastName} for ${startTime.toLocaleString()}.`,
      relatedEntityType: 'Appointment',
      relatedEntityId: appointment._id?.toString(),
    });

    // 8. Return created appointment
    return appointment;
  }

  /**
   * Get appointments with filtering and pagination.
   *
   * @param userId The ID of the user requesting the appointments.
   * @param role The role of the user (patient, doctor, admin).
   * @param filters Filters to apply to the query.
   * @param pagination Pagination options.
   * @returns Paginated appointments result.
   */
  async getAppointments(
    userId: string,
    role: string,
    filters: { status?: string; doctorId?: string; patientId?: string; startDate?: Date; endDate?: Date },
    pagination: PaginationOptions
  ) {
    const queryFilters: any = {};

    if (filters.status) {
      queryFilters.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      queryFilters['slot.start'] = {};
      if (filters.startDate) queryFilters['slot.start'].$gte = new Date(filters.startDate);
      if (filters.endDate) queryFilters['slot.start'].$lte = new Date(filters.endDate);
    }

    if (role === 'patient') {
      queryFilters.patientId = userId;
      if (filters.doctorId) queryFilters.doctorId = filters.doctorId;
    } else if (role === 'doctor') {
      queryFilters.doctorId = userId;
      if (filters.patientId) queryFilters.patientId = filters.patientId;
    } else if (role === 'admin') {
      if (filters.patientId) queryFilters.patientId = filters.patientId;
      if (filters.doctorId) queryFilters.doctorId = filters.doctorId;
    } else {
      throw new ApiError(403, 'Unauthorized role for accessing appointments.', { code: 'UNAUTHORIZED_ROLE' });
    }

    return await appointmentRepo.findWithFilters(queryFilters, pagination);
  }

  /**
   * Get a single appointment by ID.
   *
   * @param appointmentId The ID of the appointment.
   * @param userId The user requesting the appointment.
   * @param role The role of the requesting user.
   * @returns The requested appointment.
   */
  async getAppointmentById(appointmentId: string, userId: string, role: string) {
    const appointment = await appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found.', { code: 'APPOINTMENT_NOT_FOUND' });
    }

    if (role !== 'admin') {
      const isPatient = getPatId(appointment.patientId) === userId;
      const isDoctor = getDocId(appointment.doctorId) === userId;
      if (!isPatient && !isDoctor) {
        throw new ApiError(403, 'You do not have permission to view this appointment.', { code: 'UNAUTHORIZED_ACCESS' });
      }
    }

    return appointment;
  }

  /**
   * Update the status of an appointment.
   *
   * @param appointmentId The ID of the appointment.
   * @param newStatus The new status to apply.
   * @param userId The ID of the user requesting the change.
   * @param role The role of the requesting user.
   * @returns The updated appointment.
   */
  async updateAppointmentStatus(appointmentId: string, newStatus: AppointmentStatus, userId: string, role: string) {
    // 1. Find appointment
    const appointment = await appointmentRepo.findById(appointmentId);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found.', { code: 'APPOINTMENT_NOT_FOUND' });
    }

    // 2. Validate status transition
    const currentStatus = appointment.status;
    let isValidTransition = false;

    if (currentStatus === 'pending' && (newStatus === 'confirmed' || newStatus === 'cancelled')) {
      isValidTransition = true;
    } else if (
      currentStatus === 'confirmed' &&
      (newStatus === 'completed' || newStatus === 'cancelled' || newStatus === 'no_show')
    ) {
      isValidTransition = true;
    }

    if (!isValidTransition) {
      throw new ApiError(400, `Invalid status transition from ${currentStatus} to ${newStatus}.`, {
        code: 'INVALID_STATUS_TRANSITION',
      });
    }

    // 3. Authorization
    if (newStatus === 'confirmed' || newStatus === 'completed' || newStatus === 'no_show') {
      if (role !== 'doctor' && role !== 'admin') {
        throw new ApiError(403, `Only doctors and admins can mark an appointment as ${newStatus}.`, {
          code: 'UNAUTHORIZED_STATUS_UPDATE',
        });
      }
      if (role === 'doctor' && getDocId(appointment.doctorId) !== userId) {
        throw new ApiError(403, 'You do not have permission to update this appointment.', { code: 'UNAUTHORIZED_ACCESS' });
      }
    } else if (newStatus === 'cancelled') {
      const isPatient = getPatId(appointment.patientId) === userId;
      const isDoctor = getDocId(appointment.doctorId) === userId;
      if (role !== 'admin' && !isPatient && !isDoctor) {
        throw new ApiError(403, 'You do not have permission to cancel this appointment.', { code: 'UNAUTHORIZED_ACCESS' });
      }
    }

    // 4. Update status via repository
    const cancelledById = newStatus === 'cancelled' ? userId : undefined;
    const updatedAppointment = await appointmentRepo.updateStatus(appointmentId, newStatus, cancelledById);

    // 5. Send notifications
    if (newStatus === 'confirmed') {
      if (appointment.meetingType === 'video') {
        await videoService.provisionRoom(appointmentId);
      }

      await notificationService.createAndEmit({
        recipientId: getPatId(appointment.patientId),
        senderId: userId,
        type: 'appointment_confirmed',
        title: 'Appointment Confirmed',
        message: `Your appointment on ${appointment.slot ? new Date(appointment.slot.start).toLocaleString() : 'N/A'} has been confirmed.`,
        relatedEntityType: 'Appointment',
        relatedEntityId: appointmentId,
      });
    } else if (newStatus === 'cancelled') {
      // Notify the other party
      const isDoctorCancelling = getDocId(appointment.doctorId) === userId;
      const otherPartyId = isDoctorCancelling ? getPatId(appointment.patientId) : getDocId(appointment.doctorId);
      
      await notificationService.createAndEmit({
        recipientId: otherPartyId,
        senderId: userId,
        type: 'appointment_cancelled',
        title: 'Appointment Cancelled',
        message: `The appointment on ${appointment.slot ? new Date(appointment.slot.start).toLocaleString() : 'N/A'} has been cancelled.`,
        relatedEntityType: 'Appointment',
        relatedEntityId: appointmentId,
      });
    } else if (newStatus === 'completed') {
      await notificationService.createAndEmit({
        recipientId: getPatId(appointment.patientId),
        senderId: userId,
        type: 'system',
        title: 'Appointment Completed',
        message: `Your appointment on ${appointment.slot ? new Date(appointment.slot.start).toLocaleString() : 'N/A'} has been marked as completed.`,
        relatedEntityType: 'Appointment',
        relatedEntityId: appointmentId,
      });
    }

    return updatedAppointment;
  }

  async getVideoSession(appointmentId: string, userId: string, role: string) {
    await this.getAppointmentById(appointmentId, userId, role);
    return videoService.getSession(appointmentId, userId, role);
  }

  /**
   * Get available time slots for a doctor on a specific date.
   *
   * @param doctorId The doctor's ID.
   * @param date The date to query availability for.
   * @returns An array of available time slots { start, end }.
   */
  async getDoctorAvailableSlots(doctorId: string, date: Date) {
    // 1. Get doctor with weeklySchedule
    const doctor = await userRepo.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      throw new ApiError(404, 'Doctor not found.', { code: 'DOCTOR_NOT_FOUND' });
    }

    if (!doctor.weeklySchedule || !doctor.weeklySchedule.length) {
      return [];
    }

    // 2. Find dayOfWeek for the given date
    const targetDate = new Date(date);
    const dayOfWeekIndex = targetDate.getDay();
    const daysMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = daysMap[dayOfWeekIndex];

    // 3. Filter schedule for that dayOfWeek where isAvailable=true
    const dailySchedules = doctor.weeklySchedule.filter((schedule: any) => {
      const scheduleDay = schedule.dayOfWeek?.toString().toLowerCase();
      return (scheduleDay === dayName || schedule.dayOfWeek === dayOfWeekIndex) && schedule.isAvailable;
    });

    if (dailySchedules.length === 0) {
      return [];
    }

    // 4. Generate concrete time slots (assume 30-min intervals)
    const availableSlots: { start: Date; end: Date }[] = [];
    for (const schedule of dailySchedules) {
      if (!schedule.startTime || !schedule.endTime) continue;

      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);

      let currentSlotStart = new Date(targetDate);
      currentSlotStart.setHours(startHour, startMin, 0, 0);

      const scheduleEnd = new Date(targetDate);
      scheduleEnd.setHours(endHour, endMin, 0, 0);

      while (currentSlotStart < scheduleEnd) {
        const currentSlotEnd = new Date(currentSlotStart);
        currentSlotEnd.setMinutes(currentSlotStart.getMinutes() + 30); // 30-minute interval

        if (currentSlotEnd <= scheduleEnd) {
          availableSlots.push({ start: currentSlotStart, end: currentSlotEnd });
        }
        currentSlotStart = currentSlotEnd;
      }
    }

    // 5. Get all non-cancelled appointments for that doctor on that date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const appointmentsResult = await appointmentRepo.findWithFilters(
      {
        doctorId,
        status: { $ne: 'cancelled' },
        'slot.start': { $gte: startOfDay, $lte: endOfDay },
      },
      { limit: 1000, page: 1 }
    );
    
    const existingAppointments = appointmentsResult?.data || appointmentsResult || [];

    // 6. Remove slots that overlap with existing appointments
    const now = new Date();
    const finalSlots = availableSlots.filter((slot) => {
      // Must be in the future
      if (slot.start <= now) return false;

      // Check for overlap
      const hasOverlap = existingAppointments.some((appt: any) => {
        const apptStart = new Date(appt.slot.start);
        const apptEnd = new Date(appt.slot.end);
        return slot.start < apptEnd && slot.end > apptStart;
      });

      return !hasOverlap;
    });

    // 7. Return slots
    return finalSlots;
  }

  /**
   * List all active/available doctors, optionally filtered.
   */
  async getDoctors(filters: Record<string, any> = {}) {
    return userRepo.findActiveDoctors(filters);
  }

  /**
   * List all active departments.
   */
  async getDepartments() {
    return departmentRepo.listActive();
  }
}

export const appointmentService = new AppointmentService();
export default appointmentService;
