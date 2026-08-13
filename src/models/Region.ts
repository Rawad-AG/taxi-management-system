import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const citySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    lat: { type: Number },
    lng: { type: Number },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CityDoc = InferSchemaType<typeof citySchema>;
export const City = mongoose.model('City', citySchema);

const areaSchema = new Schema(
  {
    city: { type: Schema.Types.ObjectId, ref: 'City', required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, lowercase: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

areaSchema.index({ city: 1, name: 1 }, { unique: true });

export type AreaDoc = InferSchemaType<typeof areaSchema>;
export const Area = mongoose.model('Area', areaSchema);
