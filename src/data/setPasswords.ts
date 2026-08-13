import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { env } from '../config/env.js';

const ROUNDS = 10;
const PASS = '123456789';

async function main() {
  await mongoose.connect(env.mongoUri);
  const targets = ['+963900000000', '+963941234567', '+963995551111'];
  const norm = (p: string) => p.replace(/[\s-]/g, '');
  const users = await User.find({ phone: { $in: targets.map((t) => new RegExp(`^${t.replace('+', '\\+')}$`)) } }).select('+password');
  const hash = await bcrypt.hash(PASS, ROUNDS);
  for (const u of users) {
    u.password = hash;
    await u.save();
    console.log('updated', u.phone, u.role);
  }
  console.log(`done — ${users.length} users now use ${PASS}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
