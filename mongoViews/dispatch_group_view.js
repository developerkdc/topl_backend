// [
//   {
//     $lookup: {
//       from: "orders",
//       localField: "order_id",
//       foreignField: "_id",
//       as: "order_details",
//     },
//   },
//   {
//     $unwind: {
//       path: "$order_details",
//       preserveNullAndEmptyArrays: true,
//     },
//   },
//   {
//     $match: {
//       "order_details.order_type": "group",
//     },
//   },
//   {
//     $lookup: {
//       from: "qc_done_inventories",
//       localField: "group_dispatch_details.dispatch.qc_id",
//       foreignField: "_id",
//       as: "qc_details",
//     },
//   },
//   {
//     $addFields: {
//       "group_dispatch_details.dispatch.qc_details": {
//         $arrayElemAt: ["$qc_details", 0],
//       },
//     },
//   },
//   {
//     $unset: "qc_details",
//   },
//   {
//     $sort: {
//       created_at: -1,
//     },
//   },
// ];

[
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
    $lookup: {
      from: 'orders',
      localField: 'order_id',
      foreignField: '_id',
      as: 'order_details',
    },
  },
  {
    $unwind: {
      path: '$order_details',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $match: {
      'order_details.order_type': 'group',
    },
  },
  {
    $lookup: {
      from: 'qc_done_inventories',
      localField: 'group_dispatch_details.dispatch.qc_id',
      foreignField: '_id',
      as: 'qc_details',
    },
  },
  {
    $addFields: {
      'group_dispatch_details.dispatch.qc_details': {
        $arrayElemAt: ['$qc_details', 0],
      },
    },
  },
  {
    $unset: 'qc_details',
  },
  {
    $sort: {
      created_at: -1,
    },
  },
];
