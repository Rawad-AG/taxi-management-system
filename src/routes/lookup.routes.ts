import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { CarMake, CarModel } from '../models/Car.js';
import { Area, City } from '../models/Region.js';

const router = Router();

router.get(
  '/cities',
  asyncHandler(async (_req, res) => {
    const cities = await City.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ cities });
  }),
);

router.get(
  '/cities/:cityId/areas',
  asyncHandler(async (req, res) => {
    const areas = await Area.find({ city: req.params.cityId }).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ areas });
  }),
);

router.get(
  '/car-makes',
  asyncHandler(async (_req, res) => {
    const makes = await CarMake.find().sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ carMakes: makes });
  }),
);

router.get(
  '/car-makes/:makeId/models',
  asyncHandler(async (req, res) => {
    const models = await CarModel.find({ make: req.params.makeId }).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ carModels: models });
  }),
);

export default router;
