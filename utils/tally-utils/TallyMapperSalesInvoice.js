import { v4 as uuidv4 } from "uuid";

export function DispatchJSONtoXML(dispatch) {

    const guid = uuidv4();
    const remoteId = uuidv4() + "-00000001";

    const escape = (str) =>
        String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

    const formatDate = (val) => {
        if (!val) return "20250401"; // edu fallback
        const d = new Date(val);
        return (
            d.getFullYear().toString() +
            String(d.getMonth() + 1).padStart(2, "0") +
            String(d.getDate()).padStart(2, "0")
        );
    };

    const date = formatDate(dispatch.invoice_date);
    const voucherNo = escape(dispatch.invoice_no);
    const partyName = escape(
        dispatch.customer_details?.company_name || "Cash"
    );
    const narration = escape(
        dispatch.remark || `Invoice ${dispatch.invoice_no}`
    );

    const items = dispatch.dispatch_items_details || [];
    // console.log("items: ", items);
    // Calculate total safely
    const totalAmount = items.reduce(
        (sum, it) => sum + Number(it.amount || 0),
        0
    );

    const inventoryXML = items
        .map((it) => {
            const name = escape(it.item_name);
            const qty = Number(it.sqm || it.cbm || it.cmt || it.quantity || 0);
            const rate = Number(it.rate || 0);
            const amount = Number(it.amount || qty * rate);
            const unit = escape(it.calculate_unit || "Nos");

            return `
<ALLINVENTORYENTRIES.LIST>

  <STOCKITEMNAME>${name}</STOCKITEMNAME>

  <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
  <ISLASTDEEMEDPOSITIVE>No</ISLASTDEEMEDPOSITIVE>

  <ACTUALQTY>${qty} ${unit}</ACTUALQTY>
  <BILLEDQTY>${qty} ${unit}</BILLEDQTY>

  <RATE>${rate.toFixed(2)}/${unit}</RATE>
  <AMOUNT>${amount.toFixed(2)}</AMOUNT>

  <ACCOUNTINGALLOCATIONS.LIST>
    <LEDGERNAME>Sales</LEDGERNAME>
    <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
    <AMOUNT>${amount.toFixed(2)}</AMOUNT>
  </ACCOUNTINGALLOCATIONS.LIST>

</ALLINVENTORYENTRIES.LIST>
`;
        })
        .join("");

    const xml = `
    <ENVELOPE>
    <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
    </HEADER>

    <BODY>
    <IMPORTDATA>

    <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
        <SVCURRENTCOMPANY>Natural Veneers</SVCURRENTCOMPANY>
        </STATICVARIABLES>
    </REQUESTDESC>

    <REQUESTDATA>
        <TALLYMESSAGE>

        <VOUCHER VCHTYPE="Sales" ACTION="Create">

        <GUID>${guid}</GUID>
        <REMOTEID>${remoteId}</REMOTEID>

        <DATE>${date}</DATE>
        <EFFECTIVEDATE>${date}</EFFECTIVEDATE>

        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${voucherNo}</VOUCHERNUMBER>

        <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
        <NARRATION>${narration}</NARRATION>

        <ISINVOICE>Yes</ISINVOICE>
        <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>

        <!-- PARTY DEBIT -->
        <LEDGERENTRIES.LIST>
            <LEDGERNAME>${partyName}</LEDGERNAME>
            <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
            <AMOUNT>-${totalAmount}</AMOUNT>
        </LEDGERENTRIES.LIST>

        ${inventoryXML}

        </VOUCHER>

        </TALLYMESSAGE>
    </REQUESTDATA>

    </IMPORTDATA>
    </BODY>
    </ENVELOPE>
    `;

    // console.log(xml);
    return xml;
}
