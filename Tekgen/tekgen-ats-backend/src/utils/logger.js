const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = {
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}${error ? '\n' + error.stack : ''}\n`;
    console.error(logMessage);
    fs.appendFileSync(path.join(logDir, 'error.log'), logMessage);
  },

  warn: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] WARN: ${message}\n`;
    console.warn(logMessage);
    fs.appendFileSync(path.join(logDir, 'warn.log'), logMessage);
  },

  info: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] INFO: ${message}\n`;
    console.log(logMessage);
    if (process.env.NODE_ENV !== 'development') {
      fs.appendFileSync(path.join(logDir, 'info.log'), logMessage);
    }
  },

  debug: (message) => {
    if (process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] DEBUG: ${message}`);
    }
  },
};

module.exports = logger;
