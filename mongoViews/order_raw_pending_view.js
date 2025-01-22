// [
//   {
//     $match: {
//       order_type: "raw",
//       $or: [
//         {
//           "raw_order_details.order_status": "pending",
//         },
//         {
//           "raw_order_details.order_status": "open",
//         },
//       ],
//     },
//   },
//   {
//     $sort: {
//       created_at: -1,
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
// ];

[
  {
    $match: {
      order_type: 'raw',
      $or: [
        {
          'raw_order_details.order_status': 'pending',
        },
        {
          'raw_order_details.order_status': 'open',
        },
      ],
    },
  },
  {
    $sort: {
      created_at: -1,
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
];
