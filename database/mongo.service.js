import mongoose from "mongoose";
import getConfigs from "../config/config.js";

const Configs=getConfigs()
let connect = () => {
  const options = {
    // useNewUrlParser: true
  };
  mongoose.connect(Configs?.mongo?.url, options);

  mongoose.connection.on("connected", () => {
    console.log(`Connected to the MongoDB Database ${Configs?.server?.name} ${Configs?.server?.version}`);
  });

  // If the connection throws an error
  mongoose.connection.on("error", (err) => {
    console.log("handle mongo errored connections: " + err);
  });

  // When the connection is disconnected
  mongoose.connection.on("disconnected", () => {
    console.log("Mongoose default connection disconnected");
  });
  process.on("SIGINT", () => {
    mongoose.connection.close(() => {
      console.log("App terminated, closing mongo connections");
      process.exit(0);
    });
  });
};

export default connect;
