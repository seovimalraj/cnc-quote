module.exports = {
  preset: 'ts-jest',
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: false }],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^@cnc-quote/shared$': '<rootDir>/../../packages/shared/src',
    '^@app/(.*)$': '<rootDir>/src/$1'
  },
  setupFiles: ['<rootDir>/test/setup.ts'],
};
