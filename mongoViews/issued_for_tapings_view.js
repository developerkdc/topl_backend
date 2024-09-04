// [
//   {
//     $lookup: {
//       from: "cuttings",
//       localField: "cutting_id",
//       foreignField: "_id",
//       pipeline: [
//         {
//           $lookup: {
//             from: "group_histories",
//             localField: "group_history_id",
//             foreignField: "_id",
//             as: "group_history_id",
//           },
//         },
//         {
//           $unwind: {
//             path: "$group_history_id",
//             preserveNullAndEmptyArrays: true,
//           },
//         },
//       ],
//       as: "cutting_id",
//     },
//   },
//   {
//     $unwind: {
//       path: "$cutting_id",
//       preserveNullAndEmptyArrays: true,
//     },
//   },
// ];

[
  {
    $lookup: {
      from: "cuttings",
      localField: "cutting_id",
      foreignField: "_id",
      pipeline: [
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
      ],
      as: "cutting_id",
    },
  },
  {
    $unwind: {
      path: "$cutting_id",
      preserveNullAndEmptyArrays: true,
    },
  },
];
