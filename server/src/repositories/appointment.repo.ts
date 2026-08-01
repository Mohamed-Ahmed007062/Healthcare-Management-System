import { prisma } from '../config/db';
import { paginate, PaginationOptions } from '../utils/pagination';

const appointmentInclude = {
  patient: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  doctor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      doctorProfile: { select: { specialization: true, consultationFee: true } },
    },
  },
  prescription: true,
};

export function formatAppointment(appt: any) {
  if (!appt) return null;
  const formatted: any = {
    ...appt,
    _id: appt.id,
    slot: {
      start: appt.slotStart,
      end: appt.slotEnd,
    },
    videoRoom: appt.videoRoomId ? {
      roomId: appt.videoRoomId,
      status: 'active',
    } : null,
  };

  if (appt.patient) {
    formatted.patientId = {
      _id: appt.patient.id,
      id: appt.patient.id,
      firstName: appt.patient.firstName,
      lastName: appt.patient.lastName,
      email: appt.patient.email,
    };
  }

  if (appt.doctor) {
    formatted.doctorId = {
      _id: appt.doctor.id,
      id: appt.doctor.id,
      firstName: appt.doctor.firstName,
      lastName: appt.doctor.lastName,
      email: appt.doctor.email,
      specialization: appt.doctor.doctorProfile?.specialization || 'General Practice',
      consultationFee: appt.doctor.doctorProfile?.consultationFee || 0,
    };
  }

  if (appt.prescription) {
    formatted.prescriptionId = {
      _id: appt.prescription.id,
      id: appt.prescription.id,
      ...appt.prescription,
    };
  }

  return formatted;
}

export class AppointmentRepository {
  /**
   * Create a new appointment
   */
  async create(data: any) {
    const slotStart = data.slot?.start ? new Date(data.slot.start) : new Date(data.slotStart);
    const slotEnd = data.slot?.end ? new Date(data.slot.end) : new Date(data.slotEnd);

    const appt = await prisma.appointment.create({
      data: {
        patientId: data.patientId.toString(),
        doctorId: data.doctorId.toString(),
        slotStart,
        slotEnd,
        status: data.status || 'pending',
        reason: data.reason || null,
        symptoms: data.symptoms || [],
        meetingType: data.meetingType || 'in_person',
        notes: data.notes || null,
        videoRoomId: data.videoRoomId || data.videoRoom?.roomId || null,
      },
      include: appointmentInclude,
    });
    return formatAppointment(appt);
  }

  /**
   * Find appointment by ID
   */
  async findById(id: string) {
    if (!id) return null;
    const appt = await prisma.appointment.findUnique({
      where: { id: id.toString() },
      include: appointmentInclude,
    });
    return formatAppointment(appt);
  }

  /**
   * Find appointments by doctor ID
   */
  async findByDoctor(doctorId: string, filters: Record<string, any> = {}) {
    if (!doctorId) return [];
    const where: any = { doctorId: doctorId.toString() };
    if (filters.status) {
      if (typeof filters.status === 'object' && filters.status !== null) {
        if (filters.status.$in) where.status = { in: filters.status.$in };
        else if (filters.status.$ne) where.status = { not: filters.status.$ne };
      } else {
        where.status = filters.status;
      }
    }
    const appts = await prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { slotStart: 'asc' },
    });
    return appts.map(formatAppointment);
  }

  /**
   * Find appointments by patient ID
   */
  async findByPatient(patientId: string, filters: Record<string, any> = {}) {
    if (!patientId) return [];
    const where: any = { patientId: patientId.toString() };
    if (filters.status) {
      if (typeof filters.status === 'object' && filters.status !== null) {
        if (filters.status.$in) where.status = { in: filters.status.$in };
        else if (filters.status.$ne) where.status = { not: filters.status.$ne };
      } else {
        where.status = filters.status;
      }
    }
    const appts = await prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { slotStart: 'desc' },
    });
    return appts.map(formatAppointment);
  }

  /**
   * Find appointments with custom filters using pagination
   */
  async findWithFilters(filters: Record<string, any>, pagination: PaginationOptions) {
    const where: any = {};

    for (const [key, val] of Object.entries(filters)) {
      if (key === 'slot.start') {
        where.slotStart = {};
        if (typeof val === 'object' && val !== null) {
          if (val.$gte) where.slotStart.gte = new Date(val.$gte);
          if (val.$lte) where.slotStart.lte = new Date(val.$lte);
        }
      } else if (key === 'status') {
        if (typeof val === 'object' && val !== null) {
          if (val.$ne) where.status = { not: val.$ne };
          else if (val.$in) where.status = { in: val.$in };
          else if (val.$nin) where.status = { notIn: val.$nin };
          else where.status = val;
        } else {
          where.status = val;
        }
      } else {
        where[key] = val;
      }
    }

    const result = await paginate(
      prisma.appointment,
      where,
      pagination,
      appointmentInclude
    );

    return {
      ...result,
      data: result.data.map(formatAppointment),
    };
  }

  /**
   * Update the status of an appointment
   */
  async updateStatus(id: string, status: string, cancelledById?: string) {
    const data: any = { status: status as any };
    if (cancelledById) {
      data.cancelledById = cancelledById.toString();
    }
    const appt = await prisma.appointment.update({
      where: { id: id.toString() },
      data,
      include: appointmentInclude,
    });
    return formatAppointment(appt);
  }

  /**
   * Check if a doctor has a conflicting appointment in the specified time slot
   */
  async checkSlotConflict(
    doctorId: string,
    start: Date,
    end: Date,
    excludeId?: string
  ): Promise<boolean> {
    const where: any = {
      doctorId: doctorId.toString(),
      status: { not: 'cancelled' },
      slotStart: { lt: end },
      slotEnd: { gt: start },
    };

    if (excludeId) {
      where.id = { not: excludeId.toString() };
    }

    const count = await prisma.appointment.count({ where });
    return count > 0;
  }

  /**
   * Generic update method for an appointment
   */
  async update(id: string, data: any) {
    const updateData: any = { ...data };
    if (data.slot?.start) updateData.slotStart = new Date(data.slot.start);
    if (data.slot?.end) updateData.slotEnd = new Date(data.slot.end);
    delete updateData.slot;

    if (data.videoRoom?.roomId) {
      updateData.videoRoomId = data.videoRoom.roomId;
      delete updateData.videoRoom;
    }

    const appt = await prisma.appointment.update({
      where: { id: id.toString() },
      data: updateData,
      include: appointmentInclude,
    });
    return formatAppointment(appt);
  }

  async updateVideoRoom(id: string, videoRoom: Record<string, any>) {
    const appt = await prisma.appointment.update({
      where: { id: id.toString() },
      data: {
        videoRoomId: videoRoom.roomId ? String(videoRoom.roomId) : null,
      },
      include: appointmentInclude,
    });
    return formatAppointment(appt);
  }

  async findByVideoRoomId(roomId: string) {
    if (!roomId) return null;
    const appt = await prisma.appointment.findFirst({
      where: { videoRoomId: roomId },
      include: appointmentInclude,
    });
    return formatAppointment(appt);
  }

  async hasDoctorPatientRelationship(doctorId: string, patientId: string): Promise<boolean> {
    if (!doctorId || !patientId) return false;
    const count = await prisma.appointment.count({
      where: {
        doctorId: doctorId.toString(),
        patientId: patientId.toString(),
        status: { not: 'cancelled' },
      },
    });
    return count > 0;
  }
}

export const appointmentRepo = new AppointmentRepository();
export default appointmentRepo;
