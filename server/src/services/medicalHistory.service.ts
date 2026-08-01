import appointmentRepo from '../repositories/appointment.repo';
import prescriptionRepo from '../repositories/prescription.repo';
import medicalRecordRepo from '../repositories/medicalRecord.repo';
import userRepo from '../repositories/user.repo';
import ApiError from '../utils/ApiError';
import type { PaginationOptions } from '../utils/pagination';
import type { TimelineEvent, TimelineResult } from '../types/medicalHistory.types';

const getDocId = (doc: any): string => {
  if (!doc) return '';
  return doc._id ? doc._id.toString() : doc.toString();
};

export class MedicalHistoryService {
  async getPatientTimeline(
    patientId: string,
    requesterId: string,
    role: string,
    pagination: PaginationOptions
  ): Promise<TimelineResult> {
    await this.assertTimelineAccess(patientId, requesterId, role);

    const patient = await userRepo.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      throw new ApiError(404, 'Patient not found');
    }

    const events: TimelineEvent[] = [];

    const allergies = patient.allergies ?? [];
    const chronicConditions = patient.chronicConditions ?? [];
    if (allergies.length > 0 || chronicConditions.length > 0) {
      events.push({
        id: `profile-${patientId}`,
        type: 'profile',
        title: 'Medical Profile',
        description: 'Allergies and chronic conditions on file',
        date: patient.updatedAt?.toISOString?.() ?? new Date().toISOString(),
        metadata: { allergies, chronicConditions, bloodGroup: patient.bloodGroup, gender: patient.gender },
      });
    }

    const appointments = await appointmentRepo.findByPatient(patientId, {
      status: { $in: ['confirmed', 'completed'] },
    });

    for (const appt of appointments as any[]) {
      const doctor = appt.doctorId;
      const doctorName = doctor
        ? `Dr. ${doctor.firstName ?? ''} ${doctor.lastName ?? ''}`.trim()
        : 'Doctor';
      events.push({
        id: appt._id?.toString() ?? '',
        type: 'appointment',
        title: `Consultation — ${appt.status}`,
        description: appt.reason || appt.diagnosis || 'Appointment visit',
        date: appt.slot?.start ?? appt.createdAt,
        relatedEntityId: appt._id?.toString(),
        metadata: {
          status: appt.status,
          meetingType: appt.meetingType,
          symptoms: appt.symptoms,
          diagnosis: appt.diagnosis,
          doctorName,
          doctorId: getDocId(doctor),
        },
      });
    }

    const prescriptions = await prescriptionRepo.findAllByPatient(patientId);
    for (const rx of prescriptions as any[]) {
      const doctor = rx.doctorId;
      const doctorName = doctor
        ? `Dr. ${doctor.firstName ?? ''} ${doctor.lastName ?? ''}`.trim()
        : 'Doctor';
      events.push({
        id: rx._id?.toString() ?? '',
        type: 'prescription',
        title: 'Prescription Issued',
        description: `${rx.medications?.length ?? 0} medication(s) prescribed by ${doctorName}`,
        date: rx.createdAt,
        relatedEntityId: rx._id?.toString(),
        metadata: {
          medicationsCount: rx.medications?.length ?? 0,
          pdfAvailable: Boolean(rx.pdf?.storagePath),
          pdfFileName: rx.pdf?.fileName,
          doctorName,
        },
      });
    }

    const records = await medicalRecordRepo.findAllByPatient(patientId);
    for (const record of records as any[]) {
      events.push({
        id: record._id?.toString() ?? '',
        type: 'medical_record',
        title: record.title,
        description: record.description || `${record.type} record`,
        date: record.createdAt,
        relatedEntityId: record._id?.toString(),
        metadata: {
          recordType: record.type,
          filesCount: record.files?.length ?? 0,
          isConfidential: record.isConfidential,
        },
      });
    }

    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const total = events.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const paginatedEvents = events.slice(start, start + limit);

    return {
      events: paginatedEvents,
      meta: { total, page, limit, totalPages },
    };
  }

  private async assertTimelineAccess(patientId: string, requesterId: string, role: string): Promise<void> {
    if (role === 'admin') return;

    if (role === 'patient') {
      if (patientId !== requesterId) {
        throw new ApiError(403, 'Access denied: Cannot view other patients\' medical history');
      }
      return;
    }

    if (role === 'doctor') {
      const hasRelationship = await appointmentRepo.hasDoctorPatientRelationship(requesterId, patientId);
      if (!hasRelationship) {
        throw new ApiError(403, 'Access denied: No clinical relationship with this patient');
      }
      return;
    }

    throw new ApiError(403, 'Unauthorized to view medical history');
  }
}

export const medicalHistoryService = new MedicalHistoryService();
export default medicalHistoryService;
