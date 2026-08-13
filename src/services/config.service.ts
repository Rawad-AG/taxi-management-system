import { SystemConfig, type SystemConfigData } from '../models/SystemConfig.js';

type CachedConfig = SystemConfigData & { updatedAt?: Date; updatedBy?: string };
let cached: CachedConfig | null = null;

export async function ensureSystemConfig() {
  const doc = await SystemConfig.findOne({ key: 'default' });
  if (!doc) {
    const created = await SystemConfig.create({ key: 'default' });
    cached = normalize(created.toObject() as unknown as CachedConfig);
    console.log('[config] created with defaults');
  } else {
    cached = normalize(doc.toObject() as unknown as CachedConfig);
  }
  console.log(
    `[config] loaded | ${cached.fare.categories.economy.base}+${cached.fare.categories.economy.perKm}/km (economy) | ttl ${cached.matching.requestTtlMs}ms | commission ${Math.round(cached.business.commissionRate * 100)}%`,
  );
}

export function getConfig(): SystemConfigData {
  if (!cached) throw new Error('System config not loaded yet');
  return cached;
}

function normalize(doc: CachedConfig): CachedConfig {
  if (!doc.notifications) doc.notifications = { pushEnabled: true };
  return doc;
}

export async function updateSystemConfig(patch: SystemConfigData, adminId: string) {
  const doc = await SystemConfig.findOneAndUpdate(
    { key: 'default' },
    {
      $set: {
        fare: patch.fare,
        matching: patch.matching,
        tracking: patch.tracking,
        sos: patch.sos,
        notifications: patch.notifications,
        payLater: patch.payLater,
        business: patch.business,
        updatedBy: adminId,
      },
    },
    { new: true, upsert: true },
  );
  cached = normalize(doc.toObject() as unknown as CachedConfig);
  return cached;
}

export function configDto(doc: CachedConfig = cached ?? ({} as CachedConfig)): CachedConfig {
  return doc;
}
