import mongoose from "mongoose";

 const DynamicModel = (modelName,Schema)=>{
    let model;
    if (mongoose.modelNames().includes(modelName)) {
      model = mongoose.model(modelName);
    } else {
      model = mongoose.model(modelName, Schema);
    } 
    
    return model
}

export default DynamicModel;