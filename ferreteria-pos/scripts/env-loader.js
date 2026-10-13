/**
 * Lee el .env.local y retorna las variables como objeto.
 * Usado por el script de backup para no depender de dotenv.
 */
const fs   = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const lines   = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, 'utf-8').split('\n')
  : [];

const env = {};
lines.forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

module.exports = env;
