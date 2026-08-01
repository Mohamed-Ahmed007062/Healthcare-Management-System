import type { Request, Response } from 'express';
import analyticsService from '../services/analytics.service';
import ApiResponse from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';

export const getOverview = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const data = await analyticsService.getOverview(req.user!.id as string, req.user!.role);
  res.status(200).json(new ApiResponse(200, data, 'Analytics overview fetched successfully'));
});
