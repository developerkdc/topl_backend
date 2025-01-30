import mongoose from 'mongoose';

const peeling_done_schema = new mongoose.Schema({});

const peeling_done_model = mongoose.model(
  'peeling_done',
  peeling_done_schema,
  'peeling_done'
);
export default peeling_done_model;
