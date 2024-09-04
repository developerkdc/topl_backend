import jwt from "jsonwebtoken";
import { SomethingWrong } from "../utils/response/response.js";
import getConfigs from "../config/config.js";
const Configs = getConfigs();

const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return null;
    } else {
      if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length).trimLeft();
      }
      const decoded = jwt.verify(token, Configs.jwt.accessSecret);

      req.tokenDetails = decoded;

      return decoded;
    }
  } catch (err) {
    return res
      .status(500)
      .json({ result: [], status: false, message: SomethingWrong });
  }
};

export default verifyToken;
