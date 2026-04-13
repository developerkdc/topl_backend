export function CustomerJSONtoXML(customer) {
    const escape = (str) =>
        String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

    const billing = customer?.address?.billing_address || {};
    const contact = customer?.contact_person?.[0] || {};

    const today = new Date();
    const applicableFrom = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}01`;

    // If tally_name exists, use it to identify/alter the existing ledger; otherwise create a new one using company_name
    const ledgerIdentifier = customer.tally_name || customer.company_name;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <ENVELOPE>
        <HEADER>
            <TALLYREQUEST>Import Data</TALLYREQUEST>
        </HEADER>
        <BODY>
            <IMPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>All Masters</REPORTNAME>
                <STATICVARIABLES>
                <SVCURRENTCOMPANY>Natural Veneers</SVCURRENTCOMPANY>
                </STATICVARIABLES>
            </REQUESTDESC>
            <REQUESTDATA>
                <TALLYMESSAGE xmlns:UDF="TallyUDF">
                <LEDGER NAME="${escape(ledgerIdentifier)}" ACTION="CreateOrAlter">

                    <NAME>${escape(customer.company_name)}</NAME>
                    <MAILINGNAME>${escape(customer.company_name)}</MAILINGNAME>
                    <PARENT>Sundry Debtors</PARENT>
                    <ISBILLWISEON>Yes</ISBILLWISEON>

                    <LEDGERPHONE>${escape(contact.mobile_no)}</LEDGERPHONE>
                    <EMAIL>${escape(customer.email_id)}</EMAIL>
                    <INCOMETAXNUMBER>${escape(customer.pan_number)}</INCOMETAXNUMBER>

                    <ISGSTAPPLICABLE>Yes</ISGSTAPPLICABLE>
                    <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
                    <PARTYGSTIN>${escape(customer.gst_number)}</PARTYGSTIN>

                    <!-- MAILING / ADDRESS — exact tag names from Tally export -->
                    <LEDMAILINGDETAILS.LIST>
                    <APPLICABLEFROM>${applicableFrom}</APPLICABLEFROM>
                    <MAILINGNAME>${escape(customer.company_name)}</MAILINGNAME>
                    <ADDRESS.LIST TYPE="String">
                        <ADDRESS>${escape(billing.address)}</ADDRESS>
                        <ADDRESS>${escape(billing.city)}</ADDRESS>
                    </ADDRESS.LIST>
                    <STATE>${escape(billing.state)}</STATE>
                    <COUNTRY>${escape(billing.country || "India")}</COUNTRY>
                    <PINCODE>${escape(billing.pincode)}</PINCODE>
                    </LEDMAILINGDETAILS.LIST>

                    <!-- GST — exact tag names from Tally export -->
                    <LEDGSTREGDETAILS.LIST>
                    <APPLICABLEFROM>${applicableFrom}</APPLICABLEFROM>
                    <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
                    <PLACEOFSUPPLY>${escape(billing.state)}</PLACEOFSUPPLY>
                    <GSTIN>${escape(customer.gst_number)}</GSTIN>
                    <ISOTHTERRITORYASSESSEE>No</ISOTHTERRITORYASSESSEE>
                    <CONSIDERPURCHASEFOREXPORT>No</CONSIDERPURCHASEFOREXPORT>
                    <ISTRANSPORTER>No</ISTRANSPORTER>
                    <ISCOMMONPARTY>No</ISCOMMONPARTY>
                    </LEDGSTREGDETAILS.LIST>

                </LEDGER>
                </TALLYMESSAGE>
            </REQUESTDATA>
            </IMPORTDATA>
        </BODY>
        </ENVELOPE>`;

    return xml;
}

