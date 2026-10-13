import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://127.0.0.1:27017/schedulix_db'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters long'),
  ADMIN_EMAIL: z.string().email().default('admin@schedulix.local'),
  ADMIN_PASSWORD: z.string().min(8).default('AdminSecure@2026'),
  COORDINATOR_EMAIL: z.string().email().default('coordinator@schedulix.local'),
  COORDINATOR_PASSWORD: z.string().min(8).default('CoordSecure@2026'),
  FACULTY_EMAIL: z.string().email().default('faculty@schedulix.local'),
  FACULTY_PASSWORD: z.string().min(8).default('FacultySecure@2026'),
  VIEWER_EMAIL: z.string().email().default('viewer@schedulix.local'),
  VIEWER_PASSWORD: z.string().min(8).default('ViewerSecure@2026'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment configuration error:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
