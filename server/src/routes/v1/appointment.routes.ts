import { Router } from 'express';
import appointmentController from '../../controllers/appointment.controller';
import { validate } from '../../middlewares/validate';
import { authenticate } from '../../middlewares/auth';
import { authorize } from '../../middlewares/rbac';
import asyncHandler from '../../utils/asyncHandler';
import {
  bookAppointmentSchema,
  getAppointmentsQuerySchema,
  updateStatusSchema,
  getAvailableSlotsSchema,
} from '../../validators/appointment.schema';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /appointments:
 *   post:
 *     summary: Book a new medical consultation appointment
 *     tags: [Appointments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [doctorId, slot]
 *             properties:
 *               doctorId: { type: string }
 *               slot:
 *                 type: object
 *                 properties:
 *                   start: { type: string, format: date-time }
 *                   end: { type: string, format: date-time }
 *               reason: { type: string }
 *               meetingType: { type: string, enum: [in_person, video] }
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 */
router.post(
  '/',
  authorize('patient', 'admin'),
  validate(bookAppointmentSchema),
  asyncHandler(appointmentController.book)
);

/**
 * @swagger
 * /appointments:
 *   get:
 *     summary: List filtered appointments (Patient / Doctor / Admin)
 *     tags: [Appointments]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: List of appointments with pagination metadata
 */
router.get(
  '/',
  validate(getAppointmentsQuerySchema),
  asyncHandler(appointmentController.list)
);

/**
 * @swagger
 * /appointments/doctors/{doctorId}/available-slots:
 *   get:
 *     summary: Get available consultation time slots for a doctor on a specific date
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: doctorId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: date
 *         required: true
 *         schema: { type: string, example: "2026-08-20" }
 *     responses:
 *       200:
 *         description: Array of available time slots
 */
router.get(
  '/doctors/:doctorId/available-slots',
  validate(getAvailableSlotsSchema),
  asyncHandler(appointmentController.getAvailableSlots)
);

/**
 * @swagger
 * /appointments/doctors:
 *   get:
 *     summary: List all active hospital physicians
 *     tags: [Appointments]
 *     responses:
 *       200:
 *         description: List of active doctors with profiles
 */
router.get(
  '/doctors',
  asyncHandler(appointmentController.listDoctors)
);

/**
 * @swagger
 * /appointments/departments:
 *   get:
 *     summary: List all active clinical departments
 *     tags: [Appointments]
 *     responses:
 *       200:
 *         description: List of medical departments
 */
router.get(
  '/departments',
  asyncHandler(appointmentController.listDepartments)
);

/**
 * @swagger
 * /appointments/{id}/video-session:
 *   get:
 *     summary: Validate and fetch WebRTC video session metadata
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Video session details including roomId and canJoin state
 */
router.get(
  '/:id/video-session',
  asyncHandler(appointmentController.getVideoSession)
);

/**
 * @swagger
 * /appointments/{id}:
 *   get:
 *     summary: Get single appointment details by ID
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Appointment object
 */
router.get(
  '/:id',
  asyncHandler(appointmentController.getById)
);

/**
 * @swagger
 * /appointments/{id}/status:
 *   patch:
 *     summary: Update appointment status (Doctor / Admin)
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [confirmed, completed, cancelled, no_show] }
 *     responses:
 *       200:
 *         description: Updated appointment
 */
router.patch(
  '/:id/status',
  authorize('doctor', 'admin'),
  validate(updateStatusSchema),
  asyncHandler(appointmentController.updateStatus)
);

/**
 * @swagger
 * /appointments/{id}:
 *   delete:
 *     summary: Cancel an appointment
 *     tags: [Appointments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 */
router.delete(
  '/:id',
  asyncHandler(appointmentController.cancel)
);

export default router;
