const { createDefaultEsmPreset } = require('ts-jest');

module.exports = {
  ...createDefaultEsmPreset(),
  clearMocks: true,
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.tests.+(ts|tsx|js)"],
};
