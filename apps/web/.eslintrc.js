module.exports = {
  root: true,
  extends: [
    'next/core-web-vitals',
    'plugin:@typescript-eslint/recommended'
  ],
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['warn', { 
      allow: ['warn', 'error'] 
    }],
    'react-hooks/exhaustive-deps': 'warn'
  },
  parserOptions: {
    babelOptions: {
      presets: [require.resolve('next/babel')],
    },
  },
}