export function StockItemJSONtoXML(stockItem) {
    const escape = (str) =>
        String(str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

    const today = new Date();
    const applicableFrom = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}01`;

    // const baseUnit = escape(stockItem.unit || "NOS");

    const hsnCode = stockItem.hsn_code ? escape(stockItem.hsn_code) : "";
    const hsnSrc = hsnCode ? "User Defined" : "As per Company/Stock Group";

    const gstRate = stockItem.gst_rate ?? 0;
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;

    // If tally_name exists, use it to identify/alter the existing ledger; otherwise create a new one using company_name
    const ledgerIdentifier = stockItem.tally_item_name || stockItem.item_name;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
        <ENVELOPE>
        <HEADER>
            <TALLYREQUEST>Import Data</TALLYREQUEST>
        </HEADER>
        <BODY>
            <IMPORTDATA>
            <REQUESTDESC>
                <REPORTNAME>All Masters</REPORTNAME>
                <STATICVARIABLES>
                <SVCURRENTCOMPANY>Natural Veneers</SVCURRENTCOMPANY>
                </STATICVARIABLES>
            </REQUESTDESC>
            <REQUESTDATA>
                <TALLYMESSAGE xmlns:UDF="TallyUDF">
                <STOCKITEM NAME="${escape(ledgerIdentifier)}" ACTION="CreateOrAlter">

                    <LANGUAGENAME.LIST>
                        <NAME.LIST TYPE="String">
                            <NAME>${escape(stockItem.item_name)}</NAME>
                            ${stockItem.alternate_item_name_details?.map(
        item => `<NAME>${escape(item.alternate_item_name)}</NAME>`
    ).join("") || ""
        }
                        </NAME.LIST>
                        <LANGUAGEID>1033</LANGUAGEID>
                    </LANGUAGENAME.LIST>
                    <PARENT>${escape(stockItem.stock_group || "")}</PARENT>

                    <GSTAPPLICABLE>&#4; Applicable</GSTAPPLICABLE>
                    <GSTTYPEOFSUPPLY>Goods</GSTTYPEOFSUPPLY>
                    <COSTINGMETHOD>Avg. Cost</COSTINGMETHOD>
                    <VALUATIONMETHOD>Avg. Price</VALUATIONMETHOD>


                    <ISBATCHWISEON>No</ISBATCHWISEON>
                    <ISCOSTCENTRESON>No</ISCOSTCENTRESON>
                    <ISCOSTTRACKINGON>No</ISCOSTTRACKINGON>

                    <!-- GST DETAILS — mirrors GSTDETAILS.LIST from export -->
                    <GSTDETAILS.LIST>
                    <APPLICABLEFROM>${applicableFrom}</APPLICABLEFROM>
                    <SRCOFGSTDETAILS>${stockItem.hsn_code ? "User Defined" : "As per Company/Stock Group"}</SRCOFGSTDETAILS>
                    <GSTCALCSLABONMRP>No</GSTCALCSLABONMRP>
                    <ISREVERSECHARGEAPPLICABLE>No</ISREVERSECHARGEAPPLICABLE>
                    <ISNONGSTGOODS>No</ISNONGSTGOODS>
                    <GSTINELIGIBLEITC>Yes</GSTINELIGIBLEITC>
                    <INCLUDEEXPFORSLABCALC>No</INCLUDEEXPFORSLABCALC>
                    <STATEWISEDETAILS.LIST>
                        <STATENAME>&#4; Any</STATENAME>
                        <RATEDETAILS.LIST>
                        <GSTRATEDUTYHEAD>CGST</GSTRATEDUTYHEAD>
                        <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                        <GSTRATE>${cgstRate}</GSTRATE>
                        </RATEDETAILS.LIST>
                        <RATEDETAILS.LIST>
                        <GSTRATEDUTYHEAD>SGST/UTGST</GSTRATEDUTYHEAD>
                        <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                        <GSTRATE>${sgstRate}</GSTRATE>
                        </RATEDETAILS.LIST>
                        <RATEDETAILS.LIST>
                        <GSTRATEDUTYHEAD>IGST</GSTRATEDUTYHEAD>
                        <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                        <GSTRATE>${gstRate}</GSTRATE>
                        </RATEDETAILS.LIST>
                        <RATEDETAILS.LIST>
                        <GSTRATEDUTYHEAD>Cess</GSTRATEDUTYHEAD>
                        <GSTRATEVALUATIONTYPE>&#4; Not Applicable</GSTRATEVALUATIONTYPE>
                        </RATEDETAILS.LIST>
                        <RATEDETAILS.LIST>
                        <GSTRATEDUTYHEAD>State Cess</GSTRATEDUTYHEAD>
                        <GSTRATEVALUATIONTYPE>Based on Value</GSTRATEVALUATIONTYPE>
                        </RATEDETAILS.LIST>
                    </STATEWISEDETAILS.LIST>
                    </GSTDETAILS.LIST>

                    <!-- HSN DETAILS -->
                    <HSNDETAILS.LIST>
                    <APPLICABLEFROM>${applicableFrom}</APPLICABLEFROM>
                    <SRCOFHSNDETAILS>${hsnSrc}</SRCOFHSNDETAILS>
                    ${hsnCode ? `<HSNCODE>${hsnCode}</HSNCODE>` : ""}
                    </HSNDETAILS.LIST>

                </STOCKITEM>
                </TALLYMESSAGE>
            </REQUESTDATA>
            </IMPORTDATA>
        </BODY>
        </ENVELOPE>`;

    return xml;
}

