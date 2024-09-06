import mongoose from "mongoose";

export const dynamic_filter = (filter = {}) => {
  let { range, ...obj } = filter;
  for (let key in obj) {
    if (obj.hasOwnProperty(key) && mongoose.isValidObjectId(obj[key])) {
      obj[key] = mongoose.Types.ObjectId.createFromHexString(obj[key]);
    }
  }
  if (filter.hasOwnProperty("range") && range) {
    const range_obj = JSON.parse(JSON.stringify(range)?.replace(/from/g, "$gte")?.replace(/to/g, "$lte"));
    if (range_obj?.date) {
      for (let i in range_obj?.date) {
        for (let j in range_obj?.date[i]) {
          range_obj.date[i][j] = new Date(range_obj?.date[i][j]);
        }
      }
    }
    Object.assign(obj, range_obj?.date, range_obj?.fields);
  }
  return obj;
};
