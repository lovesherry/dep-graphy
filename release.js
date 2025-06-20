
const { execSync } = require('child_process');
execSync('npm run build', { stdio: 'inherit' });
execSync('npm publish --access public', { stdio: 'inherit' });