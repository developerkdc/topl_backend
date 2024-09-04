import { GroupModel } from "../../database/schema/group/groupCreated/groupCreated.schema.js";
import SupplierModel from "../../database/schema/masters/supplier.schema.js";
import { OrderModel } from "../../database/schema/order/orders.schema.js";
import { CreateReadySheetFormModel } from "../../database/schema/readySheetForm/readySheetForm.schema.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import mongoose from "mongoose";

export const GetLatestOrderNo = catchAsync(async (req, res, next) => {
  try {
    // Find all documents, sort them by order_no in descending order, and limit to 1 document
    const latestorder = await OrderModel.find().sort({ order_no: -1 }).limit(1);
    console.log(latestorder, "latestorder");

    if (latestorder.length > 0) {
      const latestOrderNo = latestorder[0].order_no + 1;
      res.status(200).json({ latestOrderNo });
    } else {
      res.status(200).json({ latestOrderNo: 1 });
      // If no documents found, return a default value or handle the scenario accordingly
      res.status(404).json({ message: "No orders found" });
    }
  } catch (error) {
    // Handle any errors that may occur during the database operation
    res.status(500).json({ error: error.message });
  }
});

// export const GetGroupNoBasedOnItemNameAndItemCode = catchAsync(
//   async (req, res, next) => {
//     try {
//       const { item_name, item_code } = req.query;

//       if (!item_code) {
//         return res.status(400).json({ error: "Item Code is required" });
//       }
//       if (!item_name) {
//         return res.status(400).json({ error: "Item Name is required" });
//       }
//       const GroupView = mongoose.connection.db.collection("groups_view");

//       const groupData = await GroupView.find().toArray();
//       console.log(groupData, "groupData");
//       const matchedGroups = groupData
//         .filter((group) =>
//           group.item_details.some(
//             (item) =>
//               item.item_name === item_name && item.item_code === item_code
//           )
//         )
//         .map((group) => group.group_no);
//       return res.status(200).json({
//         result: matchedGroups,
//         status: true,
//         message: "Matched group numbers",
//       });
//     } catch (error) {
//       console.error("Error retrieving documents from the view:", error);
//       res.status(500).json({ error: "Internal server error" });
//     }
//   }
// );

