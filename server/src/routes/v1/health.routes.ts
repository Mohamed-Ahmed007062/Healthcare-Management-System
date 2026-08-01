import { Router } from 'express';
import healthController from '../../controllers/health.controller';
import asyncHandler from '../../utils/asyncHandler';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Server Liveness Check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Server is online and responsive
 */
router.get('/health', asyncHandler(healthController.check));

/**
 * @swagger
 * /health/db:
 *   get:
 *     summary: PostgreSQL Database Connectivity Check
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Database is connected
 */
router.get('/health/db', asyncHandler(healthController.checkDB));

export default router;
