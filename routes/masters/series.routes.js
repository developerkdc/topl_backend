import { Router } from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import {
  addSeries,
  DropdownSeriesNameMaster,
  editSeries,
  listSeriesDetails,
} from "../../controllers/masters/series.controller.js";

const router = Router();

router.post("/add-series", CheckRoleAndTokenAccess, addSeries);
router.post("/update-series/:id", CheckRoleAndTokenAccess, editSeries);
router.post("/list-series", CheckRoleAndTokenAccess, listSeriesDetails);
router.get("/dropdown-series-master", DropdownSeriesNameMaster);
export default router;
