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

  const browser = await puppeteer.launch();
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

export async function generatePDF({ templateName, templatePath, data }) {
  const templateContent = await fs.readFile(templatePath, 'utf8');
  const logoPath = path.join(__dirname, '..', '..', 'views', 'images', 'topl_logo.png');
  const logoBuffer = await fs.readFile(logoPath);
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  Handlebars.registerHelper('add', function (a, b) {
    return a + b;
  });
  const template = Handlebars.compile(templateContent);
  const html = template({ ...data, logoUrl: logoBase64, });

  const browser = await puppeteer.launch();
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
