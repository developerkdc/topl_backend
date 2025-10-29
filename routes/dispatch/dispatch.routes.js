import express from 'express';
import AuthMiddleware from '../../middlewares/verifyToken.js';
import { add_dispatch_details, cancel_dispatch_details, edit_dispatch_details, fetch_all_details_by_dispatch_id, fetch_all_dispatch_details, fetch_all_dispatch_items_details, fetch_dispatch_details_by_invoice_no, fetch_invoices, fetch_packing_details_by_customer_id, fetch_purchase_history, fetch_single_dispatch_items, generate_invoice_no, invoice_no_dropdown, load_packing_details, packing_done_dropdown, revert_dispatch_details } from '../../controllers/dispatch/dispatch.controller.js';
import { dispatch_invoice_pdf } from '../../controllers/dispatch/dispatch_invoice.controller.js';
const dispatchRouter = express.Router();

dispatchRouter.post("/create-dispatch-details", AuthMiddleware, add_dispatch_details);
dispatchRouter.patch("/edit-dispatch-details/:dispatch_id", AuthMiddleware, edit_dispatch_details);
dispatchRouter.patch("/revert-dispatch-details/:dispatch_id", AuthMiddleware, revert_dispatch_details);
dispatchRouter.patch("/cancel-dispatch/:dispatch_id", AuthMiddleware, cancel_dispatch_details);
dispatchRouter.get("/single-dispatch-details/:id", AuthMiddleware, fetch_all_details_by_dispatch_id);
dispatchRouter.get("/single-dispatch-item-details/:id", AuthMiddleware, fetch_single_dispatch_items);
dispatchRouter.post("/get-all-dispatch-details", AuthMiddleware, fetch_all_dispatch_details);//listing
dispatchRouter.post("/get-all-dispatch-item-details", AuthMiddleware, fetch_all_dispatch_items_details);
dispatchRouter.post("/load-packing-details", AuthMiddleware, load_packing_details);
dispatchRouter.post("/packing-done-dropdown", AuthMiddleware, packing_done_dropdown);
dispatchRouter.get("/download-invoice-pdf/:id", dispatch_invoice_pdf);
dispatchRouter.post("/generate-invoice-no", AuthMiddleware, generate_invoice_no);

//mobile api
dispatchRouter.post("/fetch-invoice-details-by-invoice-no", fetch_dispatch_details_by_invoice_no);
dispatchRouter.post('/fetch-purchase-history', fetch_purchase_history)
dispatchRouter.post('/fetch-invoices', fetch_invoices)
dispatchRouter.post('/fetch-packing-slips', fetch_packing_details_by_customer_id)
dispatchRouter.get("/invoice-no-dropdown", AuthMiddleware, invoice_no_dropdown);
export default dispatchRouter;
