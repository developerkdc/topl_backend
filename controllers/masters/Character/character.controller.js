import mongoose from "mongoose";
import characterModel from "../../../database/schema/masters/character.schema.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import ApiError from "../../../utils/errors/apiError.js";
import catchAsync from "../../../utils/errors/catchAsync.js";
import { DynamicSearch } from "../../../utils/dynamicSearch/dynamic.js";
import { dynamic_filter } from "../../../utils/dymanicFilter.js";

export const addCharacter = catchAsync(async (req, res, next) => {
    const { name } = req.body;
    const authUserDetail = req.userDetails;

    if (!name) {
        return next(new ApiError("Character Name is required", 400));
    }

    const characterData = {
        name: name,
        created_by: authUserDetail?._id,
        updated_by: authUserDetail?._id,
    }

    const saveCharacterData = new characterModel(characterData);
    await saveCharacterData.save()

    if (!saveCharacterData) {
        return next(new ApiError("Failed to insert data", 400))
    }

    const response = new ApiResponse(
        200,
        true,
        "Character Added Successfully",
        saveCharacterData
    )

    return res.status(201).json(response)
});

export const updateCharacter = catchAsync(async (req, res, next) => {
    const { id } = req.params
    const { name, status } = req.body;
    const authUserDetail = req.userDetails;

    if (!id || !mongoose.isValidObjectId(id)) {
        return next(new ApiError("Invalid Params Id", 400))
    }

    const characterData = {
        name: name,
        status: status,
        updated_by: authUserDetail?._id,
    }

    const updateCharacterData = await characterModel.updateOne({ _id: id }, {
        $set: characterData
    })

    if (updateCharacterData.matchedCount <= 0) {
        return next(new ApiError("Document not found", 404));
    }
    if (!updateCharacterData.acknowledged || updateCharacterData.modifiedCount <= 0) {
        return next(new ApiError("Failed to update document", 400));
    }

    const response = new ApiResponse(
        200,
        true,
        "Character Update Successfully",
        updateCharacterData
    )

    return res.status(201).json(response)
})

export const fetchCharacterList = catchAsync(async (req, res, next) => {
    const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sort = "desc",
        search = "",
    } = req.query;

    const {
        string,
        boolean,
        numbers,
        arrayField = [],
    } = req?.body?.searchFields || {};

    const filter = req.body?.filter;

    let search_query = {};

    if (search != "" && req?.body?.searchFields) {
        const search_data = DynamicSearch(
            search,
            boolean,
            numbers,
            string,
            arrayField
        );
        if (search_data?.length == 0) {
            return res.status(404).json({
                statusCode: 404,
                status: false,
                data: {
                    data: [],
                },
                message: "Results Not Found",
            });
        }
        search_query = search_data;
    }

    const filterData = dynamic_filter(filter);

    const match_query = {
        ...filterData,
        ...search_query,
    };

    // Aggregation stage
    const aggCreatedByLookup = {
        $lookup: {
            from: 'users',
            localField: 'created_by',
            foreignField: '_id',
            pipeline: [
                {
                    $project: {
                        user_name: 1,
                        user_type: 1,
                        dept_name: 1,
                        first_name: 1,
                        last_name: 1,
                        email_id: 1,
                        mobile_no: 1,
                    }
                }
            ],
            as: 'created_by'
        }
    }
    const aggUpdatedByLookup = {
        $lookup: {
            from: 'users',
            localField: 'updated_by',
            foreignField: '_id',
            pipeline: [
                {
                    $project: {
                        user_name: 1,
                        user_type: 1,
                        dept_name: 1,
                        first_name: 1,
                        last_name: 1,
                        email_id: 1,
                        mobile_no: 1,
                    }
                }
            ],
            as: 'updated_by'
        }
    }
    const aggCreatedByUnwind = {
        $unwind: {
            path: '$created_by',
            preserveNullAndEmptyArrays: true
        }
    }
    const aggUpdatedByUnwind = {
        $unwind: {
            path: '$updated_by',
            preserveNullAndEmptyArrays: true
        }
    }
    const aggMatch = {
        $match: {
            ...match_query
        }
    }
    const aggSort = {
        $sort: {
            [sortBy]: sort === "desc" ? -1 : 1
        }
    }
    const aggSkip = {
        $skip: (parseInt(page) - 1) * parseInt(limit)
    }
    const aggLimit = {
        $limit: parseInt(limit)
    }

    const listAggregate = [
        aggCreatedByLookup,
        aggCreatedByUnwind,
        aggUpdatedByLookup,
        aggUpdatedByUnwind,
        aggMatch,
        aggSort,
        aggSkip,
        aggLimit
    ] // aggregation pipiline

    const characterData = await characterModel.aggregate(listAggregate);

    const aggCount = {
        $count: "totalCount"
    } // count aggregation stage

    const totalAggregate = [
        aggCreatedByLookup,
        aggCreatedByUnwind,
        aggUpdatedByLookup,
        aggUpdatedByUnwind,
        aggMatch,
        aggCount
    ] // total aggregation pipiline

    const totalDocument = await characterModel.aggregate(totalAggregate);
    
    const totalPages = Math.ceil((totalDocument?.[0]?.totalCount || 0) / limit)

    const response = new ApiResponse(
        200,
        true,
        "Character Data Fetched Successfully",
        {
            data:characterData,
            totalPages:totalPages
        }
    )
    return res.status(200).json(response)
})

export const fetchSingleCharacter = catchAsync(async (req, res, next) => {
    const { id } = req.params

    if (!id || !mongoose.isValidObjectId(id)) {
        return next(new ApiError("Invalid Params Id", 400))
    }

    const aggregate = [
        {
            $match: {
                _id: mongoose.Types.ObjectId.createFromHexString(id)
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'created_by',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            user_name: 1,
                            user_type: 1,
                            dept_name: 1,
                            first_name: 1,
                            last_name: 1,
                            email_id: 1,
                            mobile_no: 1,
                        }
                    }
                ],
                as: 'created_by'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'updated_by',
                foreignField: '_id',
                pipeline: [
                    {
                        $project: {
                            user_name: 1,
                            user_type: 1,
                            dept_name: 1,
                            first_name: 1,
                            last_name: 1,
                            email_id: 1,
                            mobile_no: 1,
                        }
                    }
                ],
                as: 'updated_by'
            }
        },
        {
            $unwind: {
                path: '$created_by',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $unwind: {
                path: '$updated_by',
                preserveNullAndEmptyArrays: true
            }
        }
    ]

    const characterData = await characterModel.aggregate(aggregate);

    if (characterData && characterData?.length <= 0) {
        return next(new ApiError("Document Not found", 404))
    }

    const response = new ApiResponse(
        200,
        true,
        "Character Data Fetched Successfully",
        characterData?.[0]
    )
    return res.status(200).json(response)
})

export const dropdownCharacter = catchAsync(async (req, res, next) => {

    const characterList = await characterModel.aggregate([
        {
            $match:{
                status:true
            }
        },
        {
            $project: {
                name:1
            }
        }
    ]);

    const response = new ApiResponse(
        200,
        true,
        "Character Dropdown Fetched Successfully",
        characterList
    )
    return res.status(200).json(response)
})