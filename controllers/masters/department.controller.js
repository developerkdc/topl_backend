import ApiError from "../../utils/errors/apiError.js";
import catchAsync from "../../utils/errors/catchAsync.js";
import ApiResponse from '../../utils/ApiResponse.js'
import { StatusCodes } from '../../utils/constants.js';
import departMentModel from "../../database/schema/masters/department.schema.js";

export const addDepartment = catchAsync(async (req, res) => {
    const { dept_name } = req.body;


    if (!dept_name) {
        return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "deptartment name is required"))
    };
    const checkIfAlreadyExists = await departMentModel.find({ dept_name: dept_name });
    if (checkIfAlreadyExists.length > 0) {
        return res.json(new ApiResponse(StatusCodes.OK, "Category already exists"))
    };

    const maxNumber = await departMentModel.aggregate([
        {
            $group: {
                _id: null,
                max: {
                    $max: "$sr_no"
                }
            }
        }
    ]);

    const created_by = req.userDetails.id


    // const newMax = maxNumber.length > 0 ? maxNumber[0].max + 1 : 1;
    const newMax = 1
    const newDept = new departMentModel({
        sr_no: newMax, dept_name, created_by
    });
    await newDept.save();

    return res.json(new ApiResponse(StatusCodes.OK, "Department created successfully", newDept))
});

export const editDepartment = catchAsync(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Id is missing"))
    };

    const validateDept = await departMentModel.findById(id);
    if (!validateDept) {
        return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Invalid Category id"))
    };

    const updatedData = await departMentModel.findByIdAndUpdate(id, { $set: req.body }, { runValidators: true, new: true });
    if (!updatedData) {
        return res.json(new ApiResponse(StatusCodes.INTERNAL_SERVER_ERROR, "Err updating department"))
    };
    return res.json(new ApiResponse(StatusCodes.OK, "department updated successfully"))
});

export const listDepartmentDetails = catchAsync(async (req, res) => {
    const { query, sortField, sortOrder, page, limit } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const skipped = (pageInt - 1) * limitInt;

    const sortDirection = sortOrder === "desc" ? -1 : 1;
    const sortObj = sortField ? { [sortField]: sortDirection } : {}
    const searchQuery = query
        ? {
            $or: [
                { "dept_name": { $regex: query, $options: "i" } },
            ],
        }
        : {};


    const pipeline = [
        {
            $lookup: {
                from: "users",
                localField: "created_by",
                foreignField: "_id",
                as: "userDetails"
            }
        },
        { $match: searchQuery },
        { $unwind: '$userDetails' },
        {
            $project: {
                sr_no: 1,
                dept_name: 1,
                createdAt: 1,
                created_by: 1,
                "userDetails.first_name": 1,
                "userDetails.last_name": 1
            }
        },
        { $skip: skipped },
        { $limit: limitInt }
    ];

    if (Object.keys(sortObj).length > 0) {
        pipeline.push({ $sort: sortObj });
    }
    const allDetails = await departMentModel.aggregate(pipeline);
    if (allDetails.length === 0) {
        return res.json(new ApiResponse(StatusCodes.OK, "NO Data found..."));
    }

    const totalDocs = await departMentModel.countDocuments({ ...searchQuery })
    const totalPage = Math.ceil(totalDocs / limitInt);
    return res.json(new ApiResponse(StatusCodes.OK, "All Details fetched succesfully..", { allDetails, totalPage }))
});