import express from "express";
import AuthMiddleware from "../../../middlewares/verifyToken.js";
import { addCharacter, dropdownCharacter, fetchCharacterList, fetchSingleCharacter, updateCharacter } from "../../../controllers/masters/Character/character.controller.js";

const characterRouter = express.Router();

characterRouter.post("/add-character", AuthMiddleware, addCharacter)
characterRouter.patch("/update-character/:id", AuthMiddleware, updateCharacter)

characterRouter.get("/single-character/:id", AuthMiddleware, fetchSingleCharacter)
characterRouter.post("/list-character", AuthMiddleware, fetchCharacterList)

characterRouter.get("/dropdown-character", AuthMiddleware, dropdownCharacter)

export default characterRouter;