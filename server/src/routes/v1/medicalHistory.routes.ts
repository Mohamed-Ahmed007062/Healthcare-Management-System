import { Router } from 'express';
import { getPatientTimeline } from '../../controllers/medicalHistory.controller';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/auth';
import { timelineQuerySchema } from '../../validators/medicalHistory.schema';

const router = Router();

router.use(authenticate);

router.get(
  '/:patientId/timeline',
  validate(timelineQuerySchema),
  getPatientTimeline
);

export default router;
