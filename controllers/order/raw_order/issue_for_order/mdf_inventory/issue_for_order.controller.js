import catchAsync from "../../../../../utils/errors/catchAsync.js";

export const add_issue_for_order=catchAsync(async(req,res)=>{
    res.status(200).json({msg:"This is add issue for order from mdf"});
})