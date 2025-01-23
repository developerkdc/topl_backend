import { Router } from "express";
import AuthMiddleware from "../../middlewares/verifyToken.js";
import { addCanvas, dropdownCanvas, fetchCanvasList, fetchSingleCanvas, updateCanvasDetails } from "../../controllers/seriesProductMaster/canvas.master.controller.js";
const router = Router();

router.post("/add-canvas", AuthMiddleware, addCanvas)
router.post("/update-canvas/:id", AuthMiddleware, updateCanvasDetails)
router.post("/list-canvas", AuthMiddleware, fetchCanvasList)
router.get("/list-canvas/:id", AuthMiddleware, fetchSingleCanvas)
router.get("/dropdown-canvas", dropdownCanvas)

export default router