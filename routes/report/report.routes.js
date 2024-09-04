import express from "express";
import { FinishingDoneReportExcel, IssuedForFinishingReportExcel } from "../../controllers/report/finishing.js";
import {
  IssuedForDyingRawReportExcel,
  IssuedForGroupingReportExcel,
  IssuedForSmokingRawReportExcel,
  RawReportExcel,
} from "../../controllers/report/raw.js";
import {
  CreatedGroupReportExcel,
  GroupsHistoryNormalReportExcel,
  GroupsHistoryReportExcel,
  IssuedForDyingGroupsReportExcel,
  IssuedForSmokingGroupsReportExcel,
} from "../../controllers/report/group.js";
import { ReadySheetFormReportExcel } from "../../controllers/report/readySheetForm.js";
import { IssuedForTappingReportExcel, TappingDoneReportExcel } from "../../controllers/report/tapping.js";
import { IssuedForPressingReportExcel, PressingDoneReportExcel } from "../../controllers/report/pressing.js";
import {
  DyedGroupReportExcel,
  DyedIndividualReportExcel,
} from "../../controllers/report/dying.js";
import { DashboardReportExcel } from "../../controllers/report/dashboard.js";
import {
  DispatchedGroupDoneReportExcel,
  DownloadCompleteRawOrdersReport,
  DownloadDispatchedRawOrdersReport,
  DownloadPendingGroupOrdersReport,
  DownloadCompleteGroupOrdersReport,
  DownloadPendingRawOrdersReport,
} from "../../controllers/report/dispatch.js";
import {
  SmokedGroupReportExcel,
  SmokedIndividualReportExcel,
} from "../../controllers/report/smoking.js";

import { ReadyForDispatchReportExcel } from "../../controllers/report/readyForDispatch.js";
import { CuttingDoneReportExcel, IssuedForCuttingReportExcel } from "../../controllers/report/cutting.js";
import { ConsumedGoodsReportExcel, OtherGoodsReportExcel } from "../../controllers/report/otherGoods.js";

const router = express.Router();

// raw
router.post("/download-excel-raw-veneer", RawReportExcel);
router.post(
  "/download-excel-raw-issue-for-smoking",
  IssuedForSmokingRawReportExcel
);

router.post(
  "/download-excel-raw-issue-for-dying",
  IssuedForDyingRawReportExcel
);
router.post(
  "/download-excel-raw-issue-for-grouping",
  IssuedForGroupingReportExcel
);

// group
router.post("/download-excel-created-group-veneer", CreatedGroupReportExcel);

router.post("/download-excel-group-history", GroupsHistoryReportExcel);
router.post("/download-excel-group-history-normal", GroupsHistoryNormalReportExcel);

router.post(
  "/download-excel-issued-for-smoking-groups",
  IssuedForSmokingGroupsReportExcel
);
router.post(
  "/download-excel-issued-for-dying-groups",
  IssuedForDyingGroupsReportExcel
);

// ready sheet form
router.post("/download-excel-ready-sheet-form", ReadySheetFormReportExcel);

// ready for dispatch
router.post("/download-excel-ready-for-dispatch", ReadyForDispatchReportExcel);

//tapping
router.post("/download-excel-created-tapping", TappingDoneReportExcel);
router.post("/download-excel-issue-for-tapping", IssuedForTappingReportExcel);

//pressing
router.post("/download-excel-pressing-done", PressingDoneReportExcel);
router.post("/download-excel-issue-for-pressing", IssuedForPressingReportExcel);


//finishing
router.post("/download-excel-finishing-done", FinishingDoneReportExcel);
router.post("/download-excel-issue-for-finishing", IssuedForFinishingReportExcel);

//cutting
router.post("/download-excel-cutting-done", CuttingDoneReportExcel);
router.post("/download-excel-issue-for-cutting", IssuedForCuttingReportExcel);

// smoking
router.post("/download-excel-smoked-individual", SmokedIndividualReportExcel);
router.post("/download-excel-smoked-group", SmokedGroupReportExcel);

// // dying
router.post("/download-excel-dyed-individual", DyedIndividualReportExcel);
router.post("/download-excel-dyed-group", DyedGroupReportExcel);

//Dashboard
router.post("/download-excel-dashboard", DashboardReportExcel);

//Dispatch
router.post(
  "/download-excel-pending-raw-order",
  DownloadPendingRawOrdersReport
);
router.post(
  "/download-excel-dispatched-raw-order",
  DownloadDispatchedRawOrdersReport
);
router.post(
  "/download-excel-pending-group-order",
  DownloadPendingGroupOrdersReport
);
router.post(
  "/download-excel-complete-raw-order",
  DownloadCompleteRawOrdersReport
);
router.post(
  "/download-excel-complete-group-order",
  DownloadCompleteGroupOrdersReport
);

router.post(
  "/download-excel-dispatched-group-done",
  DispatchedGroupDoneReportExcel
);

// Other Goods
router.post("/download-excel-consumed-goods", ConsumedGoodsReportExcel);
router.post("/download-excel-other-goods", OtherGoodsReportExcel);

export default router;
