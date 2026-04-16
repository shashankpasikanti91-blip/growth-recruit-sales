import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    }),
  );
  app.use(compression());
  app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

  // Disable X-Powered-By to prevent tech stack fingerprinting
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.disable('x-powered-by');

  // Additional security headers for document/data protection
  app.use((_req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    next();
  });

  // CORS — production allows only the configured frontend; dev also allows localhost
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const allowedOrigins =
    nodeEnv === 'production'
      ? [frontendUrl]
      : [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400,
  });

  // Global prefix & versioning
  app.setGlobalPrefix('api', { exclude: ['/health'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Global exception filter — maps Prisma errors, prevents raw DB leakage
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Health check endpoint (no auth, no prefix)
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', env: nodeEnv, ts: new Date().toISOString() });
  });
  // Also expose under api/v1 for healthcheck compatibility
  httpAdapter.get('/api/v1/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', env: nodeEnv, ts: new Date().toISOString() });
  });

  // Swagger docs — development/staging only; never expose in production
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('SRP AI Labs - Recruitment + Sales Platform API')
      .setDescription('Multi-tenant agentic automation platform for recruitment and sales')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication')
      .addTag('tenants', 'Tenant Management')
      .addTag('users', 'User Management')
      .addTag('candidates', 'Candidate Management')
      .addTag('jobs', 'Job Management')
      .addTag('leads', 'Lead Management')
      .addTag('companies', 'Company Management')
      .addTag('imports', 'Source Import Engine')
      .addTag('mappings', 'Field Mapping Templates')
      .addTag('outreach', 'Outreach & Sequences')
      .addTag('ai', 'AI Services')
      .addTag('workflows', 'Workflow Runs')
      .addTag('webhooks', 'n8n Webhook Endpoints')
      .addTag('analytics', 'Analytics & Reporting')
      .addTag('integrations', 'Integration Registry')
      .addTag('countries', 'Country Configuration')
      .addTag('documents', 'Document Storage')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`SRP Platform API running on http://localhost:${port}/api`);
  if (nodeEnv !== 'production') {
    logger.log(`Swagger docs at http://localhost:${port}/api/docs`);
  }
}

bootstrap();
