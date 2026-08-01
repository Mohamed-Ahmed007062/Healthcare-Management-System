import { Router } from 'express';
import { authenticate } from '../../middlewares/auth';
import { create, list, getById } from '../../controllers/medicalRecord.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /medical-records:
 *   post:
 *     summary: Upload or create a new clinical medical record
 *     tags: [Medical Records]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patientId, title, type]
 *             properties:
 *               patientId: { type: string }
 *               title: { type: string, example: "Blood Test Results" }
 *               type: { type: string, enum: [lab_report, scan, prescription, discharge_summary, other] }
 *               description: { type: string }
 *               isConfidential: { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Medical record uploaded successfully
 */
router.post('/', create);

/**
 * @swagger
 * /medical-records/patient/{patientId}:
 *   get:
 *     summary: Get patient medical records portal history
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of medical records
 */
router.get('/patient/:patientId', list);

/**
 * @swagger
 * /medical-records/{id}:
 *   get:
 *     summary: Get single medical record by ID
 *     tags: [Medical Records]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Medical record details
 */
router.get('/:id', getById);

export default router;
