
module.exports = {
  clearMocks: true,
  globals: {
    "ts-jest": {
      "tsConfig": "tsconfig.json"
    }
  },
  moduleFileExtensions: [
    "ts",
    "tsx",
    "js"
  ],
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/src/**/__tests__/*.+(ts|tsx|js)"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  watchman: true,
};
