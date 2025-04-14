import mongoose from 'mongoose';
import getConfigs from '../config/config.js';

const Configs = getConfigs();
let isConnected = false;
let connect = () => {
  // if (isConnected) {
  //   console.log(`🔍 4777777 Active Connections: ${mongoose.connections.length}`);
  //   return;
  // }

  try {
    const options = {
      // useNewUrlParser: true
      retryWrites: true,
      maxPoolSize: 30,
      minPoolSize: 2,
    };
    mongoose.connect(Configs?.mongo?.url, options);
    // isConnected = mongoose.connection.readyState === 1
    // console.log("status", mongoose.connection.readyState === 1)

    // const db = mongoose.connection
    mongoose.connection.on('connected', async () => {
      console.log(
        `Connected to the MongoDB Database ${Configs?.server?.name} ${Configs?.server?.version}`
      );
      // const serverstatus = await db.db.admin().command({ serverstatus: 1 })
      // console.log(serverstatus.connections)
    });

    // If the connection throws an error
    mongoose.connection.on('error', (err) => {
      console.log('handle mongo errored connections: ' + err);
    });

    // When the connection is disconnected
    mongoose.connection.on('disconnected', () => {
      console.log('Mongoose default connection disconnected');
    });
    process.on('SIGINT', () => {
      mongoose.connection.close(() => {
        console.log('App terminated, closing mongo connections');
        process.exit(0);
      });
    });
  } catch (error) {
    console.log('err in database connection', error);
  }
};

export default connect;
