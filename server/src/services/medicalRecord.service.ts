import medicalRecordRepo from '../repositories/medicalRecord.repo';
import appointmentRepo from '../repositories/appointment.repo';
import userRepo from '../repositories/user.repo';
import ApiError from '../utils/ApiError';
import type { PaginationOptions } from '../utils/pagination';

const getDocId = (doc: any): string => {
  if (!doc) return '';
  return doc._id ? doc._id.toString() : doc.toString();
};

const getPatId = (pat: any): string => {
  if (!pat) return '';
  return pat._id ? pat._id.toString() : pat.toString();
};

export class MedicalRecordService {
  /**
   * Create a new medical record (Doctor, Patient, or Admin)
   */
  async createRecord(
    data: {
      patientId: string;
      doctorId?: string;
      appointmentId?: string;
      title: string;
      description?: string;
      type: string;
      files?: Array<{ url: string; fileName: string; sizeBytes?: number; mimeType?: string }>;
      isConfidential?: boolean;
    },
    userId: string,
    role: string
  ) {
    // 1. Verify patient exists
    const patient = await userRepo.findById(data.patientId);
    if (!patient || patient.role !== 'patient') {
      throw new ApiError(404, 'Patient not found');
    }

    // 2. Authorization & payload augmentation
    let doctorId: string | undefined = data.doctorId;

    if (role === 'patient') {
      if (data.patientId !== userId) {
        throw new ApiError(403, 'You can only upload medical records to your own profile.');
      }
    } else if (role === 'doctor') {
      doctorId = userId;
      // Verify clinical relationship
      const hasRelationship = await appointmentRepo.hasDoctorPatientRelationship(userId, data.patientId);
      if (!hasRelationship) {
        throw new ApiError(403, 'You do not have a clinical relationship with this patient.');
      }
    } else if (role !== 'admin') {
      throw new ApiError(403, 'Unauthorized to create medical records.');
    }

    const recordData = {
      ...data,
      doctorId,
      uploadedById: userId,
    };

    return await medicalRecordRepo.create(recordData);
  }

  /**
   * Get paginated medical records of a patient
   */
  async getPatientRecords(patientId: string, userId: string, role: string, pagination: PaginationOptions) {
    // Authorization
    if (role === 'patient') {
      if (patientId !== userId) {
        throw new ApiError(403, 'Access denied: Cannot view other patients\' medical records.');
      }
    } else if (role === 'doctor') {
      const hasRelationship = await appointmentRepo.hasDoctorPatientRelationship(userId, patientId);
      if (!hasRelationship) {
        throw new ApiError(403, 'Access denied: No clinical relationship with this patient.');
      }
    } else if (role !== 'admin') {
      throw new ApiError(403, 'Unauthorized.');
    }

    return await medicalRecordRepo.findByPatient(patientId, pagination);
  }

  /**
   * Get a single medical record by ID
   */
  async getRecordById(recordId: string, userId: string, role: string) {
    const record = await medicalRecordRepo.findById(recordId);
    if (!record) {
      throw new ApiError(404, 'Medical record not found.');
    }

    const patId = getPatId(record.patientId);
    const docId = getDocId(record.doctorId);

    // Authorization
    if (role === 'patient') {
      if (patId !== userId) {
        throw new ApiError(403, 'Access denied: You cannot view this medical record.');
      }
    } else if (role === 'doctor') {
      if (docId !== userId) {
        // If they are not the doctor who created it, verify they have any active relationship
        const hasRelationship = await appointmentRepo.hasDoctorPatientRelationship(userId, patId);
        if (!hasRelationship) {
          throw new ApiError(403, 'Access denied: No clinical relationship with this patient.');
        }
      }
    } else if (role !== 'admin') {
      throw new ApiError(403, 'Unauthorized.');
    }

    return record;
  }
}

export const medicalRecordService = new MedicalRecordService();
export default medicalRecordService;
