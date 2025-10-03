const { createDefaultPreset } = require('ts-jest');

module.exports = {
  ...createDefaultPreset(),
  clearMocks: true,
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.tests.+(ts|tsx|js)"],
};
