import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import medicalRecordService from '../services/medicalRecord.service';

export const create = asyncHandler(async (req, res) => {
  const record = await medicalRecordService.createRecord(
    req.body,
    req.user!.id.toString(),
    req.user!.role
  );
  return res.status(201).json(
    new ApiResponse(201, record, 'Medical record created successfully')
  );
});

export const list = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

  const result = await medicalRecordService.getPatientRecords(
    patientId,
    req.user!.id.toString(),
    req.user!.role,
    { page, limit }
  );

  return res.status(200).json(
    new ApiResponse(200, result, 'Medical records fetched successfully')
  );
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const record = await medicalRecordService.getRecordById(
    id,
    req.user!.id.toString(),
    req.user!.role
  );
  return res.status(200).json(
    new ApiResponse(200, record, 'Medical record details fetched successfully')
  );
});
