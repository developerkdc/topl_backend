import UserModel from "../../database/schema/user.schema.js";

const FetchUserByEmail = async (req, res, email) => {
  try {
    const user = await UserModel.findOne({ email_id: email }).populate(
      "role_id"
    );
    return user;
  } catch (error) {
    throw error;
  }
};

export { FetchUserByEmail };
