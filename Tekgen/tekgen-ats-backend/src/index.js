require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const hpp = require('hpp');
const http = require('http');
const path = require('path');
const fs = require('fs');
const prisma = require('./config/database');
const { encryptPassword } = require('./utils/encryption');

// Import routes
const authRoutes = require('./routes/authRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const jobRoutes = require('./routes/jobRoutes');
const screeningRoutes = require('./routes/screeningRoutes');
const emailRoutes = require('./routes/emailRoutes');
const advancedAnalyticsRoutes = require('./routes/advancedAnalyticsRoutes');
const exportRoutes = require('./routes/exportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const followupRoutes = require('./routes/followupRoutes');
const activityRoutes = require('./routes/activityRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const hrmsRoutes = require('./routes/hrmsRoutes');
const clientRoutes = require('./routes/clientRoutes');
const myWorkspaceRoutes = require('./routes/myWorkspaceRoutes');
const salesRoutes = require('./routes/salesRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const payrollRoutes = require('./routes/payroll');
const financeRoutes = require('./routes/finance');

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { sanitizeRequest } = require('./middleware/requestSanitizer');
const { requestIdMiddleware } = require('./middleware/requestIdMiddleware');
const config = require('./config/environment');
const logger = require('./utils/logger');
const { getDemoAccountsForSeed } = require(path.join(__dirname, '../../shared/demoWorkspaceAccounts.js'));
const { generateJobId } = require('./utils/idGenerator');

// Import services
const emailAutomationService = require('./services/emailAutomationService');

// Initialize Express app
const app = express();

// Trust proxy (needed for ngrok / reverse proxies so rate limiter uses real client IP)
app.set('trust proxy', 1);

// Add ngrok skip-browser-warning header so team members can access without clicking through ngrok's interstitial page
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync(config.UPLOAD_DIR)) {
  fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
}

// ============= SECURITY MIDDLEWARE =============

// 1. Request ID middleware (must be first for request tracking)
app.use(requestIdMiddleware);

// 2. Security headers using helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://*.ngrok-free.app', 'https://*.ngrok-free.dev', 'https://*.ngrok.io'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  permissionsPolicy: {
    features: {
      geolocation: [],
      microphone: [],
      camera: [],
    },
  },
}));

// 3. Prevent HTTP Parameter Pollution
app.use(hpp({
  whitelist: [
    'sort',
    'limit',
    'skip',
    'page',
    'search',
  ],
}));

// 4. CORS configuration
const allowedOrigins = [config.FRONTEND_URL, 'http://localhost:5000', 'http://localhost:3000'];
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin, curl, Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  optionsSuccessStatus: 200,
  maxAge: 3600,
}));

// 5. Body parser with size limits
app.use(express.json({
  limit: '10mb',
}));
app.use(express.urlencoded({
  limit: '10mb',
  extended: true,
}));

// 6. Request sanitization (XSS protection)
app.use(sanitizeRequest);

// 7. General rate limiting
app.use(generalLimiter);

// 8. Morgan HTTP request logging
if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'));
}

// ============= SECURE STATIC FILE SERVING =============

// Serve uploads with security headers
app.use('/uploads', (req, res, next) => {
  // Prevent directory traversal
  if (req.path.includes('..')) {
    return res.status(403).json({
      success: false,
      message: 'Access denied',
    });
  }
  next();
}, express.static(config.UPLOAD_DIR, {
  maxAge: '1h',
  etag: false,
}));

// Serve frontend static files if the exported site exists
const frontendBuildPath = path.resolve(__dirname, '../../tekgen-ats-frontend/out');
const frontendBuildExists = fs.existsSync(frontendBuildPath);
const frontendDevPort = process.env.FRONTEND_DEV_PORT || 3000;

function proxyToFrontendDev(req, res) {
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: frontendDevPort,
    path: req.originalUrl,
    method: req.method,
    headers: {
      ...req.headers,
      host: `127.0.0.1:${frontendDevPort}`,
    },
  }, (proxyRes) => {
    res.status(proxyRes.statusCode || 502);
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      if (typeof value !== 'undefined') {
        res.setHeader(key, value);
      }
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (error) => {
    logger.error('Frontend dev proxy error', error);
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        message: 'Frontend is starting. Please refresh in a few seconds.',
      });
    }
  });

  if (['GET', 'HEAD'].includes(req.method)) {
    proxyReq.end();
  } else {
    req.pipe(proxyReq);
  }
}

