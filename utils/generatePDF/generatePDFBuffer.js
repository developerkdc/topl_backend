import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Shared browser instance (launch once, reuse for all PDFs)
const BROWSER_LAUNCH_OPTS = {
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
};

let sharedBrowser = null;

async function getBrowser() {
  if (sharedBrowser && sharedBrowser.connected) {
    return sharedBrowser;
  }
  if (sharedBrowser) {
    try {
      sharedBrowser.close();
    } catch (_) {}
    sharedBrowser = null;
  }
  sharedBrowser = await puppeteer.launch(BROWSER_LAUNCH_OPTS);
  return sharedBrowser;
}

/** Call to close the shared browser (e.g. on app shutdown). */
export async function closePDFBrowser() {
  if (sharedBrowser) {
    try {
      await sharedBrowser.close();
    } catch (_) {}
    sharedBrowser = null;
  }
}

export default async function generatePDFBuffer({ templateName, data }) {
  const templatePath = path.join(
    __dirname,
    '..',
    '..',
    'views',
    `${templateName}.hbs`
  );
  const templateContent = await fs.readFile(templatePath, 'utf8');
  const logoPath = path.join(
    __dirname,
    '..',
    '..',
    'views',
    'images',
    'topl_logo.png'
  );
  const logoBuffer = await fs.readFile(logoPath);
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  Handlebars.registerHelper('add', function (a, b) {
    return a + b;
  });
  const template = Handlebars.compile(templateContent);
  const html = template({ ...data, logoUrl: logoBase64 });

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    // Adjust zoom / scale before generating the PDF
    await page.emulateMediaType('screen');

    // Force consistent font rendering scale
    await page.addStyleTag({
      content: `
    html, body {
      font-size: 16px !important;
      zoom: 1;
      transform: scale(0.9);
      transform-origin: top center; 
      width: 100%; 
      margin: 0 auto;
    }
  `
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '30px',
        bottom: '30px',
        left: '10px',
        right: '10px',
      },
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

export async function generatePDF({ templateName, templatePath, data }) {
  const templateContent = await fs.readFile(templatePath, 'utf8');
  const logoPath = path.join(__dirname, '..', '..', 'views', 'images', 'topl_logo.png');
  const headerPath = path.join(__dirname, '..', '..', 'views', 'images', 'HEADER.png');
  const footerPath = path.join(__dirname, '..', '..', 'views', 'images', 'FOOTER.png');
  const logoBuffer = await fs.readFile(logoPath);
  const headerBuffer = await fs.readFile(headerPath);
  const footerBuffer = await fs.readFile(footerPath);
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  const headerBase64 = `data:image/png;base64,${headerBuffer.toString('base64')}`;
  const footerBase64 = `data:image/png;base64,${footerBuffer.toString('base64')}`;
  Handlebars.registerHelper('add', function (a, b) {
    return a + b;
  });
  const template = Handlebars.compile(templateContent);
  const html = template({ ...data, logoUrl: logoBase64, headerUrl: headerBase64, footerUrl: footerBase64 });

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '50px',
        bottom: '50px',
        left: '20px',
        right: '20px',
      },
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

export async function generatePDF_packing({ templateName, templatePath, data }) {
  const templateContent = await fs.readFile(templatePath, 'utf8');
  const logoPath = path.join(__dirname, '..', '..', 'views', 'images', 'topl_logo.png');
  const headerPath = path.join(__dirname, '..', '..', 'views', 'images', 'HEADER.png');
  const footerPath = path.join(__dirname, '..', '..', 'views', 'images', 'FOOTER.png');
  const logoBuffer = await fs.readFile(logoPath);
  const headerBuffer = await fs.readFile(headerPath);
  const footerBuffer = await fs.readFile(footerPath);
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  const headerBase64 = `data:image/png;base64,${headerBuffer.toString('base64')}`;
  const footerBase64 = `data:image/png;base64,${footerBuffer.toString('base64')}`;
  Handlebars.registerHelper('add', function (a, b) {
    return a + b;
  });
  const template = Handlebars.compile(templateContent);
  const html = template({ ...data, logoUrl: logoBase64, headerUrl: headerBase64, footerUrl: footerBase64 });

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      // margin: {
      //   top: '50px',
      //   bottom: '50px',
      //   left: '20px',
      //   right: '20px',
      // },
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

export async function generatePackingPDF({ templateName, templatePath, data }) {
  // Load template and image files
  const templateContent = await fs.readFile(templatePath, 'utf8');
  const logoPath = path.join(__dirname, '..', '..', 'views', 'images', 'topl_logo.png');
  const headerPath = path.join(__dirname, '..', '..', 'views', 'images', 'HEADER.png');
  const footerPath = path.join(__dirname, '..', '..', 'views', 'images', 'FOOTER.png');

  const logoBuffer = await fs.readFile(logoPath);
  const headerBuffer = await fs.readFile(headerPath);
  const footerBuffer = await fs.readFile(footerPath);

  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  const headerBase64 = `data:image/png;base64,${headerBuffer.toString('base64')}`;
  const footerBase64 = `data:image/png;base64,${footerBuffer.toString('base64')}`;

  // Register helper
  Handlebars.registerHelper('add', (a, b) => a + b);

  // Compile Handlebars HTML
  const template = Handlebars.compile(templateContent);
  const html = template({
    ...data,
    logoUrl: logoBase64,
    headerUrl: headerBase64,
    footerUrl: footerBase64,
  });

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: '160px',
        bottom: '80px',
        left: '10px',
        right: '30px',
      },
      headerTemplate: `
      <div style="width:100%; text-align:center; font-size:0; margin-top:-10px;">
        <img src="${headerBase64}" style="width:100%; height:auto;" />
      </div>
    `,
      footerTemplate: `
      <div style="width:100%; text-align:center; font-size:0; margin-bottom:-10px;">
        <img src="${footerBase64}" style="width:100%; height:auto;" />
      </div>
    `,
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}

export async function generatePrintPDF({ templateName, templatePath, data }) {
  // Load template and logo
  const templateContent = await fs.readFile(templatePath, 'utf8');
  const logoPath = path.join(__dirname, '..', '..', 'views', 'images', 'topl_logo.png');

  const logoBuffer = await fs.readFile(logoPath);
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;

  // Register helper
  Handlebars.registerHelper('add', (a, b) => a + b);

  // Compile Handlebars HTML
  const template = Handlebars.compile(templateContent);
  const html = template({
    ...data,
    logoUrl: logoBase64,
    // Removed headerUrl & footerUrl
  });

  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: '160px',
        bottom: '80px',
        left: '10px',
        right: '30px',
      },
      // Empty header & footer (no images)
      headerTemplate: `
      <div style="width:100%; text-align:center; font-size:10px;">
      </div>
    `,
      footerTemplate: `
      <div style="width:100%; text-align:center; font-size:10px;">
      </div>
    `,
    });
    return pdfBuffer;
  } finally {
    await page.close();
  }
}
