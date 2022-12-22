if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const CONFIG = {
  DB_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};

module.exports = {
  CONFIG,
};