if (frontendBuildExists) {
  // Serve static assets (JS, CSS, images, etc.)
  app.use(express.static(frontendBuildPath, {
    maxAge: 0,
    etag: false,
    index: ['index.html'],
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    },
  }));

  // SPA fallback: serve the page's own index.html or root index.html
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
      return next();
    }

    const noCacheHeaders = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    };
    const sendWithNoCache = (filePath) => {
      Object.entries(noCacheHeaders).forEach(([k, v]) => res.setHeader(k, v));
      return res.sendFile(filePath);
    };

    // Try to find the page's exact index.html (trailingSlash: true creates /page/index.html)
    const cleanPath = req.path.endsWith('/') ? req.path : req.path + '/';
    const pagePath = path.join(frontendBuildPath, cleanPath, 'index.html');
    if (fs.existsSync(pagePath)) {
      return sendWithNoCache(pagePath);
    }

    // Handle Next.js static export dynamic routes: /jobs/view/[id]/, /candidates/[id]/, etc.
    // The static export creates a literal "[id]" folder as a placeholder for all dynamic segments.
    // Walk up path segments and replace the last one with [id] to find the matching template.
    const segments = cleanPath.replace(/^\/|\/$/g, '').split('/');
    for (let depth = segments.length - 1; depth >= 0; depth--) {
      const trySegments = [...segments];
      trySegments[depth] = '[id]';
      const dynamicPath = path.join(frontendBuildPath, trySegments.join('/'), 'index.html');
      if (fs.existsSync(dynamicPath)) {
        return sendWithNoCache(dynamicPath);
      }
    }

    // Fallback to root index.html (client-side router handles it)
    const rootIndex = path.join(frontendBuildPath, 'index.html');
    if (fs.existsSync(rootIndex)) {
      return sendWithNoCache(rootIndex);
    }

    next();
  });
} else {
  logger.warn('⚠️ Frontend static export not found. Static frontend will not be served.');
  logger.warn('Run "npm --prefix ../tekgen-ats-frontend run build && npm --prefix ../tekgen-ats-frontend run export" or use start-server.bat to generate tekgen-ats-frontend/out.');

  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
      return next();
    }

    return proxyToFrontendDev(req, res);
  });
}

// ============= PUBLIC HEALTH CHECK =============

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.NODE_ENV,
  });
});

// ============= API ROUTES =============

// Auth routes (endpoint-level auth throttling is applied inside authRoutes)
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api/candidates', candidateRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/screenings', screeningRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/analytics', advancedAnalyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/hrms', hrmsRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/visa', require('./routes/visa'));
app.use('/api/my', myWorkspaceRoutes);
app.use('/api/secure-files', require('./routes/secureDownloads'));
app.use('/api/holidays', require('./routes/holidaysRoute'));

// ============= ERROR HANDLING =============

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============= SERVER STARTUP =============

const PORT = config.PORT;
let server = null;
if (config.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    logger.info(`===========================================`);
    logger.info(`✅ Server started successfully`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info(`Port: ${PORT}`);
    logger.info(`CORS Origin: ${config.FRONTEND_URL}`);
    logger.info(`===========================================`);

    // Seed demo account and sample data
    seedDemoData()
      .then(() => logger.info('✅ Demo account initialization complete'))
      .catch(error => logger.error('❌ Demo account initialization failed', error));

    // Initialize email automation schedules (only if enabled)
    if (config.NODE_ENV === 'production' || process.env.ENABLE_EMAIL_AUTOMATION === 'true') {
      try {
        emailAutomationService.initializeSchedules();
        logger.info('✅ Email automation schedules initialized');
      } catch (error) {
        logger.error('❌ Failed to initialize email automation:', error);
      }
    }
  });
}

