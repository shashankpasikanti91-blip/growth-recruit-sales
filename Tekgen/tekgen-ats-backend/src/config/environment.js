require('dotenv').config();

// Validate required environment variables early
const requiredVars = [
  'JWT_SECRET',
  'DATABASE_URL',
  'OPENROUTER_API_KEY',
];

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  const productionVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'OPENROUTER_API_KEY',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'FRONTEND_URL',
  ];
  
  productionVars.forEach(varName => {
    if (!process.env[varName]) {
      console.error(`❌ Missing required environment variable: ${varName}`);
      process.exit(1);
    }
  });
}

// Check critical vars even in dev
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`⚠️  Missing environment variable: ${varName}`);
  }
});

const path = require('path');
let sharedDemoProfile = null;
try {
  const { DEMO_WORKSPACE_ACCOUNTS } = require(path.join(__dirname, '../../../shared/demoWorkspaceAccounts.js'));
  sharedDemoProfile = DEMO_WORKSPACE_ACCOUNTS.find((a) => a.email === 'demo@tekgen.com') || null;
} catch {
  sharedDemoProfile = null;
}

const config = {
  // Server
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5000',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || '',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '30d',

  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',

  // OpenAI
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openai/gpt-4.1-mini',

  // Demo account (defaults follow shared/demoWorkspaceAccounts.js demo row)
  DEMO_USER_EMAIL: process.env.DEMO_USER_EMAIL || sharedDemoProfile?.email || 'demo@tekgen.com',
  DEMO_USER_PASSWORD: process.env.DEMO_USER_PASSWORD || sharedDemoProfile?.password || 'Demo@2026',
  DEMO_USER_FIRST_NAME: process.env.DEMO_USER_FIRST_NAME || sharedDemoProfile?.firstName || 'Demo',
  DEMO_USER_LAST_NAME: process.env.DEMO_USER_LAST_NAME || sharedDemoProfile?.lastName || 'Recruiter',
  DEMO_JOB_TITLE: process.env.DEMO_JOB_TITLE || 'Software Engineer',
  DEMO_JOB_DESCRIPTION: process.env.DEMO_JOB_DESCRIPTION || 'Looking for a practical software engineer with recent experience in JavaScript, Node.js, and React.',
  DEMO_JOB_REQUIRED_SKILLS: process.env.DEMO_JOB_REQUIRED_SKILLS ? process.env.DEMO_JOB_REQUIRED_SKILLS.split(',').map(s => s.trim()) : ['JavaScript', 'Node.js', 'React'],

  // Email
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@tekgen.com',

  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
  UPLOAD_DIR: process.env.UPLOAD_DIR || require('path').resolve(__dirname, '../../uploads'),
  ALLOWED_FILE_TYPES: ['pdf', 'docx', 'doc', 'txt'],

  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
  LOGIN_ATTEMPT_WINDOW_MS: parseInt(process.env.LOGIN_ATTEMPT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
  LOCK_TIME_MS: parseInt(process.env.LOCK_TIME_MS, 10) || 30 * 60 * 1000, // 30 min
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 30000, // 30 sec

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 500,
  AUTH_RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 10) || 50,
};

// Validate config values
if (config.BCRYPT_ROUNDS < 10 || config.BCRYPT_ROUNDS > 15) {
  console.warn('⚠️  BCRYPT_ROUNDS should be between 10 and 15 for optimal security');
  config.BCRYPT_ROUNDS = 12;
}

module.exports = config;
