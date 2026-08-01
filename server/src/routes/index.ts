import { Router } from 'express';
import authRoutes from './v1/auth.routes';
import healthRoutes from './v1/health.routes';
import appointmentRoutes from './v1/appointment.routes';
import notificationRoutes from './v1/notification.routes';
import prescriptionRoutes from './v1/prescription.routes';
import medicalHistoryRoutes from './v1/medicalHistory.routes';
import medicalRecordRoutes from './v1/medicalRecord.routes';
import analyticsRoutes from './v1/analytics.routes';
import docsRoutes from './v1/docs.routes';

const router = Router();

router.use('/v1/auth', authRoutes);
router.use('/v1', healthRoutes);
router.use('/v1', docsRoutes);

// Mount under /api/v1 (globally prefixed with /api)
router.use('/v1/appointments', appointmentRoutes);
router.use('/v1/notifications', notificationRoutes);
router.use('/v1/prescriptions', prescriptionRoutes);
router.use('/v1/patients', medicalHistoryRoutes);
router.use('/v1/medical-records', medicalRecordRoutes);
router.use('/v1/analytics', analyticsRoutes);

export default router;
