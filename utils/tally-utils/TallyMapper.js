/**
 * TallyMapperMinimal.js
 * Minimal Tally XML for Sales Voucher in Educational Mode
 */

export function DispatchJSONtoXML(dispatch) {

    const formatDate = (val) => {
        if (!val) return "20250401"; // default allowed date
        const d = new Date(val);
        return (
            d.getFullYear().toString() +
            String(d.getMonth() + 1).padStart(2, "0") +
            String(d.getDate()).padStart(2, "0")
        );
    };

    const escape = (str) => String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

    const date = "20250401"; // Educational mode allowed date
    const voucherNo = escape(dispatch.invoice_no || "1");
    const partyName = escape(dispatch.customer_details?.company_name || "Cash Sales");
    const itemName = escape(dispatch.dispatch_items_details?.[0]?.item_name || "AMERICAN WALNUT");
    const amount = dispatch.final_total_amount || 1000; // fallback if missing

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
 <HEADER>
  <TALLYREQUEST>Import Data</TALLYREQUEST>
 </HEADER>
 <BODY>
  <IMPORTDATA>
   <REQUESTDESC>
    <REPORTNAME>Vouchers</REPORTNAME>
   </REQUESTDESC>
   <REQUESTDATA>
    <TALLYMESSAGE>
     <VOUCHER VCHTYPE="Sales" ACTION="Create">
      <DATE>${date}</DATE>
      <VOUCHERNUMBER>${voucherNo}</VOUCHERNUMBER>
      <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>

      <ALLINVENTORYENTRIES.LIST>
       <STOCKITEMNAME>${itemName}</STOCKITEMNAME>
       <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
       <AMOUNT>${amount.toFixed(2)}</AMOUNT>
       <BILLEDQTY>1 NOS</BILLEDQTY>
       <RATE>${amount.toFixed(2)}/NOS</RATE>
      </ALLINVENTORYENTRIES.LIST>

      <LEDGERENTRIES.LIST>
       <LEDGERNAME>${partyName}</LEDGERNAME>
       <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
       <AMOUNT>-${amount.toFixed(2)}</AMOUNT>
      </LEDGERENTRIES.LIST>

     </VOUCHER>
    </TALLYMESSAGE>
   </REQUESTDATA>
  </IMPORTDATA>
 </BODY>
</ENVELOPE>`;

    console.log("Generated Minimal Tally XML:", xml);
    return xml;
}
