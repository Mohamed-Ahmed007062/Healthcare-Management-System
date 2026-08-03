import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDB, registerShutdownHooks } from './config/db';
import router from './routes';
import csrfProtection from './middlewares/csrf';
import { generalLimiter } from './middlewares/rateLimit';
import notFound from './middlewares/notFound';
import errorHandler from './middlewares/error';
import { initSocketServer } from './config/socket';
import notificationService from './services/notification.service';

const app = express();

// 1. Basic Security Headers (Helmet)
app.use(helmet());

// 2. CORS configuration (credentials allowed, dynamic origin)
const allowedOrigins = env.CLIENT_URL.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) return callback(null, true);

      // Check against explicit allowlist
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow any Vercel preview deployment (*.vercel.app)
      if (/\.vercel\.app$/.test(origin)) return callback(null, true);

      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-CSRF-TOKEN'],
  }),
);

// 3. Request parsers with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// 4. Parameter Pollution Protection
app.use(hpp());

// 6. Request Logging with Pino HTTP
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url?.startsWith('/api/v1/health') ?? false, // skip logging health checks to reduce noise
    },
    wrapSerializers: true,
  }),
);

// 7. General Rate Limiter (application-wide)
app.use(generalLimiter);

// 8. Custom CSRF Double-Submit protection middleware (except GET, HEAD, OPTIONS)
app.use(csrfProtection);

// 9. Base Router mounted on /api
app.use('/api', router);

// 10. Fallback middlewares
app.use(notFound);
app.use(errorHandler);

// Server startup function
async function boot() {
  try {
    // Connect to database
    await connectDB();

    // Start Express listening
    const httpServer = http.createServer(app);
    const io = initSocketServer(httpServer);
    notificationService.setSocketServer(io);

    const server = httpServer.listen(env.PORT, () => {
      logger.info(`Server successfully started on port ${env.PORT} in [${env.NODE_ENV}] mode`);
      logger.info(`📚 Swagger UI documentation available at http://localhost:${env.PORT}/api/v1/docs`);
    });

    // Hook graceful shutdown SIGINT/SIGTERM listeners
    registerShutdownHooks(server);
  } catch (err) {
    logger.fatal({ err }, 'Express failed to boot due to database connectivity issue');
    process.exit(1);
  }
}

// Auto boot unless running in a test suite
if (env.NODE_ENV !== 'test') {
  boot();
}

export { app };
export default app;
