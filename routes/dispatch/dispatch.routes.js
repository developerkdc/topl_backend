import express from 'express';
import { add_dispatch_details, cancel_dispatch_details, cancel_ewaybill, cancel_irn_no, edit_dispatch_details, fetch_all_details_by_dispatch_id, fetch_all_dispatch_details, fetch_all_dispatch_items_details, fetch_dispatch_details_by_invoice_no, fetch_invoices, fetch_packing_details_by_customer_id, fetch_purchase_history, fetch_single_dispatch_items, generate_ewaybill, generate_ewaybill_using_irn_no, generate_invoice_no, generate_irn_no, get_ewaybill_details, get_irn_by_doc, invoice_no_dropdown, load_packing_details, packing_done_dropdown, revert_dispatch_details, update_ewaybill_partB, update_ewaybill_transporter } from '../../controllers/dispatch/dispatch.controller.js';
import { dispatch_invoice_pdf } from '../../controllers/dispatch/dispatch_invoice.controller.js';
import { verifyApproval } from '../../middlewares/approval.middleware.js';
import EInvoiceAuthMiddleware from '../../middlewares/eInvoiceAuth.middleware.js';
import AuthMiddleware from '../../middlewares/verifyToken.js';
const dispatchRouter = express.Router();

dispatchRouter.post("/create-dispatch-details", AuthMiddleware, add_dispatch_details);
dispatchRouter.patch("/edit-dispatch-details/:dispatch_id", AuthMiddleware, verifyApproval("dispatch", "edit"), edit_dispatch_details);
dispatchRouter.patch("/revert-dispatch-details/:dispatch_id", AuthMiddleware, revert_dispatch_details);
dispatchRouter.patch("/cancel-dispatch/:dispatch_id", AuthMiddleware, cancel_dispatch_details);
dispatchRouter.get("/single-dispatch-details/:id", AuthMiddleware, fetch_all_details_by_dispatch_id);
dispatchRouter.get("/single-dispatch-item-details/:id", AuthMiddleware, fetch_single_dispatch_items);
dispatchRouter.post("/get-all-dispatch-details", AuthMiddleware, fetch_all_dispatch_details);//listing
dispatchRouter.post("/get-all-dispatch-item-details", AuthMiddleware, fetch_all_dispatch_items_details);
dispatchRouter.post("/load-packing-details", AuthMiddleware, load_packing_details);
dispatchRouter.post("/packing-done-dropdown", AuthMiddleware, packing_done_dropdown);
dispatchRouter.get("/download-invoice-pdf/:type/:id", dispatch_invoice_pdf);
dispatchRouter.post("/generate-invoice-no", AuthMiddleware, generate_invoice_no);

// Irn related apis
dispatchRouter.post("/generate-irn-no/:id", AuthMiddleware, EInvoiceAuthMiddleware, generate_irn_no);
dispatchRouter.post("/get-irn-by-doc/:id", AuthMiddleware, EInvoiceAuthMiddleware, get_irn_by_doc);
dispatchRouter.post("/cancel-irn-no/:id", AuthMiddleware, EInvoiceAuthMiddleware, cancel_irn_no);
dispatchRouter.post("/generate-ewaybill-using-irn/:id", AuthMiddleware, EInvoiceAuthMiddleware, generate_ewaybill_using_irn_no);

// generate ewaybill
dispatchRouter.post("/generate-ewaybill/:id", AuthMiddleware, generate_ewaybill);
dispatchRouter.post("/cancel-ewaybill/:id", AuthMiddleware, cancel_ewaybill);
dispatchRouter.post("/get-ewaybill/:id", AuthMiddleware, get_ewaybill_details);
dispatchRouter.post("/update-ewaybill-transporter/:id", AuthMiddleware, update_ewaybill_transporter);
dispatchRouter.post("/update-ewaybill-partB/:id", AuthMiddleware, update_ewaybill_partB);


//mobile api
dispatchRouter.post("/fetch-invoice-details-by-invoice-no", fetch_dispatch_details_by_invoice_no);
dispatchRouter.post('/fetch-purchase-history', fetch_purchase_history)
dispatchRouter.post('/fetch-invoices', fetch_invoices)
dispatchRouter.post('/fetch-packing-slips', fetch_packing_details_by_customer_id)
dispatchRouter.get("/invoice-no-dropdown", AuthMiddleware, invoice_no_dropdown);
export default dispatchRouter;
