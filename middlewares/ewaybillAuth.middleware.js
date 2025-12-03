import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

export const EwayBillHeaderVariable = {
  username: process.env.EWAY_BILL_USERNAME,
  //   password: process.env.EWAY_BILL_PASSWORD,
  ip_address: process.env.EWAY_BILL_IP_ADDRESS,
  client_id: process.env.EWAY_BILL_CLIENT_ID,
  client_secret: process.env.EWAY_BILL_CLIENT_SECRET,
  gstin: process.env.EWAY_BILL_GSTIN,
  Accept: 'application/json',
};

const EwayBillAuthMiddleware = async (req, res, next) => {
  var authURl =
    process.env.EWAY_BILL_BASE_URL +
    `/ewaybillapi/v1.03/authenticate?email=${process.env.EWAY_BILL_EMAIL_ID}&username=${process.env.EWAY_BILL_USERNAME}&password=${process.env.EWAY_BILL_PASSWORD}`;

  try {
    const { data } = await axios.get(authURl, {
      headers: EwayBillHeaderVariable,
    });
    console.log(data, 'ewaybill auth middleware');
    if (data.status_cd == '0') {
      return res.status(401).json({
        result: null,
        status: false,
        error_message: data.status_desc,
        message: 'E-Way Bill Authentication Failed',
      });
    } else if (data.status_cd == '1') {
      req.eWayBillAuthToken = data?.data?.AuthToken;
      next();
    }
  } catch (error) {
    console.log(error);
    return next(error);
  }
};

export default EwayBillAuthMiddleware;
