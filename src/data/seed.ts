import { connectDb, disconnectDb } from '../config/db.js';
import { CarMake, CarModel } from '../models/Car.js';
import { Area, City } from '../models/Region.js';
import { User } from '../models/User.js';
import bcrypt from 'bcryptjs';

const PASSWORD_ROUNDS = 10;

const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: 'Damascus', lat: 33.5138, lng: 36.2765 },
  { name: 'Rural Damascus', lat: 33.5772, lng: 36.4028 },
  { name: 'Aleppo', lat: 36.2021, lng: 37.1343 },
  { name: 'Homs', lat: 34.7308, lng: 36.7093 },
  { name: 'Hama', lat: 35.1318, lng: 36.7578 },
  { name: 'Latakia', lat: 35.5317, lng: 35.79 },
  { name: 'Tartus', lat: 34.889, lng: 35.8866 },
  { name: 'Daraa', lat: 32.6189, lng: 36.1001 },
  { name: 'Deir ez-Zor', lat: 35.3359, lng: 40.1408 },
  { name: 'Raqqa', lat: 35.9526, lng: 39.0089 },
  { name: 'Hasakah', lat: 36.5024, lng: 40.7477 },
  { name: 'Idlib', lat: 35.93, lng: 36.6315 },
  { name: 'Quneitra', lat: 33.1262, lng: 35.8245 },
  { name: 'Al-Suwayda', lat: 32.7089, lng: 36.5695 },
];

const DAMASCUS_AREAS = [
  'Baramkeh', 'Abou Roumaneh', 'Al-Malki', 'Al-Jisr', 'Rawda', 'Kafarsouseh', 'Al-Hijaz',
  'Sarouja', 'Qanawat', 'Marjeh', 'Midan', 'Bab Touma', 'Al-Qassaa', 'Salhiyeh',
  'Rukn Al-Din', 'Al-Muhajireen', 'Mezzeh 86', 'Mezzeh Villas', 'Al-Mazraa', 'Al-Shaghour',
  'Al-Qaboun', 'Jobar', 'Al-Tijara', 'Al-Qadam', 'Yarmouk Camp', 'Al-Shaalan', 'Al-Jahez',
  'Al-Sabaa Bahrat', 'Al-Nahda', 'Mazraat Karm Al-Shami', 'Al-Abbasiyin', 'Al-Zahira',
];

const ALEPPO_AREAS = [
  'Al-Aziziyah', 'Al-Furqan', 'Al-Hamdaniyah', 'Al-Ansari', 'Al-Shaar', 'Al-Sukkari',
  'Al-Midan', 'Salaheddine', 'Al-Sakhour', 'Bab Al-Nairab', 'Hanano', 'Al-Sheikh Maqsoud',
];

const HOMS_AREAS = ['Al-Qusour', 'Al-Khaldiyah', 'Wadi Al-Dhahab', 'Al-Inshaat', 'Al-Warsha', 'Baba Amr'];

const LATTAKIA_AREAS = ['Al-Raml Al-Janoubi', 'Al-Raml Al-Shamali', 'Al-Muraiseh', 'Al-Daatur', 'Al-Snobar', 'Qurdaha'];

const OTHER_CITY_AREAS: Record<string, string[]> = {
  'Rural Damascus': ['Douma', 'Dariya', 'Kisweh', 'Al-Tall', 'Jaramana', 'Yabrud', 'Al-Nabek', 'Qudsaya'],
  Hama: ['Al-Maysat', 'Al-Arbaaeen', 'Al-Muhafaza', 'Kazoo', 'Al-Hader'],
  Tartus: ['Al-Mina', 'Al-Hamrat', 'Al-Mashrouaa', 'Safita', 'Baniyas'],
  Daraa: ['Al-Sad', 'Al-Mahatta', 'Bosra', 'Al-Sanamayn'],
  'Deir ez-Zor': ['Al-Joura', 'Al-Qusour', 'Al-Orfi', 'Mayadeen'],
  Raqqa: ['Al-Rashid', 'Al-Rumaila', 'Al-Tayyara'],
  Hasakah: ['Al-Aziziyah', 'Al-Ghweiran', 'Qamishli'],
  Idlib: ['Al-Khudra', 'Al-Hurriya', 'Maarat Al-Numan', 'Sarmada'],
  Quneitra: ['Al-Baath City', 'Quneitra City'],
  'Al-Suwayda': ['Al-Sharaa', 'Al-Qanawat', 'Shahba', 'Salkhad'],
};

