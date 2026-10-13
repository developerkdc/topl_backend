/** Display SQM in PDFs with at most 3 decimal places (PDF output only). */
export function formatSqmForPdf(value) {
  if (value === null || value === undefined || value === '') {
    return value;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return value;
  }
  return parseFloat(num.toFixed(3));
}

let pdfHelpersRegistered = false;

export function registerPdfHandlebarsHelpers(Handlebars) {
  if (pdfHelpersRegistered) return;
  pdfHelpersRegistered = true;

  Handlebars.registerHelper('add', function (a, b) {
    return a + b;
  });

  Handlebars.registerHelper('formatSqm', function (value) {
    return formatSqmForPdf(value);
  });
}
