import mongoose from 'mongoose';

export const dynamic_filter = (filter = {}) => {
  const { range, _ids = {}, ...rest } = filter;
  const obj = { ...rest };

  // Handle _ids: convert to ObjectId if valid
  for (let key in _ids) {
    if (mongoose.isValidObjectId(_ids[key])) {
      obj[key] = new mongoose.Types.ObjectId(_ids[key]);
    }
  }

  // Handle array values: convert to $in
  for (let key in obj) {
    if (Array.isArray(obj[key]) && obj[key].length > 0) {
      obj[key] = { $in: obj[key] };
    }
  }

  // Handle range fields
  if (range) {
    // Replace 'from' with '$gte', 'to' with '$lte'
    const range_obj = JSON.parse(
      JSON.stringify(range)
        .replace(/"from"/g, '"$gte"')
        .replace(/"to"/g, '"$lte"')
    );

    // Apply date-based filters
    if (range_obj.date) {
      for (let field in range_obj.date) {
        const rangeValue = range_obj.date[field];
        if (rangeValue.$gte) rangeValue.$gte = new Date(rangeValue.$gte);
        if (rangeValue.$lte) rangeValue.$lte = new Date(rangeValue.$lte);
        obj[field] = rangeValue;
      }
    }

    // Apply other field-based ranges
    if (range_obj.fields) {
      for (let field in range_obj.fields) {
        obj[field] = range_obj.fields[field];
      }
    }
  }

  return obj;
};
