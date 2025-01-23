import catchAsync from '../../utils/errors/catchAsync.js';
import OtherGoodsModel from '../../database/schema/inventory/otherGoods/otherGoods.schema.js';
import OtherGoodsConsumedModel from '../../database/schema/inventory/otherGoods/otherGoodsConsumed.schema.js';
import { GenerateConsumedGoodsReport } from '../../config/downloadExcel/report/otherGoods/consumedGoods.js';
import { GenerateOtherGoodsReport } from '../../config/downloadExcel/report/otherGoods/otherGoods.js';

export const ConsumedGoodsReportExcel = catchAsync(async (req, res, next) => {
  const { year, month } = req.query;
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  try {
    // Get all distinct item names
    const itemNames = await OtherGoodsModel.distinct('item_name');

    // Calculate opening stock for each item
    const stockData = {};
    for (const itemName of itemNames) {
      stockData[itemName] = {
        openingStock: 0,
        inwardedStock: 0,
        dailyConsumption: [],
      };

      // Calculate opening stock as the available quantity at the end of the previous month
      const lastDayOfPreviousMonth = new Date(year, month - 1, 0); // Last day of previous month
      const openingStockResult = await OtherGoodsConsumedModel.aggregate([
        {
          $match: {
            item_name: itemName,
            date_of_consumption: { $lte: lastDayOfPreviousMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalAvailable: { $sum: '$available_quantity' },
          },
        },
      ]);
      if (openingStockResult.length != 0) {
        stockData[itemName].openingStock = openingStockResult[0].totalAvailable;
      } else {
        const AVBLSTOCK = await OtherGoodsModel.aggregate([
          {
            $match: {
              item_name: itemName,
              date_of_inward: { $lte: startOfMonth },
            },
          },
          {
            $group: {
              _id: null,
              totalInwarded: { $sum: '$received_quantity' },
            },
          },
        ]);
        if (AVBLSTOCK.length > 0) {
          stockData[itemName].openingStock = AVBLSTOCK[0].totalInwarded;
        } else {
          stockData[itemName].openingStock = 0;
        }
      }

      // Calculate inwarded stock for the current month
      const inwardedStockResult = await OtherGoodsModel.aggregate([
        {
          $match: {
            item_name: itemName,
            date_of_inward: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: null,
            totalInwarded: { $sum: '$received_quantity' },
          },
        },
      ]);
      stockData[itemName].inwardedStock =
        inwardedStockResult.length > 0
          ? inwardedStockResult[0].totalInwarded
          : 0;

      // Calculate daily consumption
      const consumptionResult = await OtherGoodsConsumedModel.aggregate([
        {
          $match: {
            item_name: itemName,
            date_of_consumption: { $gte: startOfMonth, $lte: endOfMonth },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$date_of_consumption',
              },
            },
            totalConsumption: { $sum: '$consumption_quantity' },
          },
        },
      ]);

      consumptionResult.forEach(({ _id, totalConsumption }) => {
        stockData[itemName].dailyConsumption[_id] = totalConsumption;
      });

      // Add empty dates where there was no consumption
      const allDates = Array.from(
        { length: endOfMonth.getDate() },
        (_, i) => new Date(year, month - 1, i + 1)
      );
      allDates.forEach((date) => {
        const dateString = date.toISOString().split('T')[0];
        if (!stockData[itemName].dailyConsumption[dateString]) {
          stockData[itemName].dailyConsumption[dateString] = 0;
        }
      });
    }

    // Convert dailyConsumption object to array of key-value pairs and sort by date
    Object.values(stockData).forEach((data) => {
      data.dailyConsumption = Object.entries(data.dailyConsumption)
        .sort(([date1], [date2]) => new Date(date1) - new Date(date2))
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    });

    const formattedData = await Promise.all(
      Object.entries(stockData).map(async ([itemName, data]) => {
        // Fetch unit information based on itemName
        const units = await findUnitByItemName(itemName);

        return {
          cons_item_name: itemName,
          units: units,
          available_quantity: data.openingStock,
          received_quantity: data.inwardedStock,
          dailyConsumption: data.dailyConsumption,
        };
      })
    );

    // Function to find unit by item name
    async function findUnitByItemName(itemName) {
      const item = await OtherGoodsModel.findOne({
        item_name: itemName,
      });
      if (item) {
        return item.units;
      } else {
        return null;
      }
    }

    const exl = await GenerateConsumedGoodsReport(formattedData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export const OtherGoodsReportExcel = catchAsync(async (req, res, next) => {
  const { sortBy = 'updated_at', sort = 'desc' } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery['date_of_inward'] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const otherGoodsData = await OtherGoodsModel.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'created_employee_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
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
      $match: {
        ...matchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
  ]);
  const exl = await GenerateOtherGoodsReport(otherGoodsData);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: 'success',
  });
});
