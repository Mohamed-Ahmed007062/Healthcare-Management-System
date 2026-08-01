import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from '../../docs/swagger';

const router = Router();

// Expose raw OpenAPI JSON spec at /api/v1/docs.json
router.get('/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Serve interactive Swagger UI documentation at /api/v1/docs
router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

export default router;