export const GetGroupNoBasedOnItemNameAndItemCode = catchAsync(
  async (req, res, next) => {
    try {
      const { item_name, item_code } = req.query;

      if (!item_code) {
        return res.status(400).json({ error: "Item Code is required" });
      }
      if (!item_name) {
        return res.status(400).json({ error: "Item Name is required" });
      }

      const GroupView = mongoose.connection.db.collection("groups_view");

      const matchedGroups = await GroupView.aggregate([
        {
          $match: {
            "item_details.item_name": item_name,
            "item_details.item_code": item_code,
          },
        },
        { $project: { group_no: 1, _id: 0 } },
      ]).toArray();

      const groupNos = matchedGroups.map((group) => group.group_no);

      return res.status(200).json({
        result: groupNos,
        status: true,
        message: "Matched group numbers",
      });
    } catch (error) {
      console.error("Error retrieving documents from the view:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export const GetViewDetails = catchAsync(async (req, res, next) => {
  try {
    const { group_no } = req.query;
    if (!group_no) {
      return res.status(400).json({ error: "Group No is required" });
    }

    // GROUP  AVAILABLE
    const GroupAvailableView = mongoose.connection.db.collection("groups_view");
    const GroupAvailableData = await GroupAvailableView.find({
      group_no: Number(group_no),
      status: "available",
    }).toArray();

    const totalGroupAvailable = GroupAvailableData.reduce((total, group) => {
      return total + group.group_no_of_pattas_available;
    }, 0);

    // ISSUE SMOKING
    const GroupView = mongoose.connection.db.collection("groups_view");
    const groupData = await GroupView.find({
      group_no: Number(group_no),
      status: "issued for smoking",
    }).toArray();

    const totalPattasSmokingAvailable = groupData.reduce((total, group) => {
      return total + group.group_no_of_pattas_available;
    }, 0);

    // ISSUE DYING

    const groupDyingData = await GroupView.find({
      group_no: Number(group_no),
      status: "issued for dying",
    }).toArray();

    const totalPattasDyingAvailable = groupDyingData.reduce((total, group) => {
      return total + group.group_no_of_pattas_available;
    }, 0);

    // ISSUE FOR CUTTING

    const cuttingView = mongoose.connection.db.collection(
      "issued_for_cuttings_view"
    );
    const cuttingData = await cuttingView
      .aggregate([
        {
          $match: {
            "group_id.group_no": Number(group_no),
          },
        },
      ])
      .toArray();

    const totalSumCutting = cuttingData.reduce((acc, curr) => {
      curr.cutting_item_details.forEach((item) => {
        acc += item.cutting_quantity;
      });
      return acc;
    }, 0);

    // READY SHEET FORM
    const readySheetForm = await CreateReadySheetFormModel.find({
      group_no: Number(group_no),
    });
    const totalPcsAvailableReadysheet = readySheetForm.reduce(
      (total, sheet) => {
        return total + sheet.ready_sheet_form_no_of_pcs_available;
      },
      0
    );

    // ISSUE FOR PRESSING

    const pressingView = mongoose.connection.db.collection(
      "issued_for_pressings_view"
    );
    const pressingData = await pressingView
      .find({
        group_no: Number(group_no),
      })
      .toArray();

    const totalPcsAvailableFormPressing = pressingData.reduce(
      (total, pressing) => {
        return (
          total +
          pressing.ready_sheet_form_history_details
            .ready_sheet_form_approved_pcs
        );
      },
      0
    );

    // ISSUE FOR FINISHING

    const finishingsView = mongoose.connection.db.collection(
      "issued_for_finishings_view"
    );
    const finishingsData = await finishingsView
      .find({
        group_no: Number(group_no),
      })
      .toArray();

    const totalPcsAvailableFormFinishing = finishingsData.reduce(
      (total, finishing) => {
        return total + finishing?.pressing_details?.pressing_no_of_peices;
      },
      0
    );

    // ISSUE FOR TAPPING

    const tappingView = mongoose.connection.db.collection(
      "issued_for_tapings_view"
    );
    const tappingData = await tappingView
      .aggregate([
        {
          $match: {
            "cutting_id.group_history_id.group_id.group_no": Number(group_no),
          },
        },
      ])
      .toArray();
    const totalSumTapping = tappingData.reduce((acc, curr) => {
      curr.cutting_id.item_details.forEach((item) => {
        acc += item?.final_cutting_quantity;
      });
      return acc;
    }, 0);

    // QC DONE INVENTORY

    const qcDoneView = mongoose.connection.db.collection(
      "qc_done_inventories_view"
    );
    const qcDoneData = await qcDoneView
      .find({
        group_no: Number(group_no),
      })
      .toArray();
    const totalSumQcDone = qcDoneData.reduce((total, qcDone) => {
      return total + qcDone.qc_no_of_pcs_available;
    }, 0);

    const data = {
      issue_for_smoking: totalPattasSmokingAvailable, // done
      issue_for_dying: totalPattasDyingAvailable, // done
      issue_for_cutting: totalSumCutting, // done
      issue_for_tapping: totalSumTapping, // done
      ready_sheet_form: totalPcsAvailableReadysheet, // done
      issue_for_pressing: totalPcsAvailableFormPressing, // done
      issue_for_finishing: totalPcsAvailableFormFinishing, // done
      qc_done_inventory: totalSumQcDone, // done
      group_available: totalGroupAvailable, // done
    };
    return res.status(200).json({
      result: data,
      status: true,
      message: "View Details retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving documents from the view:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export const SupplierMasterListInOrder = catchAsync(async (req, res) => {
  const supplierList = await SupplierModel.aggregate([
    {
      $match: {
        status: "active",
      },
    },
    {
      $project: {
        supplier_name: 1,
        city: 1,
      },
    },
  ]);

  return res.status(201).json({
    result: supplierList,
    status: true,
    message: "All Supplier List",
  });
});

export const GetAllOrderNoList = catchAsync(async (req, res) => {
  const orders = await OrderModel.aggregate([
    {
      $project: {
        order_no: 1,
      },
    },
  ]);
  const onlyno = orders.map((item) => {
    return item.order_no;
  });
  return res.json({ result: onlyno, status: true, message: "Order No List" });
});
