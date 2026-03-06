import { v4 as uuidv4 } from "uuid";

export function ChallanJSONtoXML(challan) {
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
        if (!val) return "20250401";
        const d = new Date(val);
        return (
            d.getFullYear().toString() +
            String(d.getMonth() + 1).padStart(2, "0") +
            String(d.getDate()).padStart(2, "0")
        );
    };

    // const date = formatDate(challan.challan_date);
    const date = "20250401";
    const voucherNo = escape(challan.challan_no || "DN-001");
    const partyName = escape(
        challan.customer_details?.company_name || "Cash"
    );
    const narration = escape(challan.remark || `Material delivered against order`);
    const reference = escape(challan.reference || `Ref-001`);

    const stockLedger = "Stock-in-Hand"; // Must exist in Tally
    const godown = "Main Location";

    const items = challan.issue_for_challan_item_details || [];
    console.log("Raw Items Array:", items);
    const qty = Number(challan.total_sqm || 0);
    const inventoryXML = challan.issue_for_challan_item_details
        .map((row) => {

            const item = row.issued_item_details;

            const name = escape(item.item_name);

            const qty = Number(item.total_sq_meter || 0);
            const rate = Number(item.rate_in_inr || 0);
            const amount = Number(item.amount || qty * rate);

            const unit = "Nos";
            const batch = escape(item.pallet_number || "Primary Batch");
            console.log("Raw Item Object:", item);

            console.log("Mapped Values:");
            console.log("Name   ->", name);
            console.log("Qty    ->", qty);
            console.log("Rate   ->", rate);
            console.log("Amount ->", amount);
            console.log("Unit   ->", unit);
            console.log("Batch  ->", batch);

            console.log("Sanity Check:");
            console.log("Qty * Rate =", qty * rate);
            console.log("Matches Amount?", qty * rate === amount);

            return `
            <ALLINVENTORYENTRIES.LIST>

    <STOCKITEMNAME>${name}</STOCKITEMNAME>

    <ISDEEMEDPOSITIVE>YES</ISDEEMEDPOSITIVE>
    <ISLASTDEEMEDPOSITIVE>YES</ISLASTDEEMEDPOSITIVE>
    <ISINVOICEITEM>NO</ISINVOICEITEM>

    <ACTUALQTY>${qty} Nos</ACTUALQTY>
    <BILLEDQTY>${qty} Nos</BILLEDQTY>

    <RATE>${rate}/Nos</RATE>
    <AMOUNT>-${amount}</AMOUNT>

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
            <TALLYMESSAGE xmlns:UDF="TallyUDF">
            <VOUCHER
                VCHTYPE="Delivery Note" 
                ACTION="Create" 
                OBJVIEW="Invoice Voucher View">
                <ISOPTIONAL>NO</ISOPTIONAL>
                <GUID>${guid}</GUID>
                <REMOTEID>${remoteId}</REMOTEID>
                <DATE>${date}</DATE>
                <EFFECTIVEDATE>${date}</EFFECTIVEDATE>
                <VOUCHERTYPENAME>Delivery Note</VOUCHERTYPENAME>
                <VOUCHERNUMBER>${voucherNo}</VOUCHERNUMBER>
                
                <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>
                <REFERENCE>${reference}</REFERENCE>
                <NARRATION>${narration}</NARRATION>
                <ISINVOICE>NO</ISINVOICE>
                <PERSISTEDVIEW>Delivery Note Voucher View</PERSISTEDVIEW>

                <!-- Inventory Entries -->
                ${inventoryXML}
                <ISINVENTORYVOUCHER>YES</ISINVENTORYVOUCHER>
                <LEDGERENTRIES.LIST>
                    <LEDGERNAME>${partyName}</LEDGERNAME>
                    <ISDEEMEDPOSITIVE>NO</ISDEEMEDPOSITIVE>
                    <AMOUNT>0</AMOUNT>
                </LEDGERENTRIES.LIST>
            </VOUCHER>
            </TALLYMESSAGE>
        </REQUESTDATA>
        </IMPORTDATA>
    </BODY>
    </ENVELOPE>
`;
    // console.log("tally xml: ", xml);
    return xml;
}
