import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { setupSocket } from './socket/setup.js';
import { ensureSystemConfig } from './services/config.service.js';
import { seedOnStartup } from './data/seedOnStartup.js';

async function main() {
  await connectDb();
  await ensureSystemConfig();
  await seedOnStartup();
  const httpServer = createServer(app);
  setupSocket(httpServer);
  httpServer.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('[fatal] failed to start server', err);
  process.exit(1);
});
