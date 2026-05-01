module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  verbose: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: [],
};
