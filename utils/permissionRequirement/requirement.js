const ExtractRequiredPermission = (routeName) => {
  switch (routeName) {
    // user modules
    case "/add-user":
      return "user_create";
    case "/update-user":
      return "user_edit";
    case "/update-user-profile":
      return "user_edit";
    case "/list-user":
      return "user_view";
    case "/list-user-profile":
      return "user_view";
    case "/list-user-logs":
      return "user_view";
    case "/change-password":
      return "user_edit";
    case "/update-user-profile":
      return "user_edit";
    case "/admin-change-password":
      return "user_edit";
    case "/user-logs":
      return "user_edit";

    // role modules
    case "/add-role":
      return "role_create";
    case "/update-role":
      return "role_edit";
    case "/list-role":
      return "role_view";
    case "/list-role-logs":
      return "role_view";

    // supplier modules
    case "/add-supplier-master":
      return "supplier_master_create";
    case "/update-supplier-master":
      return "supplier_master_edit";
    case "/list-supplier-master":
      return "supplier_master_view";

    // unit modules
    case "/add-unit-master":
      return "unit_master_create";
    case "/update-unit-master":
      return "unit_master_edit";
    case "/list-unit-master":
      return "unit_master_view";

    // grade modules
    case "/add-grade-master":
      return "grade_master_create";
    case "/update-grade-master":
      return "grade_master_edit";
    case "/list-grade-master":
      return "grade_master_view";

    // pallete modules

    case "/add-pallete-master":
      return "pallete_master_create";
    case "/bulk-upload-pallete-master":
      return "pallete_master_create";
    case "/update-pallete-master":
      return "pallete_master_edit";
    case "/list-pallete-master":
      return "pallete_master_view";

    // party modules

    case "/add-party-name-master":
      return "party_master_create";
    case "/update-party-name-master":
      return "party_master_edit";
    case "/list-party-name-master":
      return "party_master_view";

    // item category modules

    case "/add":
      return "item_category_master_create";
    case "/bulk-upload-item-master":
      return "item_name_master_create";
    case "/update/:id":
      return "item_category_master_edit";
    case "/list":
      return "item_category_master_view";

    // item subcategory modules

    case "/add":
      return "item_sub_category_master_create";
    case "/bulk-upload-item-master":
      return "item_name_master_create";
    case "/update/:id":
      return "item_sub_category_master_edit";
    case "/list":
      return "item_sub_category_master_view";

    //department-master
    case "/add-department":
      return "department_master_create";
    case "/update-department/:id":
      return "department_master_edit";
    case "/list-department":
      return "department_master_view";

    //machine-master
    case "/add-machine":
      return "machine_master_create";
    case "/update-machine/:id":
      return "machine_master_edit";
    case "/list-machine":
      return "machine_master_view";

    //series-master
    case "/add-series":
      return "series_master_create";
    case "/update-series/:id":
      return "series_master_edit";
    case "/list-series":
      return "series_master_view";

    // item name modules

    case "/add-item-name-master":
      return "item_name_master_create";
    case "/bulk-upload-item-master":
      return "item_name_master_create";
    case "/update-item-name-master":
      return "item_name_master_edit";
    case "/list-item-name-master":
      return "item_name_master_view";

    // item code modules

    case "/add-item-code-master":
      return "item_code_master_create";
    case "/update-item-code-master":
      return "item_code_master_edit";
    case "/list-item-code-master":
      return "item_code_master_view";

    //raw veneer
    case "/add-raw-veneer":
      return "inventory_create";
    case "/available-sqm":
      return "inventory_view";
    case "/bulk-upload-raw-material":
      return "inventory_create";
    case "/update-raw-veneer":
      return "inventory_edit";
    case "/update-raw-veneer-data":
      return "inventory_edit";
    case "/delete-raw-veneer":
      return "inventory_edit";
    case "/fetch-raw-veneer":
      return "inventory_view";
    case "/reject-raw-veneer":
      return "inventory_edit";
    case "/issue-for-smoking":
      return "inventory_edit";
    case "/issue-for-smoking-pattas":
      return "inventory_edit";
    case "/cancel-smoking-raw":
      return "inventory_edit";
    case "/fetch-raw-veneer-history":
      return "inventory_view";
    case "/issued-for-smoking-raw-list":
      return "inventory_view";

    //other goods
    case "/add-other-goods":
      return "other_goods_create";
    case "/update-other-goods":
      return "other_goods_edit";
    case "/edit-other-goods":
      return "other_goods_edit";
    case "/list-other-goods":
      return "other_goods_view";
    case "/list-other-goods-consumed":
      return "other_goods_view";

    case "/issue-for-grouping":
      return "inventory_edit";
    case "/cancel-grouping":
      return "inventory_edit";

    case "/list-issued-for-grouping":
      return "inventory_view";
    case "/list-issued-for-smoking-group":
      return "inventory_view";
    case "/create-group":
      return "inventory_create";

    case "/list-group":
      return "inventory_view";
    case "/list-group-history":
      return "inventory_view";
    case "/get-group-no":
      return "inventory_view";
    case "/issue-for-smoking-group":
      return "inventory_edit";
    case "/cancel-smoking-group":
      return "inventory_edit";
    case "/issue-for-cutting":
      return "inventory_edit";

    case "/list-issued-for-cutting":
      return "cutting_view";

    //grouping
    case "/update-group-veneer":
      return "grouping_edit";
    case "/reject-raw-veneer-multiple":
      return "grouping_edit";
    case "/revert-group":
      return "grouping_edit";
    //smoking group
    case "/create-group-smoked":
      return "smoking_create";
    case "/list-group-smoked":
      return "smoking_view";
    case "/reject-group-smoked":
      return "smoking_edit";
    case "/pass-group-smoked":
      return "smoking_edit";
    case "/issue-for-dying-group":
      return "smoking_edit";
    case "/list-issued-for-dying-group":
      return "smoking_edit";
    case "/cancel-dying-group":
      return "smoking_edit";

    //smoking individual
    case "/create-individual-smoked":
      return "smoking_create";
    case "/list-individual-smoked":
      return "smoking_view";
    case "/list-issued-individual-smoked":
      return "smoking_view";
    case "/list-issued-group-smoked":
      return "smoking_view";
    case "/reject-individual-smoked":
      return "smoking_edit";
    case "/pass-individual-smoked":
      return "smoking_edit";

    //Dying individual
    case "/create-individual-dyed":
      return "smoking_create";
    case "/list-individual-dyed":
      return "smoking_view";
    case "/list-issued-individual-dyed":
      return "smoking_view";
    case "/list-issued-group-dyed":
      return "smoking_view";
    case "/reject-individual-dyed":
      return "smoking_edit";
    case "/pass-individual-dyed":
      return "smoking_edit";
    case "/issue-for-dying":
      return "smoking_edit";
    case "/cancel-dying-raw":
      return "smoking_edit";
    case "/issue-for-dying-pattas":
      return "smoking_edit";
    case "/issued-for-dying-raw-list":
      return "smoking_edit";

    //Dying group
    case "/create-group-dyed":
      return "smoking_create";
    case "/list-group-dyed":
      return "smoking_view";
    case "/reject-group-dyed":
      return "smoking_edit";
    case "/pass-group-dyed":
      return "smoking_edit";

    //cutting
    case "/create-cutting":
      return "cutting_create";
    case "/revert-issued-for-cutting":
      return "cutting_edit";
    case "/cutting-done-list":
      return "cutting_create";
    case "/issue-for-taping":
      return "cutting_edit";

    //taping
    case "/issued-for-tapping-list":
      return "tapping_view";
    case "/create-tapping":
      return "tapping_create";
    case "/revert-issued-for-tapping":
      return "tapping_edit";
    case "/tapping-done-list":
      return "tapping_view";

    //Ready Sheet Form
    case "/list":
      return "ready_sheet_form_view";
    case "/history-list":
      return "ready_sheet_form_view";
    case "/split":
      return "ready_sheet_form_edit";
    case "/revert":
      return "ready_sheet_form_edit";
    case "/reject":
      return "ready_sheet_form_edit";
    case "/approve":
      return "ready_sheet_form_edit";
    case "/issue-for-pressing":
      return "ready_sheet_form_edit";
    case "/update-ready-sheet-form":
      return "ready_sheet_form_edit";

    //Pressing
    case "/issued-for-pressing-list":
      return "pressing_view";
    case "/create-pressing":
      return "pressing_create";
    case "/revert-issued-for-pressing":
      return "pressing_edit";
    case "/pressing-done-list":
      return "pressing_view";

    //Finishing
    case "/issued-for-finishing-list":
      return "finishing_view";
    case "/update-finishing-status":
      return "finishing_edit";
    case "/revert-issued-for-finishing":
      return "finishing_edit";
    case "/create-finishing":
      return "finishing_create";
    case "/finishing-done-list":
      return "finishing_view";

    //Qc Inventory
    case "/list":
      return "inventory_view";
    case "/revert":
      return "inventory_edit";
    case "/update":
      return "inventory_edit";

    //Order
    case "/add-order":
      return "orders_create";
    case "/list-complete-raw-order":
      return "orders_view";
    case "/list-pending-raw-order":
      return "orders_view";
    case "/list-complete-group-order":
      return "orders_view";
    case "/list-pending-group-order":
      return "orders_view";
    case "/update-order":
      return "orders_edit";

    //Dispatch
    case "/create-dispatch":
      return "dispatch_create";
    case "/delete-raw-dispatch":
      return "dispatch_create";
    case "/delete-group-dispatch":
      return "dispatch_create";
    case "/list-raw-dispatched":
      return "dispatch_view";
    case "/list-group-dispatched":
      return "dispatch_view";
    case "/get-item-pallete":
      return "dispatch_view";
    case "/get-available-group-data":
      return "dispatch_view";
    case "/get-available-raw-data":
      return "dispatch_view";
    default:
      return null;
  }
};
export { ExtractRequiredPermission };
