import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import { addTransporter, dropdownTransporter, fetchSingleTransporter, fetchTransporterList, updateTransporter } from "../../../controllers/masters/Transporter/transporter.controller.js";

const transporterRouter = express.Router();

transporterRouter.post("/add-transporter", AuthMiddleware, addTransporter)
transporterRouter.patch("/update-transporter/:id", AuthMiddleware, updateTransporter)

transporterRouter.get("/single-transporter/:id", AuthMiddleware, fetchSingleTransporter)
transporterRouter.post("/list-transporter", AuthMiddleware, fetchTransporterList)

transporterRouter.get("/dropdown-transporter", AuthMiddleware, dropdownTransporter)

export default transporterRouter;