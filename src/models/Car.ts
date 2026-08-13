import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const carMakeSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CarMakeDoc = InferSchemaType<typeof carMakeSchema>;
export const CarMake = mongoose.model('CarMake', carMakeSchema);

const carModelSchema = new Schema(
  {
    make: { type: Schema.Types.ObjectId, ref: 'CarMake', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['economy', 'comfort', 'luxury', 'van'], default: 'economy' },
    seats: { type: Number, default: 4 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

carModelSchema.index({ make: 1, name: 1 }, { unique: true });

export type CarModelDoc = InferSchemaType<typeof carModelSchema>;
export const CarModel = mongoose.model('CarModel', carModelSchema);
