import { Router } from 'express';
import { getOverview } from '../../controllers/analytics.controller';
import { authenticate } from '../../middlewares/auth';

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /analytics/overview:
 *   get:
 *     summary: Fetch role-based PostgreSQL dashboard KPI metrics & weekly activity
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Role-specific metrics object and 7-day weekly activity array for SVG charts
 */
router.get('/overview', getOverview);

export default router;
