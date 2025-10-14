module.exports = {
  overrides: [
    {
      files: ['apps/web/app/(admin)/**', 'apps/web/app/admin/**', 'apps/web/src/features/admin/**'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "Identifier[name=/^(mock|mockQuotes|mockStats|stub|fixture)$/i]",
            message: 'Mock identifiers are banned in admin surfaces. Use live data hooks.',
          },
        ],
      },
    },
  ],
};
