import path from "path";
import catchAsync from "../../utils/errors/catchAsync.js";
import { generatePDF } from "../../utils/generatePDF/generatePDFBuffer.js";
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { StatusCodes } from "../../utils/constants.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dispatch_invoice_pdf = catchAsync(async (req, res, next) => {

    const templatePath = path.join(__dirname, '..', '..', 'views', 'dispatch/invoice_bill.hbs');
    const pdfBuffer = await generatePDF({
        templateName: "Invoice_bill",
        templatePath: templatePath,
        data: {},
    });
    console.log(pdfBuffer)

    res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=Invoice-${"1"}.pdf`,
        'Content-Length': pdfBuffer.length,
      });
    
      return res.status(StatusCodes.OK).end(pdfBuffer);
})