const bcrypt = require('bcryptjs');

/**
 * Encrypt (hash) a password using bcrypt
 * @param {string} password - Plain text password
 * @param {number} rounds - Number of bcrypt rounds (default 12)
 * @returns {Promise<string>} - Hashed password
 */
const encryptPassword = async (password, rounds = 12) => {
  try {
    if (typeof password !== 'string' || password.length === 0) {
      throw new Error('Invalid password');
    }

    // Validate rounds
    if (rounds < 10 || rounds > 15) {
      rounds = 12; // Default safe value
    }

    const salt = await bcrypt.genSalt(rounds);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error(`Password encryption failed: ${error.message}`);
  }
};

/**
 * Compare a plain text password with a hashed password
 * @param {string} password - Plain text password to verify
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {Promise<boolean>} - True if passwords match, false otherwise
 */
const comparePassword = async (password, hashedPassword) => {
  try {
    if (!password || !hashedPassword) {
      return false;
    }

    const isMatch = await bcrypt.compare(password, hashedPassword);
    return isMatch;
  } catch (error) {
    throw new Error(`Password comparison failed: ${error.message}`);
  }
};

module.exports = {
  encryptPassword,
  comparePassword,
};
