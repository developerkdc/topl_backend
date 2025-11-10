import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  const browser = await puppeteer.launch({
    // executablePath: '/home/ubuntu/chrome/linux-141.0.7390.76/chrome-linux64/chrome',
    // headless: true, have to check if works on server
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
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

  await browser.close();
  return pdfBuffer;
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

  const browser = await puppeteer.launch({
    // executablePath: '/home/ubuntu/chrome/linux-141.0.7390.76/chrome-linux64/chrome',
    // headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
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

  await browser.close();
  return pdfBuffer;
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

  const browser = await puppeteer.launch({
    // executablePath: '/home/ubuntu/chrome/linux-141.0.7390.76/chrome-linux64/chrome',
    // headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
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

  await browser.close();
  return pdfBuffer;
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

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
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

  await browser.close();
  return pdfBuffer;
}