/** Idempotent demo: pilot client + JD — Sales owner (Deepa) ↔ Recruitment manager (Sreeni) ↔ Recruiter. */
async function seedSalesPilotScenario() {
  const DEMO_CLIENT = 'Demo Client – Tekgen Pilot (rename anytime)';
  const jdTitle = 'Senior Full-Stack Engineer (Pilot JD)';
  try {
    const deepa = await prisma.user.findUnique({ where: { email: 'deepa@tekgen.com.my' } });
    const sreeni = await prisma.user.findUnique({ where: { email: 'sreenivasa.gadde@tekgen.com.my' } });
    const recruiter = await prisma.user.findUnique({ where: { email: 'shashank.pasikanti@tekgen.com.my' } });
    if (!deepa || !sreeni || !recruiter) {
      logger.warn('Sales pilot seed skipped: need users deepa@ / sreenivasa.gadde@ / shashank.pasikanti@');
      return;
    }

    let client = await prisma.client.findFirst({ where: { clientName: DEMO_CLIENT } });
    if (!client) {
      client = await prisma.client.create({
        data: {
          clientName: DEMO_CLIENT,
          country: 'Malaysia',
          state: 'Kuala Lumpur',
          industry: 'Computer Software',
          website: 'https://www.tekgen.com.my',
          status: 'ACTIVE',
          ownerId: deepa.id,
          recruitmentManager: sreeni.id,
          defaultRecruiters: [recruiter.id],
          submissionFormat: JSON.stringify({
            version: 1,
            emailSubject: 'Tekgen submission: {{candidateName}} — {{jobTitle}}',
            emailBodyHint:
              'Standard client email. Replace merge tokens from ATS export; follow client PII rules.',
            excelColumnOrder: [
              'Full name',
              'Email',
              'Phone',
              'Years experience',
              'Key skills',
              'Salary expectation',
              'Notice period',
            ],
          }),
          notes:
            'Pilot: ownerId = sales (Deepa); recruitmentManager = Sreeni (RM). Rename client anytime.',
        },
      });
      await prisma.clientContact.create({
        data: {
          clientId: client.id,
          contactName: 'Client HR — Demo contact',
          designation: 'Hiring Manager',
          email: 'hr.demo@example.com',
          phone: '+60-3-0000-0000',
          contactType: 'HR',
        },
      });
      logger.info(`✅ Sales pilot client created: ${client.clientName}`);
    }

    await prisma.client.update({
      where: { id: client.id },
      data: { ownerId: deepa.id, recruitmentManager: sreeni.id },
    });

    const agrCount = await prisma.agreement.count({ where: { clientId: client.id } });
    if (agrCount === 0) {
      await prisma.agreement.create({
        data: {
          clientId: client.id,
          agreementType: 'MSA',
          title: 'Pilot Master Services Agreement (demo)',
          startDate: new Date(),
          rateType: 'MONTHLY',
          billRate: 8500,
          payRate: 6200,
          currency: 'MYR',
          status: 'ACTIVE',
        },
      });
      logger.info('✅ Sales pilot agreement (MSA) created');
    }

    const existingJd = await prisma.job.findFirst({ where: { clientId: client.id, title: jdTitle } });
    if (!existingJd) {
      const displayId = await generateJobId();
      await prisma.job.create({
        data: {
          displayId,
          title: jdTitle,
          description:
            'Pilot client requirement — demo JD. Senior full-stack engineer with TypeScript, Node.js, React, and PostgreSQL. Ship APIs and web apps, partner with product, mentor engineers. Hybrid in Kuala Lumpur.',
          requiredSkills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'REST APIs'],
          minExperience: 5,
          maxExperience: 12,
          department: 'Engineering',
          location: 'Kuala Lumpur, Malaysia',
          country: 'Malaysia',
          salaryMin: 12000,
          salaryMax: 18000,
          salaryCurrency: 'MYR',
          contractType: 'PERMANENT',
          headcount: 1,
          clientId: client.id,
          clientName: client.clientName,
          slaTargetDays: 21,
          targetCvSubmissions: 5,
          shareJdWithClient: true,
          candidateType: 'ANY',
          salesOwnerId: deepa.id,
          assignedRecruiters: [recruiter.id],
          assignedTo: recruiter.id,
          userId: sreeni.id,
        },
      });
      logger.info(`✅ Sales pilot JD created: ${jdTitle}`);
    }

    await prisma.job.updateMany({
      where: { clientId: client.id, title: jdTitle },
      data: { userId: sreeni.id, salesOwnerId: deepa.id },
    });
  } catch (error) {
    logger.warn(`Sales pilot seed skipped: ${error.message || error}`);
  }
}

