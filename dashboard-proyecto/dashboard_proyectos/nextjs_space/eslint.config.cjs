const [gestion] = require('./eslint.gestion.config.cjs');

module.exports = [
  { ignores: ['.next*/**', '.build/**', 'node_modules/**'] },
  {
    ...gestion,
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.cjs'],
    plugins: { 'react-hooks': require('eslint-plugin-react-hooks') },
  },
];
