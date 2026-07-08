module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      // Frontend: dwing af dat backend-calls via apiRequest gaan, zodat elke call automatisch
      // getimed wordt (console + perf-HUD). Raw fetch omzeilt die instrumentatie.
      files: ['src/**/*.{js,jsx}'],
      rules: {
        'no-restricted-globals': [
          'warn',
          {
            name: 'fetch',
            message:
              'Gebruik apiRequest (src/utils/api.js) i.p.v. raw fetch, zodat de call automatisch wordt getimed. Uitzondering: instrumentatie-bestanden.',
          },
        ],
      },
    },
    {
      // De instrumentatie zelf mag raw fetch gebruiken.
      files: ['src/utils/api.js', 'src/utils/perf.js', 'src/components/layout/DevPerfOverlay.jsx'],
      rules: { 'no-restricted-globals': 'off' },
    },
  ],
};
