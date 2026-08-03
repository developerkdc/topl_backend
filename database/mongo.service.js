import mongoose from 'mongoose';
import getConfigs from '../config/config.js';
import { veneer_inventory_items_model } from './schema/inventory/venner/venner.schema.js';

const Configs = getConfigs();
let isConnected = false;
const matchesIndexKey = (currentKey = {}, expectedKey = {}) => {
  const currentEntries = Object.entries(currentKey);
  const expectedEntries = Object.entries(expectedKey);

  return (
    currentEntries.length === expectedEntries.length &&
    expectedEntries.every(([field, direction]) => currentKey[field] === direction)
  );
};

const syncVeneerInventoryCombinationIndex = async () => {
  try {
    const collection = veneer_inventory_items_model.collection;
    const existingIndexes = await collection.indexes();
    const legacyIndex = existingIndexes.find(
      (index) =>
        index?.unique &&
        matchesIndexKey(index?.key, {
          item_name: -1,
          pallet_number: -1,
          bundle_number: -1,
        })
    );

    if (legacyIndex) {
      await collection.dropIndex(legacyIndex.name);
      console.log(
        `Dropped legacy veneer inventory unique index: ${legacyIndex.name}`
      );
    }

    const hasExpectedIndex = existingIndexes.some(
      (index) =>
        index?.unique &&
        matchesIndexKey(index?.key, {
          log_code: 1,
          bundle_number: 1,
          pallet_number: 1,
        })
    );

    if (!hasExpectedIndex) {
      await collection.createIndex(
        { log_code: 1, bundle_number: 1, pallet_number: 1 },
        {
          unique: true,
          name: 'log_code_1_bundle_number_1_pallet_number_1',
        }
      );
      console.log(
        'Created veneer inventory unique index on log_code + bundle_number + pallet_number'
      );
    }
  } catch (error) {
    console.log(
      `Failed to sync veneer inventory combination index: ${error.message}`
    );
  }
};

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
      await syncVeneerInventoryCombinationIndex();
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
