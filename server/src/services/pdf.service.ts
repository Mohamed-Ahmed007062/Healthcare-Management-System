import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface PrescriptionPdfMeta {
  fileName: string;
  storagePath: string;
  generatedAt: Date;
  sizeBytes: number;
}

export class PdfService {
  private getOutputDir(): string {
    return path.resolve(process.cwd(), env.PRESCRIPTION_PDF_DIR);
  }

  async generatePrescriptionPdf(prescription: any): Promise<PrescriptionPdfMeta> {
    const prescriptionId = prescription._id?.toString() ?? 'unknown';
    const outputDir = this.getOutputDir();

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `RX-${prescriptionId}.pdf`;
    const absolutePath = path.join(outputDir, fileName);
    const relativePath = path.join(env.PRESCRIPTION_PDF_DIR, fileName).replace(/\\/g, '/');

    await this.renderPrescriptionPdf(prescription, absolutePath);

    const stats = fs.statSync(absolutePath);

    return {
      fileName,
      storagePath: relativePath,
      generatedAt: new Date(),
      sizeBytes: stats.size,
    };
  }

  resolveAbsolutePath(storagePath: string): string {
    return path.resolve(process.cwd(), storagePath);
  }

  fileExists(storagePath: string): boolean {
    return fs.existsSync(this.resolveAbsolutePath(storagePath));
  }

  private renderPrescriptionPdf(prescription: any, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(outputPath);

      doc.pipe(stream);

      const patient = prescription.patientId ?? {};
      const doctor = prescription.doctorId ?? {};
      const patientName = `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || 'Patient';
      const doctorName = `Dr. ${doctor.firstName ?? ''} ${doctor.lastName ?? ''}`.trim();
      const specialization = doctor.specialization ?? 'General Practice';
      const issuedAt = new Date(prescription.createdAt ?? Date.now()).toLocaleString();

      doc.fontSize(20).font('Helvetica-Bold').text('Healthcare Clinic', { align: 'center' });
      doc.fontSize(14).font('Helvetica').text('Official Prescription', { align: 'center' });
      doc.moveDown();

      doc.fontSize(10).text(`Prescription ID: ${prescription._id?.toString() ?? 'N/A'}`);
      doc.text(`Issued: ${issuedAt}`);
      doc.moveDown();

      doc.fontSize(12).font('Helvetica-Bold').text('Doctor');
      doc.font('Helvetica').text(`${doctorName}`);
      doc.text(`Specialization: ${specialization}`);
      doc.moveDown();

      doc.font('Helvetica-Bold').text('Patient');
      doc.font('Helvetica').text(`${patientName}`);
      if (patient.email) doc.text(`Email: ${patient.email}`);
      doc.moveDown();

      doc.font('Helvetica-Bold').text('Medications');
      doc.moveDown(0.5);

      const medications = prescription.medications ?? [];
      if (medications.length === 0) {
        doc.font('Helvetica').text('No medications listed.');
      } else {
        medications.forEach((med: any, index: number) => {
          doc.font('Helvetica-Bold').text(`${index + 1}. ${med.name}`);
          doc.font('Helvetica').text(`   Dosage: ${med.dosage}`);
          doc.text(`   Frequency: ${med.frequency}`);
          if (med.durationDays) doc.text(`   Duration: ${med.durationDays} days`);
          if (med.instructions) doc.text(`   Instructions: ${med.instructions}`);
          doc.moveDown(0.5);
        });
      }

      if (prescription.notes) {
        doc.moveDown();
        doc.font('Helvetica-Bold').text('Notes');
        doc.font('Helvetica').text(prescription.notes);
      }

      doc.moveDown(2);
      doc.fontSize(9).fillColor('#666666').text(
        'This document was generated electronically and is valid without a physical signature.',
        { align: 'center' }
      );

      doc.end();

      stream.on('finish', () => resolve());
      stream.on('error', (err) => {
        logger.error({ err }, 'Failed to write prescription PDF');
        reject(err);
      });
    });
  }
}

export const pdfService = new PdfService();
export default pdfService;
