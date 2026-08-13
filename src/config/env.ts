import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8765', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/taxi',
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  cookieName: process.env.COOKIE_NAME || 'rt',
  rideRequestTtlMs: parseInt(process.env.RIDE_REQUEST_TTL_MS || '60000', 10),
  isProd: process.env.NODE_ENV === 'production',
};
