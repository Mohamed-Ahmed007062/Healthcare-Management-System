import { Router } from 'express';
import { create, getById, getByAppointment, getByPatient, downloadPdf } from '../../controllers/prescription.controller';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/rbac';
import auditLog from '../../middlewares/auditLog';
import {
  createPrescriptionSchema,
} from '../../validators/prescription.schema';
import { prescriptionIdSchema } from '../../validators/medicalHistory.schema';

const router = Router();

router.use(authenticate);

router.post(
  '/',
  authorize('doctor'),
  validate(createPrescriptionSchema),
  create
);

router.get(
  '/appointment/:appointmentId',
  getByAppointment
);

router.get(
  '/patient/:patientId',
  getByPatient
);

router.get(
  '/:id/download',
  validate(prescriptionIdSchema),
  auditLog('prescription_pdf_download'),
  downloadPdf
);

router.get(
  '/:id',
  validate(prescriptionIdSchema),
  getById
);

export default router;