const CAR_MAKES: Record<string, { category: 'economy' | 'comfort' | 'luxury' | 'van'; seats?: number; models: string[] }> = {
  Hyundai: {
    category: 'economy',
    models: ['Accent', 'Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Grandeur', 'H1', 'Getz', 'Creta'],
  },
  Toyota: {
    category: 'economy',
    models: ['Corolla', 'Camry', 'Yaris', 'Avalon', 'Rav4', 'Land Cruiser', 'Prado', 'Hiace', 'Prius'],
  },
  Kia: {
    category: 'economy',
    models: ['Rio', 'Cerato', 'Spectra', 'Sportage', 'Sorento', 'K5', 'Picanto', 'Grand Carnival'],
  },
  Nissan: { category: 'economy', models: ['Sunny', 'Altima', 'Maxima', 'X-Trail', 'Patrol', 'Navara', 'Leaf'] },
  Chevrolet: { category: 'economy', models: ['Cruze', 'Aveo', 'Lanos', 'Spark', 'Malibu', 'Captiva', 'Optra', 'Epica'] },
  Mercedes: { category: 'luxury', models: ['C-Class', 'E-Class', 'S-Class', 'GLE', 'Vito', 'Sprinter'] },
  'Volkswagen': { category: 'comfort', models: ['Golf', 'Passat', 'Jetta', 'Touareg', 'Tiguan', 'Caddy'] },
  Peugeot: { category: 'economy', models: ['206', '207', '301', '308', '405', '406', '508', 'Partner'] },
  Renault: { category: 'economy', models: ['Logan', 'Megane', 'Clio', 'Kangoo', 'Fluence', 'Duster'] },
  Lada: { category: 'economy', models: ['Vesta', 'Granta', 'Kalina', 'Priora', '2107', 'Niva'] },
  Skoda: { category: 'comfort', models: ['Octavia', 'Superb', 'Fabia', 'Rapid', 'Kodiaq'] },
  Mazda: { category: 'economy', models: ['3', '6', 'CX-5', 'CX-9'] },
  Mitsubishi: { category: 'economy', models: ['Lancer', 'Outlander', 'Pajero', 'L200', 'Attrage'] },
  Honda: { category: 'comfort', models: ['Civic', 'Accord', 'CR-V', 'Pilot'] },
  Opel: { category: 'economy', models: ['Corsa', 'Astra', 'Vectra', 'Insignia', 'Mokka'] },
  Ford: { category: 'comfort', models: ['Focus', 'Fusion', 'Mondeo', 'Escape', 'Explorer'] },
  Suzuki: { category: 'economy', models: ['Swift', 'Vitara', 'Grand Vitara', 'Celerio'] },
  Geely: { category: 'economy', models: ['Emgrand 7', 'Emgrand X7', 'Coolray'] },
  MG: { category: 'economy', models: ['ZS', 'RX5', 'MG5', 'HS'] },
  'Chery': { category: 'economy', models: ['Tiggo 2', 'Tiggo 7', 'Arrizo 5'] },
};

async function main() {
  await connectDb();

  await CarMake.deleteMany({});
  await CarModel.deleteMany({});
  await City.deleteMany({});
  await Area.deleteMany({});

  const makeDocs = await CarMake.insertMany(
    Object.entries(CAR_MAKES).map(([name, data], i) => ({ name, sortOrder: i })),
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
  const areaLists: Record<string, string[]> = {
    Damascus: DAMASCUS_AREAS,
    Aleppo: ALEPPO_AREAS,
    Homs: HOMS_AREAS,
    Latakia: LATTAKIA_AREAS,
    ...OTHER_CITY_AREAS,
  };
  for (const [cityName, list] of Object.entries(areaLists)) {
    const cityId = cityIds.get(cityName);
    if (!cityId) continue;
    list.forEach((name, i) => {
      areas.push({ city: cityId, name, slug: name.toLowerCase().replace(/\s+/g, '-'), });
      void i;
    });
  }
  await Area.insertMany(areas);

  await User.updateOne(
    { phone: '+963900000000' },
    {
      $setOnInsert: {
        role: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        status: 'active',
        password: await bcrypt.hash('123456789', PASSWORD_ROUNDS),
      },
    },
    { upsert: true },
  );

  console.log(`[seed] ${makeDocs.length} car makes, ${models.length} car models`);
  console.log(`[seed] ${cityDocs.length} cities, ${areas.length} areas`);
  console.log('[seed] admin ready: +963 900 000 000 / 123456789');
  await disconnectDb();
}

main().catch((err) => {
  console.error('[seed] failed', err);
  process.exit(1);
});
