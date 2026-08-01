import prescriptionRepo from '../repositories/prescription.repo';
import appointmentRepo from '../repositories/appointment.repo';
import notificationService from './notification.service';
import pdfService from './pdf.service';
import ApiError from '../utils/ApiError';
import type { PaginationOptions } from '../utils/pagination';

const getEntityId = (entity: any): string => {
  if (!entity) return '';
  return entity._id ? entity._id.toString() : entity.toString();
};

export class PrescriptionService {
  async createPrescription(
    data: {
      appointmentId: string;
      patientId: string;
      medications: Array<{
        name: string;
        dosage: string;
        frequency: string;
        durationDays?: number;
        instructions?: string;
      }>;
      notes?: string;
    },
    doctorId: string
  ): Promise<any> {
    const appointment = await appointmentRepo.findById(data.appointmentId);
    if (!appointment) {
      throw new ApiError(404, 'Appointment not found');
    }

    const appointmentDoctorId = getEntityId(appointment.doctorId);
    if (appointmentDoctorId !== doctorId) {
      throw new ApiError(403, 'Only the assigned doctor can create a prescription');
    }

    if (appointment.status !== 'confirmed' && appointment.status !== 'completed') {
      throw new ApiError(400, 'Prescription can only be created for confirmed or completed appointments');
    }

    const prescription = await prescriptionRepo.create({ ...data, doctorId });
    await appointmentRepo.update(data.appointmentId, { prescriptionId: prescription._id });

    const populated = await prescriptionRepo.findById(prescription._id);
    const pdfMeta = await pdfService.generatePrescriptionPdf(populated);
    const updated = await prescriptionRepo.updatePdf(prescription._id, pdfMeta);

    await notificationService.createAndEmit({
      recipientId: data.patientId,
      senderId: doctorId,
      type: 'system',
      title: 'Prescription Ready',
      message: 'Your prescription has been issued and is ready for download.',
      relatedEntityType: 'Prescription',
      relatedEntityId: prescription._id?.toString(),
    });

    return updated ?? populated;
  }

  async getPrescriptionById(id: string, userId: string, role: string): Promise<any> {
    const prescription = await prescriptionRepo.findById(id);
    if (!prescription) {
      throw new ApiError(404, 'Prescription not found');
    }

    this.assertPrescriptionAccess(prescription, userId, role);
    return prescription;
  }

  async getPrescriptionByAppointment(appointmentId: string, userId: string, role: string): Promise<any> {
    const prescriptions = await prescriptionRepo.findByAppointment(appointmentId);
    const prescription = Array.isArray(prescriptions) ? prescriptions[0] : prescriptions;
    if (!prescription) {
      throw new ApiError(404, 'Prescription not found');
    }

    this.assertPrescriptionAccess(prescription, userId, role);
    return prescription;
  }

  async getPatientPrescriptions(
    patientId: string,
    userId: string,
    role: string,
    pagination: PaginationOptions
  ): Promise<any> {
    if (role === 'patient' && patientId !== userId) {
      throw new ApiError(403, 'Access denied: Cannot view other patients\' prescriptions');
    }

    return await prescriptionRepo.findByPatient(patientId, pagination);
  }

  async downloadPrescriptionPdf(id: string, userId: string, role: string): Promise<{
    filePath: string;
    fileName: string;
  }> {
    const prescription = await this.getPrescriptionById(id, userId, role);

    if (!prescription.pdf?.storagePath) {
      throw new ApiError(404, 'PDF not available for this prescription');
    }

    const filePath = pdfService.resolveAbsolutePath(prescription.pdf.storagePath);
    if (!pdfService.fileExists(prescription.pdf.storagePath)) {
      throw new ApiError(404, 'Prescription PDF file not found on server');
    }

    return {
      filePath,
      fileName: prescription.pdf.fileName ?? `RX-${id}.pdf`,
    };
  }

  private assertPrescriptionAccess(prescription: any, userId: string, role: string): void {
    if (role === 'admin') return;

    const patientIdStr = getEntityId(prescription.patientId);
    const doctorIdStr = getEntityId(prescription.doctorId);

    if (patientIdStr !== userId && doctorIdStr !== userId) {
      throw new ApiError(403, 'Access denied to this prescription');
    }
  }
}

export const prescriptionService = new PrescriptionService();
export default prescriptionService;
