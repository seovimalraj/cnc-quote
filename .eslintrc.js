module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'deprecation'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    'deprecation/deprecation': 'error',
    'no-console': ['warn', { 
      allow: ['warn', 'error'] 
    }],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@/app/api/_lib/fetchWithAuth',
            message: 'Use proxyFetch or proxyGetJson instead',
          },
        ],
      },
    ],
  },
  ignorePatterns: ['dist/**/*', 'node_modules/**/*'],
};
