import { prisma } from '../config/db';
import { paginate, PaginationOptions } from '../utils/pagination';

const prescriptionInclude = {
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
  appointment: true,
};

export function formatPrescription(rx: any) {
  if (!rx) return null;
  const formatted: any = {
    ...rx,
    _id: rx.id,
    pdf: rx.pdfStoragePath ? {
      fileName: rx.pdfFileName,
      storagePath: rx.pdfStoragePath,
      generatedAt: rx.pdfGeneratedAt,
    } : null,
  };

  if (rx.patient) {
    formatted.patientId = {
      _id: rx.patient.id,
      id: rx.patient.id,
      firstName: rx.patient.firstName,
      lastName: rx.patient.lastName,
      email: rx.patient.email,
    };
  }

  if (rx.doctor) {
    formatted.doctorId = {
      _id: rx.doctor.id,
      id: rx.doctor.id,
      firstName: rx.doctor.firstName,
      lastName: rx.doctor.lastName,
      email: rx.doctor.email,
      specialization: rx.doctor.doctorProfile?.specialization || 'General Practice',
    };
  }

  if (rx.appointment) {
    formatted.appointmentId = {
      _id: rx.appointment.id,
      id: rx.appointment.id,
      ...rx.appointment,
    };
  }

  return formatted;
}

export class PrescriptionRepository {
  /**
   * Create a new prescription
   */
  async create(data: any) {
    const rx = await prisma.prescription.create({
      data: {
        appointmentId: data.appointmentId.toString(),
        patientId: data.patientId.toString(),
        doctorId: data.doctorId.toString(),
        medications: data.medications || [],
        notes: data.notes || null,
      },
      include: prescriptionInclude,
    });
    return formatPrescription(rx);
  }

  /**
   * Find a prescription by ID
   */
  async findById(id: string) {
    if (!id) return null;
    const rx = await prisma.prescription.findUnique({
      where: { id: id.toString() },
      include: prescriptionInclude,
    });
    return formatPrescription(rx);
  }

  /**
   * Find all prescriptions related to a specific appointment
   */
  async findByAppointment(appointmentId: string) {
    if (!appointmentId) return [];
    const rxs = await prisma.prescription.findMany({
      where: { appointmentId: appointmentId.toString() },
      include: prescriptionInclude,
    });
    return rxs.map(formatPrescription);
  }

  /**
   * Find prescriptions belonging to a specific patient, with pagination
   */
  async findByPatient(patientId: string, pagination: PaginationOptions) {
    const result = await paginate(
      prisma.prescription,
      { patientId: patientId.toString() },
      pagination,
      prescriptionInclude
    );

    return {
      ...result,
      data: result.data.map(formatPrescription),
    };
  }

  /**
   * Find prescriptions issued by a specific doctor, with pagination
   */
  async findByDoctor(doctorId: string, pagination: PaginationOptions) {
    const result = await paginate(
      prisma.prescription,
      { doctorId: doctorId.toString() },
      pagination,
      prescriptionInclude
    );

    return {
      ...result,
      data: result.data.map(formatPrescription),
    };
  }

  async updatePdf(id: string, pdf: {
    fileName: string;
    storagePath: string;
    generatedAt: Date;
    sizeBytes?: number;
  }) {
    const rx = await prisma.prescription.update({
      where: { id: id.toString() },
      data: {
        pdfFileName: pdf.fileName,
        pdfStoragePath: pdf.storagePath,
        pdfGeneratedAt: pdf.generatedAt,
      },
      include: prescriptionInclude,
    });
    return formatPrescription(rx);
  }

  async findAllByPatient(patientId: string) {
    if (!patientId) return [];
    const rxs = await prisma.prescription.findMany({
      where: { patientId: patientId.toString() },
      include: prescriptionInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rxs.map(formatPrescription);
  }
}

export const prescriptionRepo = new PrescriptionRepository();
export default prescriptionRepo;
