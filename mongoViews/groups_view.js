// [
//   {
//     $lookup: {
//       from: "raw_materials",
//       localField: "item_details",
//       foreignField: "_id",
//       as: "item_details",
//     },
//   },
// ];

[
  {
    $lookup: {
      from: "raw_materials",
      localField: "item_details",
      foreignField: "_id",
      as: "item_details",
    },
  },
];
