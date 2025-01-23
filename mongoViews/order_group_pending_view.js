// [
//   {
//     $match: {
//       order_type: "group",
//       $or: [
//         {
//           "group_order_details.order_status": "pending",
//         },
//         {
//           "group_order_details.order_status": "open",
//         },
//       ],
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
      order_type: 'group',
      $or: [
        {
          'group_order_details.order_status': 'pending',
        },
        {
          'group_order_details.order_status': 'open',
        },
      ],
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
