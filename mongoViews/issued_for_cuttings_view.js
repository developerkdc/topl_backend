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
//   {
//     $lookup: {
//       from: "group_histories",
//       localField: "group_history_id",
//       foreignField: "_id",
//       as: "group_history_id",
//     },
//   },
//   {
//     $unwind: {
//       path: "$group_history_id",
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
  {
    $lookup: {
      from: "group_histories",
      localField: "group_history_id",
      foreignField: "_id",
      as: "group_history_id",
    },
  },
  {
    $unwind: {
      path: "$group_history_id",
      preserveNullAndEmptyArrays: true,
    },
  },
];
