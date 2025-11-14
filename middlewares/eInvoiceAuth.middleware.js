import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const EInvoiceHeaderVariable = {
  username: process.env.E_INVOICE_USERNAME,
  password: process.env.E_INVOICE_PASSWORD,
  ip_address: process.env.E_INVOICE_IP_ADDRESS,
  client_id: process.env.E_INVOICE_CLIENT_ID,
  client_secret: process.env.E_INVOICE_CLIENT_SECRET,
  gstin: process.env.E_INVOICE_GSTIN,
};

const EInvoiceAuthMiddleware = async (req, res, next) => {
  var authURl =
    process.env.E_INVOICE_BASE_URL +
    `/einvoice/authenticate?email=${process.env.E_INVOICE_EMAIL_ID}`;

  try {
    const { data } = await axios.get(authURl, {
      headers: EInvoiceHeaderVariable,
    });
    // console.log(data, 'sdfy');
    if (data.status_cd == '0') {
      return res.status(401).json({
        result: null,
        status: false,
        error_message: data.status_desc,
        message: 'E-Invoice Authentication Failed',
      });
    } else if (data.status_cd == 'Sucess') {
      req.eInvoiceAuthToken = data?.data?.AuthToken;
      next();
    }
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export default EInvoiceAuthMiddleware;
