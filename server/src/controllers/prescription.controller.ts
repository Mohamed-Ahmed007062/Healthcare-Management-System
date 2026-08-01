import type { Request, Response } from 'express';
import fs from 'fs';
import prescriptionService from '../services/prescription.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const prescription = await prescriptionService.createPrescription(req.body, req.user!.id as string);
  res.status(201).json(new ApiResponse(201, prescription, 'Prescription created successfully'));
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const prescription = await prescriptionService.getPrescriptionById(
    req.params.id,
    req.user!.id as string,
    req.user!.role
  );
  res.status(200).json(new ApiResponse(200, prescription, 'Prescription fetched successfully'));
});

export const getByAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const prescription = await prescriptionService.getPrescriptionByAppointment(
    req.params.appointmentId,
    req.user!.id as string,
    req.user!.role
  );
  res.status(200).json(new ApiResponse(200, prescription, 'Prescription fetched successfully'));
});

export const getByPatient = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const prescriptions = await prescriptionService.getPatientPrescriptions(
    req.params.patientId,
    req.user!.id as string,
    req.user!.role,
    { page, limit }
  );
  res.status(200).json(new ApiResponse(200, prescriptions, 'Prescriptions fetched successfully'));
});

export const downloadPdf = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { filePath, fileName } = await prescriptionService.downloadPrescriptionPdf(
    req.params.id,
    req.user!.id as string,
    req.user!.role
  );

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});
