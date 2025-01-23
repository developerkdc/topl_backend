// [
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
//     $lookup: {
//       from: "ready_sheet_form_inventory_histories",
//       localField: "ready_sheet_form_history_id",
//       foreignField: "_id",
//       as: "ready_sheet_form_history_details",
//     },
//   },
//   {
//     $unwind: {
//       path: "$ready_sheet_form_history_details",
//       preserveNullAndEmptyArrays: true,
//     },
//   },
//   {
//     $lookup: {
//       from: "tappings",
//       localField:
//         "ready_sheet_form_history_details.tapping_id",
//       foreignField: "_id",
//       as: "tapping_details",
//     },
//   },
//   {
//     $unwind: {
//       path: "$tapping_details",
//       preserveNullAndEmptyArrays: true,
//     },
//   },
//   {
//     $lookup: {
//       from: "cuttings",
//       localField: "tapping_details.cutting_id",
//       foreignField: "_id",
//       pipeline: [
//         {
//           $unwind: "$item_details",
//         },
//         {
//           $lookup: {
//             from: "raw_materials",
//             localField: "item_details.item_id",
//             foreignField: "_id",
//             as: "item_details.item_data",
//           },
//         },
//         {
//           $group: {
//             _id: "$_id",
//             cutting_id: {
//               $push: "$$ROOT",
//             },
//           },
//         },
//       ],
//       as: "cutting_details",
//     },
//   },
//   {
//     $unwind: {
//       path: "$cutting_details",
//       preserveNullAndEmptyArrays: true,
//     },
//   },
//   {
//     $lookup: {
//       from: "pressings",
//       localField: "pressing_id",
//       foreignField: "_id",
//       as: "pressing_details",
//     },
//   },
//   {
//     $unwind: {
//       path: "$pressing_details",
//       preserveNullAndEmptyArrays: true,
//     },
//   },
// ]

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
      from: 'ready_sheet_form_inventory_histories',
      localField: 'ready_sheet_form_history_id',
      foreignField: '_id',
      as: 'ready_sheet_form_history_details',
    },
  },
  {
    $unwind: {
      path: '$ready_sheet_form_history_details',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: 'tappings',
      localField: 'ready_sheet_form_history_details.tapping_id',
      foreignField: '_id',
      as: 'tapping_details',
    },
  },
  {
    $unwind: {
      path: '$tapping_details',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: 'cuttings',
      localField: 'tapping_details.cutting_id',
      foreignField: '_id',
      pipeline: [
        {
          $unwind: '$item_details',
        },
        {
          $lookup: {
            from: 'raw_materials',
            localField: 'item_details.item_id',
            foreignField: '_id',
            as: 'item_details.item_data',
          },
        },
        {
          $group: {
            _id: '$_id',
            cutting_id: {
              $push: '$$ROOT',
            },
          },
        },
      ],
      as: 'cutting_details',
    },
  },
  {
    $unwind: {
      path: '$cutting_details',
      preserveNullAndEmptyArrays: true,
    },
  },
  {
    $lookup: {
      from: 'pressings',
      localField: 'pressing_id',
      foreignField: '_id',
      as: 'pressing_details',
    },
  },
  {
    $unwind: {
      path: '$pressing_details',
      preserveNullAndEmptyArrays: true,
    },
  },
];
