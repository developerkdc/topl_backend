import { Router } from "express";
import AuthMiddleware from '../../../../middlewares/verifyToken.js';
import { add_color_damage, listing_color_damage, revert_from_color_damage_to_color_done } from "../../../../controllers/factory/colour/colour_damage/colour_damage.controller.js";

const color_damage_router = Router();

color_damage_router.post("/add-to-damage", AuthMiddleware, add_color_damage)
color_damage_router.post("/list-damage", AuthMiddleware, listing_color_damage);
color_damage_router.post("/revert/:id", AuthMiddleware, revert_from_color_damage_to_color_done);



export default color_damage_router;