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

// Import middleware
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');
const { sanitizeRequest } = require('./middleware/requestSanitizer');
const { requestIdMiddleware } = require('./middleware/requestIdMiddleware');
const config = require('./config/environment');
const logger = require('./utils/logger');

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

// Auth routes with stricter rate limiting
app.use('/api/auth', authLimiter, authRoutes);

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
app.use('/api/my', myWorkspaceRoutes);

// ============= ERROR HANDLING =============

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// ============= SERVER STARTUP =============

const PORT = config.PORT;
const server = app.listen(PORT, () => {
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

async function seedDemoData() {
  try {
    // ---- Seed accounts ----
    const accounts = [
      { email: 'admin@tekgen.com',     password: 'Admin@Tekgen2024',   firstName: 'Admin',    lastName: 'Tekgen',    role: 'ADMIN' },
      { email: 'demo@tekgen.com',      password: 'Demo@1234',          firstName: 'Demo',     lastName: 'Recruiter', role: 'RECRUITER' },
      { email: 'shashank@tekgen.com',  password: 'Shashank@2024',      firstName: 'Shashank', lastName: 'Pasikanti', role: 'RECRUITER' },
      { email: 'jerry@tekgen.com',     password: 'Jerry@2024',         firstName: 'Jerry',    lastName: 'Recruiter', role: 'RECRUITER' },
      { email: 'savitha@tekgen.com',   password: 'Savitha@2024',       firstName: 'Savitha',  lastName: 'Recruiter', role: 'RECRUITER' },
    ];

    for (const acct of accounts) {
      let user = await prisma.user.findUnique({ where: { email: acct.email } });
      const hashedPassword = await encryptPassword(acct.password, config.BCRYPT_ROUNDS);

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: acct.email,
            password: hashedPassword,
            firstName: acct.firstName,
            lastName: acct.lastName,
            role: acct.role,
            department: acct.role === 'ADMIN' ? 'Management' : 'Recruitment',
            loginAttempts: 0,
            isAccountLocked: false,
          },
        });
        logger.info(`✅ User created: ${acct.email} (${acct.role})`);
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword, loginAttempts: 0, isAccountLocked: false, role: acct.role },
        });
        logger.info(`✅ User synced: ${acct.email} (${acct.role})`);
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

    logger.info('=== All accounts seeded ===');
    logger.info('Admin:    admin@tekgen.com    / Admin@Tekgen2024');
    logger.info('Demo:     demo@tekgen.com     / Demo@1234');
    logger.info('Shashank: shashank@tekgen.com / Shashank@2024');
    logger.info('Jerry:    jerry@tekgen.com    / Jerry@2024');
    logger.info('Savitha:  savitha@tekgen.com  / Savitha@2024');
  } catch (error) {
    logger.error('Seed data error', error);
    throw error;
  }
}

// ============= GRACEFUL SHUTDOWN =============

const gracefulShutdown = (signal) => {
  logger.warn(`${signal} signal received: closing HTTP server`);
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
