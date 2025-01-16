import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import { addProcess, dropdownProcess, fetchProcessList, fetchSingleProcess, updateProcess } from "../../../controllers/masters/Process/process.controller.js";

const processRouter = express.Router();

processRouter.post("/add-process", AuthMiddleware, addProcess)
processRouter.patch("/update-process/:id", AuthMiddleware, updateProcess)

processRouter.get("/single-process/:id", AuthMiddleware, fetchSingleProcess)
processRouter.post("/list-process", AuthMiddleware, fetchProcessList)

processRouter.get("/dropdown-process", AuthMiddleware, dropdownProcess)

export default processRouter;