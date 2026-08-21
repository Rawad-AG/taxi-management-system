import bcrypt from 'bcryptjs';
import { CarMake, CarModel } from '../models/Car.js';
import { Area, City } from '../models/Region.js';
import { User } from '../models/User.js';
import { AREAS_BY_CITY, CAR_MAKES, CITIES, SEED_PASSWORD, SEED_USERS } from './seedData.js';

const PASSWORD_ROUNDS = 10;

async function seedLookups() {
  if ((await City.countDocuments()) > 0) return { cities: 0, areas: 0, makes: 0, models: 0 };

  const makeDocs = await CarMake.insertMany(
    Object.entries(CAR_MAKES).map(([name], i) => ({ name, sortOrder: i })),
  );
  const makeIds = new Map(makeDocs.map((m) => [m.name, m._id]));

  const models: { make: unknown; name: string; category: string; seats: number }[] = [];
  for (const [makeName, data] of Object.entries(CAR_MAKES)) {
    for (const modelName of data.models) {
      models.push({ make: makeIds.get(makeName), name: modelName, category: data.category, seats: data.seats ?? 4 });
    }
  }
  await CarModel.insertMany(models);

  const cityDocs = await City.insertMany(
    CITIES.map((c, i) => ({ name: c.name, slug: c.name.toLowerCase().replace(/\s+/g, '-'), lat: c.lat, lng: c.lng, sortOrder: i })),
  );
  const cityIds = new Map(cityDocs.map((c) => [c.name, c._id]));

  const areas: { city: unknown; name: string; slug: string }[] = [];
  for (const [cityName, list] of Object.entries(AREAS_BY_CITY)) {
    const cityId = cityIds.get(cityName);
    if (!cityId) continue;
    for (const name of list) {
      areas.push({ city: cityId, name, slug: name.toLowerCase().replace(/\s+/g, '-') });
    }
  }
  await Area.insertMany(areas);

  return { cities: cityDocs.length, areas: areas.length, makes: makeDocs.length, models: models.length };
}

async function seedUsers() {
  let created = 0;
  const password = await bcrypt.hash(SEED_PASSWORD, PASSWORD_ROUNDS);

  for (const seed of SEED_USERS) {
    const existing = await User.findOne({ phone: seed.phone });
    if (existing) continue;

    const doc: Record<string, unknown> = {
      role: seed.role,
      phone: seed.phone,
      firstName: seed.firstName,
      lastName: seed.lastName,
      status: 'active',
      password,
    };

    if (seed.driverProfile) {
      const dp = seed.driverProfile;
      const city = await City.findOne({ name: dp.workingCity });
      const areas = await Area.find({ name: { $in: dp.workingAreas } });
      const make = await CarMake.findOne({ name: dp.car.make });
      const model = await CarModel.findOne({ name: dp.car.model });

      const profile: Record<string, unknown> = {
        fullName: dp.fullName,
        fatherName: dp.fatherName,
        nationalId: dp.nationalId,
        licenseNumber: dp.licenseNumber,
        licenseExpiry: new Date(dp.licenseExpiry),
        workingCity: city?._id ?? null,
        workingAreas: areas.map((a) => a._id),
      };
      if (make && model) {
        profile.car = {
          make: make._id,
          model: model._id,
          year: dp.car.year,
          color: dp.car.color,
          plateNumber: dp.car.plateNumber,
          seats: dp.car.seats,
          category: dp.car.category,
        };
      }
      doc.driverProfile = profile;
    }

    await User.create(doc);
    created++;
  }

  return created;
}

export async function seedOnStartup() {
  const lookups = await seedLookups();
  const created = await seedUsers();

  const hadData = Object.values(lookups).every((n) => n === 0);
  if (!hadData || created > 0) {
    console.log(
      `[seed] lookups created: ${lookups.makes} makes, ${lookups.models} models, ${lookups.cities} cities, ${lookups.areas} areas; users created: ${created}`,
    );
    if (created > 0) {
      console.log(`[seed] demo accounts (password "${SEED_PASSWORD}"): admin +963 900 000 000, driver +963 941 234 567, customer +963 995 551 111`);
    }
  }
}
