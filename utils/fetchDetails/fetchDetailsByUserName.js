import UserModel from '../../database/schema/user.schema.js';

export const FetchUserByUserName = async (req, res, user_name) => {
  try {
    const user = await UserModel.findOne({ user_name: user_name }).populate(
      'role_id'
    );
    return user;
  } catch (error) {
    throw error;
  }
};

// export { FetchUserByUserName };
