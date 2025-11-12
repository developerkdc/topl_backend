import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "packing_id"
  seq: { type: Number, default: 0 },
});

export const CounterModel = mongoose.model("Counter", counterSchema);
