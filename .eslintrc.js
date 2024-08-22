export default {
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript', // If using TypeScript
  ],
  parserOptions: {
    ecmaVersion: 2020, // or 2018, 2019, depending on your Node.js version
    sourceType: 'module',
  },
  rules: {
    // Import/export rules
    'import/no-unresolved': 'error',
    'import/named': 'error',
    'import/default': 'error',
    'import/namespace': 'error',
    'import/no-restricted-paths': 'error',
    'import/no-absolute-path': 'error',
    'import/no-dynamic-require': 'error',
    'import/no-self-import': 'error',
    'import/no-cycle': 'error',
    'import/no-useless-path-segments': 'error',
    'import/no-unused-modules': 'warn',

    // Enable other rules as needed
  },
};
