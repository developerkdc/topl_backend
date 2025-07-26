import exceljs from 'exceljs';
import ApiError from '../../../../utils/errors/apiError.js';

export const createPhotoAlbumExcel = async (newData, req, res) => {
  try {
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet('Photo-Album-Report');

    // Define columns with appropriate widths
    worksheet.columns = [
      { header: 'Sr. No', key: 'sr_no', width: 8 },
      { header: 'Photo Number', key: 'photo_number', width: 15 },
      { header: 'Group No', key: 'group_no', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Current Stage', key: 'current_stage', width: 15 },

      // Item details
      { header: 'Item Name', key: 'item_name', width: 20 },
      { header: 'Length', key: 'length', width: 10 },
      { header: 'Width', key: 'width', width: 10 },
      { header: 'Thickness', key: 'thickness', width: 12 },
      { header: 'No. of Sheets', key: 'no_of_sheets', width: 15 },
      { header: 'Available No. of Sheets', key: 'available_no_of_sheets', width: 15 },

      // Characteristics
      { header: 'Timber Colour', key: 'timber_colour_name', width: 15 },
      { header: 'Process', key: 'process_name', width: 15 },
      { header: 'Character', key: 'character_name', width: 15 },
      { header: 'Pattern', key: 'pattern_name', width: 15 },
      { header: 'Series', key: 'series_name', width: 12 },
      { header: 'Grade', key: 'grade_name', width: 10 },
      { header: 'Cut', key: 'cut_name', width: 12 },
      { header: 'Process Color', key: 'process_color_name', width: 15 },

      // Additional info
      { header: 'Sales Item Name', key: 'sales_item_name', width: 20 },
      { header: 'Placement', key: 'placement', width: 12 },
      { header: 'Collection Name', key: 'collection_name', width: 15 },
      { header: 'Grain Direction', key: 'grain_direction', width: 15 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Destination', key: 'destination', width: 15 },
      {
        header: 'Destination Pallet No',
        key: 'destination_pallet_no',
        width: 20,
      },

      // Pricing
      { header: 'Min Rate', key: 'min_rate', width: 12 },
      { header: 'Max Rate', key: 'max_rate', width: 12 },

      // Process arrays
      {
        header: 'Value Added Processes',
        key: 'value_added_processes',
        width: 25,
      },
      {
        header: 'Additional Characters',
        key: 'additional_characters',
        width: 25,
      },

      // User info
      { header: 'Created By', key: 'created_by', width: 20 },
      { header: 'Updated By', key: 'updated_by', width: 20 },

      // Dates
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 },

      // Remarks
      { header: 'Remark', key: 'remark', width: 30 },
    ];

    // Style the header row
    // worksheet.getRow(1).eachCell((cell) => {
    //   cell.font = { bold: true };
    //   cell.alignment = { vertical: 'middle', horizontal: 'center' };
    //   cell.fill = {
    //     type: 'pattern',
    //     pattern: 'solid',
    //     fgColor: { argb: 'FFD3D3D3' }, // Light gray background
    //   };
    //   cell.border = {
    //     top: { style: 'thin' },
    //     left: { style: 'thin' },
    //     bottom: { style: 'thin' },
    //     right: { style: 'thin' },
    //   };
    // });

    // Handle single object or array of objects
    const dataArray = Array.isArray(newData) ? newData : [newData];

    dataArray.forEach((item) => {
      // Format nested arrays
      const valueAddedProcesses = item?.value_added_process
        ? item?.value_added_process.map((p) => p.process_name).join(', ')
        : '';

      const additionalCharacters = item?.additional_character
        ? item?.additional_character.map((c) => c.character_name).join(', ')
        : '';

      // Format created/updated by
      const createdBy =
        item?.created_by && item?.created_by[0]
          ? `${item?.created_by[0].user_name}`
          : '';

      const updatedBy =
        item?.updated_by && item?.updated_by[0]
          ? `${item?.updated_by[0].user_name}`
          : '';

      worksheet.addRow({
        sr_no: item?.sr_no,
        photo_number: item?.photo_number || '',
        group_no: item?.group_no || '',
        status: item?.status ? 'Active' : 'Inactive',
        current_stage: item?.current_stage || '',

        // Item details
        item_name: item?.item_name || '',
        length: item?.length || '',
        width: item?.width || '',
        thickness: item?.thickness || '',
        no_of_sheets: item?.no_of_sheets || '',
        available_no_of_sheets: item?.available_no_of_sheets || '',

        // Characteristics
        timber_colour_name: item?.timber_colour_name || '',
        process_name: item?.process_name || '',
        character_name: item?.character_name || '',
        pattern_name: item?.pattern_name || '',
        series_name: item?.series_name || '',
        grade_name: item?.grade_name || '',
        cut_name: item?.cut_name || '',
        process_color_name: item?.process_color_name || '',

        // Additional info
        sales_item_name: item?.sales_item_name || '',
        placement: item?.placement || '',
        collection_name: item?.collection_name || '',
        grain_direction: item?.grain_direction || '',
        type: item?.type || '',
        destination: item?.destination || '',
        destination_pallet_no: item?.destination_pallet_no || '',

        // Pricing
        min_rate: item?.min_rate || '',
        max_rate: item?.max_rate || '',

        // Process arrays
        value_added_processes: valueAddedProcesses,
        additional_characters: additionalCharacters,

        // User info
        created_by: createdBy,
        updated_by: updatedBy,

        // Dates
        createdAt: item?.createdAt
          ? new Date(item?.createdAt).toLocaleString()
          : '',
        updatedAt: item?.updatedAt
          ? new Date(item?.updatedAt).toLocaleString()
          : '',

        // Remarks
        remark: item?.remark || '',
      });
    });

    const fileName = `Photo_Album_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel generation error:', error);
    throw new ApiError(500, 'Failed to generate Excel report');
  }
};
