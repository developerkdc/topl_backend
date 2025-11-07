import dressing_miss_match_data_model from '../../database/schema/factory/dressing/dressing_done/dressing.machine.mismatch.data.schema.js';
import dressing_raw_machine_data_model from '../../database/schema/factory/dressing/dressing_done/dressing.machine.raw.data.schema.js';
import { issue_for_dressing_model } from '../../database/schema/factory/slicing/slicing_done.schema.js';

export const insert_raw_machine_data_into_machine_mismatch_model = async () => {
  try {
    const dressing_raw_data_model_change_stream =
      dressing_raw_machine_data_model.watch();

    dressing_raw_data_model_change_stream?.on('change', async (operation) => {
      if (operation?.operationType === 'insert') {
        const inserted_document = Array.isArray(operation?.fullDocument)
          ? operation?.fullDocument
          : [operation?.fullDocument];

        // const updated_itemss = inserted_document.map((item) => ({
        //   dressing_date: item?.Fecha,
        //   log_no_code: item?.Tronco,
        //   item_name: item?.Especie,
        //   item_id: null,
        //   length: item?.Largo,
        //   width: item?.Ancho,
        //   thickness: item?.Grosor,
        //   no_of_leaves: item?.Hojas,
        //   sqm: item?.M2,
        //   bundle_number: item?.NumPaqTronco,
        //   pallet_number: item?.Partida,
        //   created_by: item?.created_by,
        //   updated_by: item?.updated_by,
        // }));

        //finding item name,id and item subcategory name and id based on log no code
        const updated_items = await Promise.all(
          inserted_document?.map(async (item) => {
            const issue_for_dressing_data = await issue_for_dressing_model
              .findOne({ log_no_code: item?.Tronco })
              .lean();
            return {
              dressing_date: item?.Fecha,
              log_no_code: item?.Tronco,
              item_name: issue_for_dressing_data?.item_name || null,
              item_id: issue_for_dressing_data?.item_name_id || null,
              item_sub_category_name:
                issue_for_dressing_data?.item_sub_category_name || null,
              item_sub_category_id:
                issue_for_dressing_data?.item_sub_category_id ||
                issue_for_dressing_data?.item_sub_category_name_id ||
                null,
              length: item?.Largo,
              width: item?.Ancho,
              thickness: item?.Grosor,
              no_of_leaves: item?.Hojas,
              sqm: item?.M2,
              bundle_number: item?.NumPaqTronco,
              pallet_number: item?.Partida,
              created_by: item?.created_by,
              updated_by: item?.updated_by,
            };
          })
        );
        try {
          const insert_result =
            await dressing_miss_match_data_model.create(updated_items);

          console.log(
            `✅ Inserted ${insert_result?.length} records into mismatch data`
          );
        } catch (error) {
          console.log(
            `An err occured while inserting data in dressing mismatch collection => ${error.message}`
          );
          // throw error
        }
      }
    });
  } catch (error) {
    console.log(
      'Failed to insert bulk upload data in machine mismatch data',
      error?.message
    );
  }
};

// insert_raw_machine_data_into_machine_mismatch_model();
