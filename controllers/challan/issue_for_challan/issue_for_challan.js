import { isValidObjectId } from "mongoose";
import ApiError from "../../../utils/errors/apiError.js";
import { StatusCodes } from "../../../utils/constants.js";
import { item_issued_from } from "../../../database/Utils/constants/constants";
import { log_inventory_items_model } from "../../../database/schema/inventory/log/log.schema.js";
import { flitch_inventory_items_model } from "../../../database/schema/inventory/Flitch/flitch.schema";


//add for each inventory and factory item
const issued_from_map = {
    [item_issued_from?.log] : log_inventory_items_model,
    [item_issued_from?.flitch] : flitch_inventory_items_model
}
class IssueForChallan {
    constructor(session,userDetails,issued_from, issued_item_id){
        if(!isValidObjectId(issued_item_id)){
            throw new ApiError("Invalid ID",StatusCodes.BAD_REQUEST)
        };
        this.session = session;
        this.userDetails = userDetails;
        this.issued_from = issued_from;
        this.issued_item_id = issued_item_id;
        this.issued_item_details = null
    };

    //method to fetch issued item details based on issued item id
    async fetch_issued_item_details (){
        const issued_item_details = await issued_from_map[this.issued_from]?.findOne({_id : this.issued_item_id}).session(this.session);

        if(!issued_item_details){
            throw new ApiError("Issued item details not found.",StatusCodes.NOT_FOUND)
        };
        this.issued_item_details = issued_item_details;
        return issued_item_details;
    };

    async add_issue_data_to_challan(){
        try {
            await this.fetch_issued_item_details();

            const issued_from = this.issued_from;
            if(!this[issued_from]){
                throw new ApiError(`Invalid Issued from type : ${issued_from}`,StatusCodes.NOT_FOUND);
            }
            await this[issued_from]();
        } catch (error) {
            throw error
        }
    };

    //add data from log inventory
    async LOG(){
        
    }
    //add data from flitch inventory
    async FLITCH(){

    }
    //add data from Plywood inventory
    async PLYWOOD(){

    }
    //add data from VENEER inventory
    async VENEER(){

    }
    //add data from MDF inventory
    async MDF(){

    }
    //add data from Face inventory
    async FACE(){

    }
    //add data from CORE inventory
    async CORE(){

    }
    //add data from FLEECE PAPER inventory
    async FLEECE_PAPER(){

    }
    //add data from OTHER GOODS inventory
    async OTHER_GOODS(){

    }



    
};

export default IssueForChallan;