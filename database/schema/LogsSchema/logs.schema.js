import mongoose from "mongoose";
import DynamicModel from "./dynamicModel.js";
import UserModel from "../user.schema.js";

const LogSchema = new mongoose.Schema({
  created_user_id: {
    type: Object,
  },
  data: { type: mongoose.Schema.Types.Mixed },
  date: {
    type: Date,
    default: Date.now,
  },
});

const LogSchemaFunction = function (modelName, collectionToWatch, lookup) {
  // const Model = DynamicModel(`${modelName}logs`, LogSchema);

  // const pipeline = [
  //   {
  //     $match: {
  //       $or: [{ operationType: "insert" }, { operationType: "update" }],
  //     },
  //   },
  // ];

  // const changeStream = collectionToWatch.watch(pipeline, {
  //   fullDocument: "updateLookup",
  // });

  // changeStream.on("change", async (change) => {
  //   // console.log("Change event triggered:", change.documentKey._id);

  //   try {
  //     // Find user data
  //     const userData = await UserModel.findOne({
  //       _id: change?.fullDocument?.created_employee_id,
  //     });

  //     // Aggregate lookup data
  //     let lookupdata = [];
  //     if (lookup.length !== 0) {
  //       lookupdata = await collectionToWatch.aggregate([
  //         {
  //           $match: {
  //             _id: new mongoose.Types.ObjectId(change.documentKey._id),
  //           },
  //         },
  //         ...lookup,
  //       ]);
  //     }

  //     // console.log(userData, "userData");
  //     // console.log(lookupdata?.[0], "lookupdata");

  //     // Create log entry
  //     const user = userData; // Assuming you want to store user _id
  //     const dataToLog =
  //       lookup.length !== 0
  //         ? {
  //             ...change,
  //             fullDocument: lookupdata[0],
  //           }
  //         : change;

  //     const DataLog = await Model.create({
  //       created_user_id: user,
  //       data: dataToLog,
  //     });

  //     // console.log("DataLog created:", DataLog);
  //   } catch (error) {
  //     console.error("Error processing change:", error);
  //   }
  // });

  // // Optionally return the changeStream or close it if needed
  // // return changeStream;
  // // changeStream.close();
};

export default LogSchemaFunction;
