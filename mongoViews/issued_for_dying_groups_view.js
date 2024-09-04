// [
//   {
//     $lookup: {
//       from: "groups",
//       localField: "group_id",
//       foreignField: "_id",
//       as: "group_id",
//     },
//   },
//   {
//     $unwind: {
//       path: "$group_id",
//       preserveNullAndEmptyArrays: true,
//     },
//   },
// ];

[
  {
    $lookup: {
      from: "groups",
      localField: "group_id",
      foreignField: "_id",
      as: "group_id",
    },
  },
  {
    $unwind: {
      path: "$group_id",
      preserveNullAndEmptyArrays: true,
    },
  },
];
