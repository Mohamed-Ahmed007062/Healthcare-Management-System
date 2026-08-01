import { prisma } from '../config/db';
import { paginate, PaginationOptions } from '../utils/pagination';

const recordInclude = {
  patient: { select: { id: true, firstName: true, lastName: true, email: true } },
  doctor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      doctorProfile: { select: { specialization: true } },
    },
  },
  uploadedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
};

export function formatMedicalRecord(rec: any) {
  if (!rec) return null;
  const formatted: any = {
    ...rec,
    _id: rec.id,
  };
  if (rec.doctor) {
    formatted.doctorId = {
      _id: rec.doctor.id,
      id: rec.doctor.id,
      firstName: rec.doctor.firstName,
      lastName: rec.doctor.lastName,
      email: rec.doctor.email,
      specialization: rec.doctor.doctorProfile?.specialization || 'General Practice',
    };
  }
  if (rec.patient) {
    formatted.patientId = {
      _id: rec.patient.id,
      id: rec.patient.id,
      firstName: rec.patient.firstName,
      lastName: rec.patient.lastName,
      email: rec.patient.email,
    };
  }
  if (rec.uploadedBy) {
    formatted.uploadedById = {
      _id: rec.uploadedBy.id,
      id: rec.uploadedBy.id,
      firstName: rec.uploadedBy.firstName,
      lastName: rec.uploadedBy.lastName,
      role: rec.uploadedBy.role,
    };
  }
  return formatted;
}

export class MedicalRecordRepository {
  async findByPatient(patientId: string, pagination: PaginationOptions) {
    const result = await paginate(
      prisma.medicalRecord,
      { patientId: patientId.toString() },
      pagination,
      recordInclude
    );

    return {
      ...result,
      data: result.data.map(formatMedicalRecord),
    };
  }

  async findAllByPatient(patientId: string) {
    if (!patientId) return [];
    const recs = await prisma.medicalRecord.findMany({
      where: { patientId: patientId.toString() },
      include: recordInclude,
      orderBy: { createdAt: 'desc' },
    });
    return recs.map(formatMedicalRecord);
  }

  async create(data: any) {
    const rec = await prisma.medicalRecord.create({
      data: {
        patientId: data.patientId.toString(),
        doctorId: data.doctorId ? data.doctorId.toString() : null,
        appointmentId: data.appointmentId ? data.appointmentId.toString() : null,
        title: data.title,
        description: data.description || null,
        type: data.type,
        files: data.files || [],
        uploadedById: data.uploadedById.toString(),
        isConfidential: data.isConfidential ?? false,
      },
      include: recordInclude,
    });
    return formatMedicalRecord(rec);
  }

  async findById(id: string) {
    if (!id) return null;
    const rec = await prisma.medicalRecord.findUnique({
      where: { id: id.toString() },
      include: recordInclude,
    });
    return formatMedicalRecord(rec);
  }
}

export const medicalRecordRepo = new MedicalRecordRepository();
export default medicalRecordRepo;
