import { Router } from "express";
import CheckRoleAndTokenAccess from "../../middlewares/permission.js";
import { addSeries, editSeries, listSeriesDetails } from '../../controllers/masters/series.controller.js'

const router = Router();

router.post("/add-series", CheckRoleAndTokenAccess, addSeries);
router.post("/update-series/:id", CheckRoleAndTokenAccess, editSeries);
router.get("/list-series", CheckRoleAndTokenAccess, listSeriesDetails);
export default router;