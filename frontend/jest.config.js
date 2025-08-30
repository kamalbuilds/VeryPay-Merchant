const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // If using TypeScript with a baseUrl set to the root directory
  moduleDirectories: ['node_modules', '<rootDir>/'],
  
  // Handle module aliases (if you have any in next.config.js or tsconfig.json)
  moduleNameMapper: {
    // Handle module aliases
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/pages/(.*)$': '<rootDir>/pages/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
    '^@/types/(.*)$': '<rootDir>/types/$1',
  },
  
  testEnvironment: 'jest-environment-jsdom',
  
  // Coverage configuration
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!jest.config.js',
    '!jest.setup.js',
    '!next.config.js',
    '!tailwind.config.js',
    '!postcss.config.js',
  ],
  
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  
  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)',
  ],
  
  // Transform configuration
  transform: {
    // Use babel-jest to transpile tests with the next/babel preset
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Setup files
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  
  // Test environment options
  testEnvironmentOptions: {
    customExportConditions: [''],
  },
  
  // Maximum number of concurrent workers
  maxWorkers: '50%',
  
  // Verbose output
  verbose: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);