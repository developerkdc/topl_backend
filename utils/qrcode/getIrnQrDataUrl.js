import { qrcode } from "qrcode-generator";

/**
 * Generate a QR code data URL from string content using qrcode-generator.
 * Used for IRN SignedQRCode in dispatch invoice and e-way bill PDFs.
 * @param {string} qrContent - Content to encode (e.g. IRN QR URL)
 * @returns {string|null} Data URL for the QR image, or null if invalid
 */
export function getIrnQrDataUrl(qrContent) {
    if (!qrContent || typeof qrContent !== 'string') return null;
    try {
        const qr = qrcode(0, 'L');
        qr.addData(qrContent);
        qr.make();
        return qr.createDataURL(4, 2);
    } catch {
        return null;
    }
}
