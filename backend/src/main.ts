import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security
  app.use(helmet());
  app.use(compression());
  app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));

  // CORS — allow configured frontend origin + localhost for dev
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Global prefix & versioning
  app.setGlobalPrefix('api', { exclude: ['/health'] });
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

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

  // Swagger docs (always enabled)
  {
    const isDev = nodeEnv !== 'production';  /* keep docs in prod too — secured by rate limit */
    if (true) {
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
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    void isDev; // suppress unused warning
    }
  }

  await app.listen(port);
  console.log(`\n🚀 SRP Platform API running on http://localhost:${port}/api`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api/docs\n`);
}

bootstrap();
