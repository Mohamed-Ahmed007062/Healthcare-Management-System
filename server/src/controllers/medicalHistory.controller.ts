import type { Request, Response } from 'express';
import medicalHistoryService from '../services/medicalHistory.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';

export const getPatientTimeline = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const result = await medicalHistoryService.getPatientTimeline(
    req.params.patientId,
    req.user!.id as string,
    req.user!.role,
    { page, limit }
  );

  res.status(200).json(new ApiResponse(200, result, 'Medical history timeline fetched successfully'));
});

export default { getPatientTimeline };
