import catchAsync from "../../utils/errors/catchAsync.js";
import { IndividualSmokeModel } from "../../database/schema/smoking/individualSmoked.js";
import { DynamicSearch } from "../../utils/dynamicSearch/dynamic.js";
import mongoose from "mongoose";
import { IssuedForSmokingIndividualModel } from "../../database/schema/smoking/issuedForSmokingIndividual.js";
import { RawMaterialModel } from "../../database/schema/inventory/raw/raw.schema.js";

export const FetchCreatedIndividualSmoked = catchAsync(
  async (req, res, next) => {
    const {
      string,
      boolean,
      numbers,
      arrayField = [],
    } = req?.body?.searchFields || {};
    const {
      page,
      limit = 10,
      sortBy = "updated_at",
      sort = "desc",
    } = req.query;
    const skip = Math.max((page - 1) * limit, 0);

    const search = req.query.search || "";

    let searchQuery = {};
    if (search != "" && req?.body?.searchFields) {
      const searchdata = DynamicSearch(
        search,
        boolean,
        numbers,
        string,
        arrayField
      );
      if (searchdata?.length == 0) {
        return res.status(404).json({
          statusCode: 404,
          status: false,
          data: {
            data: [],
          },
          message: "Results Not Found",
        });
      }
      searchQuery = searchdata;
    }

    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {
      console.log(new Date(from));
      matchQuery["date_of_smoking"] = {
        $gte: new Date(from), // Greater than or equal to "from" date
        $lte: new Date(to), // Less than or equal to "to" date
      };
    }

    const totalDocuments = await IndividualSmokeModel.aggregate([
      {
        $lookup: {
          from: "raw_materials",
          localField: "item_details",
          foreignField: "_id",
          as: "item_details",
        },
      },
      {
        $unwind: {
          path: "$item_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "created_employee_id",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                password: 0,
              },
            },
          ],
          as: "created_employee_id",
        },
      },
      {
        $unwind: {
          path: "$created_employee_id",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          ...matchQuery,
          ...searchQuery,
        },
      },
      {
        $sort: {
          [sortBy]: sort == "desc" ? -1 : 1,
        },
      },
      {
        $count: "totalDocuments",
      },
    ]);
    const totalPages = Math.ceil(totalDocuments?.[0]?.totalDocuments / limit);

    const rawVeneerData = await IndividualSmokeModel.aggregate([
      {
        $lookup: {
          from: "raw_materials",
          localField: "item_details",
          foreignField: "_id",
          as: "item_details",
        },
      },
      {
        $unwind: {
          path: "$item_details",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "created_employee_id",
          foreignField: "_id",
          pipeline: [
            {
              $project: {
                password: 0,
              },
            },
          ],
          as: "created_employee_id",
        },
      },
      {
        $unwind: {
          path: "$created_employee_id",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          ...matchQuery,
          ...searchQuery,
        },
      },
      {
        $sort: {
          [sortBy]: sort == "desc" ? -1 : 1,
        },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);

    return res.status(200).json({
      result: rawVeneerData,
      statusCode: 200,
      status: "success",
      totalPages: totalPages,
    });
  }
);

export const RejectIndividualSmoked = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  // Start a session for transaction
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    // Check if the ID exists in IssuedForSmokingIndividualModel
    const issueRecord = await IndividualSmokeModel.findOne({
      _id: id,
    }).session(session);

    if (issueRecord) {
      console.log(issueRecord, "issueRecord");
      // Update the status of the corresponding ID in RawMaterialModel to "available"
      await IndividualSmokeModel.updateOne(
        { _id: id },
        { $set: { status: "rejected" } }
      ).session(session);

      await IssuedForSmokingIndividualModel.updateOne(
        { item_id: issueRecord.item_details },
        { $set: { status: "issued for smoking" } }
      ).session(session);

      // const issuedItems = [
      //   {
      //     item_id: issueRecord.item_details,
      //     issued_smoking_quantity: issueRecord.item_received_quantities,
      //     created_employee_id: authUserDetail._id,
      //   },
      // ];

      // // Insert issued items into the IssuedForSmokingIndividualModel
      // await IssuedForSmokingIndividualModel.insertMany(issuedItems, {
      //   session,
      // });
    } else {
      // If the record does not exist in IssuedForSmokingIndividualModel, return error
      throw new Error("Record not found in Issued For Smoking.");
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: true,
      message: "Rejectd successful.",
    });
  } catch (error) {
    // Rollback the transaction in case of error
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      status: false,
      message: "Error occurred while cancelling smoking.",
      error: error.message,
    });
  }
});

