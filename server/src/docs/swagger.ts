import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Healthcare Management System API',
      version: '1.0.0',
      description:
        'Comprehensive clinical & hospital management system API built with Node.js, Express, PostgreSQL, and Prisma ORM.',
      contact: {
        name: 'API Support Team',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'V1 Base API Server',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User login, registration, email verification & password reset' },
      { name: 'Appointments', description: 'Appointment scheduling, status updates & doctor slot checking' },
      { name: 'Medical Records', description: 'Clinical document uploads, PDF prescriptions & patient medical history' },
      { name: 'Analytics', description: 'PostgreSQL live dashboard KPI metrics and activity charts' },
      { name: 'Notifications', description: 'User notifications & unread counter' },
      { name: 'Health', description: 'Server & database connectivity health checks' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT Access Token in the format: Bearer <token>',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/**/*.ts',
    './src/routes/**/*.js',
    './src/controllers/**/*.ts',
    './src/controllers/**/*.js',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
