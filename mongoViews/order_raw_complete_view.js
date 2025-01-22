// [
//   {
//     $match: {
//       order_type: "raw",
//       raw_order_details: {
//         $not: {
//           $elemMatch: {
//             order_status: {
//               $ne: "closed",
//             },
//           },
//         },
//       },
//     },
//   },
//   {
//     $lookup: {
//       from: "users",
//       localField: "created_employee_id",
//       foreignField: "_id",
//       as: "created_employee_id",
//     },
//   },
//   {
//     $unwind: {
//       path: "$created_employee_id",
//       preserveNullAndEmptyArrays: true,
//     },
//   },
//   {
//     $sort: {
//       created_at: -1,
//     },
//   },
// ];

[
  {
    $match: {
      order_type: 'raw',
      raw_order_details: {
        $not: {
          $elemMatch: {
            order_status: {
              $ne: 'closed',
            },
          },
        },
      },
    },
  },
  {
    $lookup: {
      from: 'users',
      localField: 'created_employee_id',
      foreignField: '_id',
      as: 'created_employee_id',
    },
  },
  {
    $unwind: {
      path: '$created_employee_id',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $sort: {
      created_at: -1,
    },
  },
];
