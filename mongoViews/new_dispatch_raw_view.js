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
    $unwind: {
      path: '$raw_dispatch_details',
      preserveNullAndEmptyArrays: true,
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
      'raw_dispatch_details.dispatch': {
        $map: {
          input: '$raw_dispatch_details.dispatch',
          as: 'dispatch',
          in: {
            $mergeObjects: [
              '$$dispatch',
              {
                raw_details: {
                  $arrayElemAt: ['$raw_details', 0],
                },
              },
            ],
          },
        },
      },
    },
  },
  {
    $unset: 'raw_details',
  },
  {
    $group: {
      _id: '$_id',
      order_id: {
        $first: '$order_id',
      },
      invoice_no: {
        $first: '$invoice_no',
      },
      total_amount: {
        $first: '$total_amount',
      },
      created_employee_id: {
        $first: '$created_employee_id',
      },
      dispatched_date: {
        $first: '$dispatched_date',
      },
      deleted_at: {
        $first: '$deleted_at',
      },
      group_dispatch_details: {
        $first: '$group_dispatch_details',
      },
      created_at: {
        $first: '$created_at',
      },
      updated_at: {
        $first: '$updated_at',
      },
      __v: {
        $first: '$__v',
      },
      raw_dispatch_details: {
        $push: '$raw_dispatch_details',
      },
      order_details: {
        $first: '$order_details',
      },
    },
  },
  {
    $sort: {
      created_at: -1,
    },
  },
];
