const parser = require('@typescript-eslint/parser');

module.exports = [{
  files: [
    'lib/gestion/**/*.ts', 'app/api/gestion/**/*.ts', 'app/api/solicitudes/**/*.ts',
    'app/solicitar/**/*.tsx', 'app/dashboard/requerimientos/**/*.tsx',
    'app/dashboard/esfuerzo/**/*.tsx', 'app/dashboard/aporte/**/*.tsx',
    'components/gestion/**/*.tsx', 'components/gestion/**/*.ts', 'tests/gestion*.ts',
  ],
  languageOptions: { parser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
  rules: {
    'constructor-super': 'error',
    'no-constant-condition': 'error',
    'no-dupe-else-if': 'error',
    'no-duplicate-case': 'error',
    'no-extra-boolean-cast': 'error',
    'no-sparse-arrays': 'error',
    'no-unreachable': 'error',
    'use-isnan': 'error',
    'valid-typeof': 'error',
  },
}];
