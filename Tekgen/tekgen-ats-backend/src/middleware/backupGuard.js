const fs = require('fs');
const path = require('path');

function getLatestBackupFile(backupDir) {
  if (!fs.existsSync(backupDir)) return null;
  const files = fs.readdirSync(backupDir)
    .filter((f) => /^tekgen_backup_.*\.dump$/i.test(f))
    .map((f) => ({
      file: f,
      fullPath: path.join(backupDir, f),
      mtimeMs: fs.statSync(path.join(backupDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files[0] || null;
}

function requireRecentBackup(maxAgeHours = 24) {
  return (req, res, next) => {
    try {
      const backupDir = process.env.BACKUP_DIR || path.resolve(process.cwd(), '..', 'backups');
      const latest = getLatestBackupFile(backupDir);
      if (!latest) {
        return res.status(428).json({
          success: false,
          message: `Backup required before this action. No backup file found in ${backupDir}. Run backup-db.ps1 first.`,
        });
      }

      const ageMs = Date.now() - latest.mtimeMs;
      const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
      if (ageMs > maxAgeMs) {
        const ageHours = (ageMs / (60 * 60 * 1000)).toFixed(1);
        return res.status(428).json({
          success: false,
          message: `Backup is too old (${ageHours}h). Run backup-db.ps1 and retry.`,
          data: { latestBackup: latest.file, backupDir },
        });
      }

      req.latestBackup = { file: latest.file, backupDir };
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Backup validation failed',
        error: error.message,
      });
    }
  };
}

module.exports = { requireRecentBackup };
