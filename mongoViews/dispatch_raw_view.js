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
//       "order_details.order_type": "raw",
//     },
//   },
//   {
//     $lookup: {
//       from: "raw_materials",
//       localField: "raw_dispatch_details.dispatch.raw_material_id",
//       foreignField: "_id",
//       as: "raw_details",
//     },
//   },
//   {
//     $addFields: {
//       "raw_dispatch_details.dispatch.raw_details": {
//         $arrayElemAt: ["$raw_details", 0],
//       },
//     },
//   },
//   {
//     $unset: "raw_details",
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
      'order_details.order_type': 'raw',
    },
  },
  {
    $lookup: {
      from: 'raw_materials',
      localField: 'raw_dispatch_details.dispatch.raw_material_id',
      foreignField: '_id',
      as: 'raw_details',
    },
  },
  {
    $addFields: {
      'raw_dispatch_details.dispatch.raw_details': {
        $arrayElemAt: ['$raw_details', 0],
      },
    },
  },
  {
    $unset: 'raw_details',
  },
  {
    $sort: {
      created_at: -1,
    },
  },
];