async function seedDemoData() {
  try {
    // ---- Seed accounts (single source: ../../shared/demoWorkspaceAccounts.js) ----
    const accounts = getDemoAccountsForSeed();

    const departmentForRole = (role) => {
      if (['ADMIN', 'SUPER_ADMIN', 'MANAGING_DIRECTOR', 'ASSISTANT_MANAGER', 'MANAGEMENT'].includes(role)) return 'Management';
      if (['VISA_ADMIN'].includes(role)) return 'Visa & Compliance';
      if (['HR_ADMIN', 'HR_MANAGER'].includes(role)) return 'HR Operations';
      if (['PAYROLL_ADMIN', 'PAYROLL_MANAGER'].includes(role)) return 'Payroll';
      if (['SALES_MANAGER', 'SALES_EXEC', 'SALES_EXECUTIVE'].includes(role)) return 'Sales';
      if (['FINANCE', 'FINANCE_HEAD', 'FINANCE_MANAGER', 'CFO'].includes(role)) return 'Finance';
      if (['RECRUITMENT_MANAGER', 'RECRUITER'].includes(role)) return 'Recruitment';
      return 'Operations';
    };

    for (const acct of accounts) {
      let user = await prisma.user.findUnique({ where: { email: acct.email } });
      const hashedPassword = await encryptPassword(acct.password, config.BCRYPT_ROUNDS);

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: acct.email,
            password: hashedPassword,
            lastLoginAt: null,
            firstName: acct.firstName,
            lastName: acct.lastName,
            role: acct.role,
            department: departmentForRole(acct.role),
            loginAttempts: 0,
            isAccountLocked: false,
          },
        });
        logger.info(`✅ User created: ${acct.email} (${acct.role})`);
      } else {
        // Never overwrite role/name on existing users — restores and HRMS promotions stay intact.
        // Demo passwords synced from shared/demoWorkspaceAccounts.js on startup.
        // To force role sync for demo rows: set SEED_UPDATE_DEMO_ROLES=true
        const data = {
          loginAttempts: 0,
          isAccountLocked: false,
        };
        if (process.env.SEED_SYNC_DEMO_PASSWORDS === 'true') {
          data.password = hashedPassword;
          data.lastLoginAt = null;
        }
        if (process.env.SEED_UPDATE_DEMO_ROLES === 'true') {
          data.role = acct.role;
          data.firstName = acct.firstName;
          data.lastName = acct.lastName;
        }
        user = await prisma.user.update({
          where: { id: user.id },
          data,
        });
        logger.info(
          `✅ User synced: ${acct.email} (password unchanged unless SEED_SYNC_DEMO_PASSWORDS=true; role unchanged unless SEED_UPDATE_DEMO_ROLES=true)`
        );
      }

      // Create a demo job for each recruiter
      if (acct.role === 'RECRUITER') {
        const demoJobTitle = `Software Engineer - ${acct.firstName}'s Team`;
        const existingJob = await prisma.job.findFirst({ where: { title: demoJobTitle, userId: user.id } });
        if (!existingJob) {
          await prisma.job.create({
            data: {
              title: demoJobTitle,
              description: 'Looking for a practical software engineer with recent experience in JavaScript, Node.js, and React.',
              requiredSkills: ['JavaScript', 'Node.js', 'React'],
              minExperience: 3,
              department: 'Engineering',
              location: 'Remote',
              userId: user.id,
            },
          });
          logger.info(`✅ Demo job created for ${acct.firstName}`);
        }
      }
    }

    logger.info(`=== ${accounts.length} demo workspace accounts seeded (edit shared/demoWorkspaceAccounts.js) ===`);
    if (config.NODE_ENV === 'development') {
      accounts.forEach((a) => logger.info(`  ${a.email} / ${a.password}`));
    }

    await seedSalesPilotScenario();
  } catch (error) {
    logger.error('Seed data error', error);
    throw error;
  }
}

// ============= GRACEFUL SHUTDOWN =============

const gracefulShutdown = (signal) => {
  logger.warn(`${signal} signal received: closing HTTP server`);
  if (!server) {
    process.exit(0);
    return;
  }
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============= UNHANDLED ERROR HANDLERS =============

process.on('unhandledRejection', (reason, promise) => {
  logger.error('📛 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  // Exit process on uncaught exception
  gracefulShutdown('uncaughtException');
});

module.exports = app;
