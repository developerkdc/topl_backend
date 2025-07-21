import express from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import { add_dispatch_details, cancel_dispatch_details, edit_dispatch_details, fetch_all_details_by_dispatch_id, fetch_all_dispatch_details, fetch_all_dispatch_items_details, fetch_single_dispatch_items, load_packing_details, packing_done_dropdown,revert_dispatch_details } from '../../controllers/dispatch/dispatch.controller.js';
import { dispatch_invoice_pdf } from '../../controllers/dispatch/dispatch_invoice.controller.js';
const dispatchRouter = express.Router();

dispatchRouter.post("/create-dispatch-details", AuthMiddleware, add_dispatch_details);
dispatchRouter.patch("/edit-dispatch-details/:dispatch_id", AuthMiddleware, edit_dispatch_details);
dispatchRouter.patch("/revert-dispatch-details/:dispatch_id", AuthMiddleware, revert_dispatch_details);
dispatchRouter.patch("/cancel-dispatch/:dispatch_id", AuthMiddleware, cancel_dispatch_details);
dispatchRouter.get("/single-dispatch-details/:id", AuthMiddleware, fetch_all_details_by_dispatch_id);
dispatchRouter.get("/single-dispatch-item-details/:id", AuthMiddleware, fetch_single_dispatch_items);
dispatchRouter.post("/get-all-dispatch-details", AuthMiddleware, fetch_all_dispatch_details);
dispatchRouter.post("/get-all-dispatch-item-details", AuthMiddleware, fetch_all_dispatch_items_details);
dispatchRouter.post("/load-packing-details", AuthMiddleware, load_packing_details);
dispatchRouter.post("/packing-done-dropdown", AuthMiddleware, packing_done_dropdown);
dispatchRouter.get("/download-invoice-pdf", dispatch_invoice_pdf);

export default dispatchRouter;