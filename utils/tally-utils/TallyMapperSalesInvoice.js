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
        `Invoice ${dispatch.invoice_no}`
    );

    const freight_charges = Number(dispatch.freight_details.freight_amount || 0);
    const other_charges = Number(dispatch.other_amount_details.other_charges || 0);
    const insurance_charges = Number(dispatch.insurance_details.insurance_amount || 0);
    const gst_charges = Number(dispatch.total_gst_amt || 0);
    const cgst_charges = Number(dispatch.total_cgst_amt || 0);
    const sgst_charges = Number(dispatch.total_sgst_amt || 0);
    const igst_charges = Number(dispatch.total_igst_amt || 0);
    const items = dispatch.dispatch_items_details || [];
    // console.log("items: ", items);
    // Calculate total safely
    const totalAmount = items.reduce((sum, it) => {
        const qty = Number(it.sqm || it.cbm || it.cmt || it.quantity || 0);
        const rate = Number(it.rate || 0);

        const amount = Number((it.amount ?? (qty * rate)).toFixed(2));

        return sum + amount;
    }, 0);

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

    const ledgerEntries = [];

    // FREIGHT
    if (freight_charges)
        ledgerEntries.push(`
        <LEDGERENTRIES.LIST>
        <LEDGERNAME>Freight Outward Exp-Sales</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${freight_charges.toFixed(2)}</AMOUNT>
        </LEDGERENTRIES.LIST>`);

    // INSURANCE
    if (insurance_charges)
        ledgerEntries.push(`
        <LEDGERENTRIES.LIST>
        <LEDGERNAME>Insurance Exp.-Sales Tcs</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${insurance_charges.toFixed(2)}</AMOUNT>
        </LEDGERENTRIES.LIST>`);

    // OTHER / PACKING
    if (other_charges)
        ledgerEntries.push(`
        <LEDGERENTRIES.LIST>
        <LEDGERNAME>Packing Exps-Sales</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${other_charges.toFixed(2)}</AMOUNT>
        </LEDGERENTRIES.LIST>`);

    // GST LOGIC
    if (igst_charges) {

        ledgerEntries.push(`
        <LEDGERENTRIES.LIST>
        <LEDGERNAME>IGST-Output</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${igst_charges.toFixed(2)}</AMOUNT>
        </LEDGERENTRIES.LIST>`);

    } else {

        if (cgst_charges)
            ledgerEntries.push(`
        <LEDGERENTRIES.LIST>
        <LEDGERNAME>CGST-Output</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${cgst_charges.toFixed(2)}</AMOUNT>
        </LEDGERENTRIES.LIST>`);

        if (sgst_charges)
            ledgerEntries.push(`
        <LEDGERENTRIES.LIST>
        <LEDGERNAME>SGST-Output</LEDGERNAME>
        <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
        <AMOUNT>${sgst_charges.toFixed(2)}</AMOUNT>
        </LEDGERENTRIES.LIST>`);
    }

    const finalTotal = Number(dispatch.final_total_amount || 0);
    const calculatedTotal =
        Number((
            totalAmount +
            freight_charges +
            insurance_charges +
            other_charges +
            cgst_charges +
            sgst_charges +
            igst_charges
        ).toFixed(2));

    const rounding = finalTotal - calculatedTotal;

    const partyAmount = Number(dispatch.final_total_amount);
    if (Math.abs(rounding) >= 0.01) {
        ledgerEntries.push(`
    <LEDGERENTRIES.LIST>
        <LEDGERNAME>Invoice Rounding</LEDGERNAME>
        <ISDEEMEDPOSITIVE>${rounding < 0 ? "Yes" : "No"}</ISDEEMEDPOSITIVE>
        <AMOUNT>${rounding.toFixed(2)}</AMOUNT>
    </LEDGERENTRIES.LIST>
    `);
    }

    // console.log("====== TALLY CHECK ======");
    // console.log("Inventory Total:", totalAmount);
    // console.log("Calculated Total:", calculatedTotal);
    // console.log("Final Total:", finalTotal);
    // console.log("Rounding:", rounding);
    // console.log("==========================");


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

        <!-- PARTY -->
        <LEDGERENTRIES.LIST>
        <LEDGERNAME>${partyName}</LEDGERNAME>
        <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
        <AMOUNT>-${partyAmount.toFixed(2)}</AMOUNT>
        </LEDGERENTRIES.LIST>

        ${inventoryXML}

        ${ledgerEntries.join("")}

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
