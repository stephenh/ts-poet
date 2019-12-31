module.exports = {
  clearMocks: true,
  globals: {
    'ts-jest': {
      tsConfig: 'tsconfig.json',
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  moduleNameMapper: {
    "^@src/(.*)": "<rootDir>/src/$1"
  },
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*-tests.+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  watchman: true,
};