export const PassIndividualSmoked = catchAsync(async (req, res, next) => {
  const { id } = req.body;

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const issueRecord = await IndividualSmokeModel.findOne({ _id: id }).session(
      session
    );

    const RawData = await RawMaterialModel.findOne({
      _id: issueRecord.item_details,
    }).lean();
    // .select("item_available_quantities")
    if (!issueRecord)
      throw new Error("Record not found in Issued For Smoking.");

    await IndividualSmokeModel.updateOne(
      { _id: id },
      { $set: { status: "passed" } }
    ).session(session);

    if (
      issueRecord?.issued_smoking_quantity !== RawData?.item_available_pattas
    ) {
      const updateQuantities = async (RawData, issueRecord) => {
        const updatedQuantities = {
          item_available_pattas: 0,
          item_available_sqm: 0,
        };

        // const itemTypes = ["NATURAL", "DYED", "SMOKED"];
        // const itemTypeIndex = itemTypes.indexOf(RawData.item_code);

        // if (itemTypeIndex !== -1) {
        //   const itemTypesLower = itemTypes.map((type) => type.toLowerCase());
        //   const itemKey = itemTypesLower[itemTypeIndex];
        const available =
          RawData.item_available_pattas - issueRecord.issued_smoking_quantity;

        // updatedQuantities.item_available_quantities[itemKey] = available;
        // updatedQuantities.item_available_quantities.total = available;
        updatedQuantities.item_available_pattas = available;
        updatedQuantities.item_available_sqm = parseFloat(
          (
            (RawData.item_length * RawData.item_width * available) /
            10000
          ).toFixed(2)
        );
        // }

        return updatedQuantities;
      };

      const updatedQuantities = await updateQuantities(RawData, issueRecord);

      await RawMaterialModel.updateOne(
        { _id: issueRecord.item_details },
        {
          $set: {
            ...updatedQuantities,
            item_received_pattas: updatedQuantities?.item_available_pattas,
            item_received_sqm: updatedQuantities?.item_available_sqm,
            status: "available",
          },
        }
      ).session(session);

      const { _id, ...data } = RawData;
      const smokeSqm = parseFloat(
        (
          (RawData.item_length *
            RawData.item_width *
            issueRecord.issued_smoking_quantity) /
          10000
        ).toFixed(2)
      );
      // const availableQty = {
      //   natural: 0,
      //   dyed: 0,
      //   smoked: issueRecord?.issued_smoking_quantity.total,
      //   total: issueRecord?.issued_smoking_quantity.total,
      // };
      await RawMaterialModel.create(
        [
          {
            ...data,
            item_code: "SMOKED",
            item_available_pattas: issueRecord?.issued_smoking_quantity,
            item_available_sqm: smokeSqm,
            item_received_pattas: issueRecord?.issued_smoking_quantity,
            item_received_sqm: smokeSqm,
            status: "available",
          },
        ],
        { session } // Use the session for the transaction
      );
    } else {
      const smokeSqm = parseFloat(
        (
          (RawData.item_length *
            RawData.item_width *
            issueRecord.issued_smoking_quantity) /
          10000
        ).toFixed(2)
      );
      // const availableQty = {
      //   natural: 0,
      //   dyed: 0,
      //   smoked: issueRecord?.issued_smoking_quantity,
      //   total: issueRecord?.issued_smoking_quantity,
      // };

      await RawMaterialModel.updateOne(
        { _id: issueRecord.item_details },
        {
          $set: {
            ...RawData,
            item_received_pattas: issueRecord?.issued_smoking_quantity,
            item_received_sqm: smokeSqm,
            item_available_pattas: issueRecord?.issued_smoking_quantity,
            item_available_sqm: smokeSqm,
            item_code: "SMOKED",
            status: "available",
          },
        }
      ).session(session);
    }
    await IssuedForSmokingIndividualModel.deleteOne({
      // item_id: new ObjectId(issueRecord.item_id)
      item_id: new mongoose.Types.ObjectId(issueRecord.item_details),
    }).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.json({ status: true, message: "Passed successful." });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      status: false,
      message: "Error occurred while cancelling smoking.",
      error: error.message,
    });
  }
});
