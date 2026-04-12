import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ReportPhotoItem {
  name: string | null;
  object_key: string;
  signedUrl: string;
  caption: string | null;
  lat: number | null;
  lon: number | null;
  created_at: string;
}

export interface ReportPdfData {
  title: string;
  projectName: string;
  orgName: string;
  createdAt: string;
  photos: ReportPhotoItem[];
}

const AMBER: [number, number, number] = [0.988, 0.631, 0.078]; // amber-500
const INK: [number, number, number] = [0.11, 0.11, 0.15];
const MUTED: [number, number, number] = [0.45, 0.45, 0.5];
const RULE: [number, number, number] = [0.85, 0.85, 0.9];

// Letter size in points
const W = 612;
const H = 792;
const MARGIN = 36;

export async function generateReportPdf(data: ReportPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // ── Cover page ──────────────────────────────────────────────────────────────
  const cover = doc.addPage([W, H]);

  // Amber header bar
  cover.drawRectangle({ x: 0, y: H - 80, width: W, height: 80, color: rgb(...AMBER) });
  cover.drawText('CaptureWork', { x: MARGIN, y: H - 52, size: 28, font: bold, color: rgb(1, 1, 1) });

  // Project + report title
  cover.drawText(data.projectName, {
    x: MARGIN, y: H - 160, size: 22, font: bold, color: rgb(...INK), maxWidth: W - MARGIN * 2,
  });
  cover.drawText(data.title, {
    x: MARGIN, y: H - 196, size: 14, font: regular, color: rgb(0.28, 0.28, 0.35), maxWidth: W - MARGIN * 2,
  });

  // Date
  const dateStr = new Date(data.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  cover.drawText(dateStr, { x: MARGIN, y: H - 230, size: 11, font: regular, color: rgb(...MUTED) });

  // Footer
  cover.drawText(data.orgName, { x: MARGIN, y: 40, size: 10, font: regular, color: rgb(...MUTED) });
  const countStr = `${data.photos.length} photo${data.photos.length !== 1 ? 's' : ''}`;
  cover.drawText(countStr, { x: W - MARGIN - 60, y: 40, size: 10, font: regular, color: rgb(...MUTED) });

  // ── Photo pages ──────────────────────────────────────────────────────────────
  const FOOTER_H = 100;
  const IMG_AREA_H = H - FOOTER_H - 20;

  for (let i = 0; i < data.photos.length; i++) {
    const photo = data.photos[i];
    const page = doc.addPage([W, H]);

    // Embed image
    try {
      const res = await fetch(photo.signedUrl);
      const imgBytes = await res.arrayBuffer();

      const key = photo.object_key.toLowerCase();
      const img = key.endsWith('.png')
        ? await doc.embedPng(imgBytes)
        : await doc.embedJpg(imgBytes);

      const { width: iw, height: ih } = img.size();
      const scale = Math.min((W - MARGIN * 2) / iw, IMG_AREA_H / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const x = (W - dw) / 2;
      const y = FOOTER_H + 10 + (IMG_AREA_H - dh) / 2;

      page.drawImage(img, { x, y, width: dw, height: dh });
    } catch {
      page.drawRectangle({
        x: MARGIN, y: FOOTER_H + 10, width: W - MARGIN * 2, height: IMG_AREA_H - 10,
        color: rgb(0.94, 0.94, 0.96),
      });
      page.drawText('Image unavailable', {
        x: W / 2 - 55, y: H / 2, size: 12, font: regular, color: rgb(0.6, 0.6, 0.65),
      });
    }

    // Footer rule
    page.drawLine({
      start: { x: MARGIN, y: FOOTER_H },
      end: { x: W - MARGIN, y: FOOTER_H },
      thickness: 0.5,
      color: rgb(...RULE),
    });

    // Photo name
    page.drawText(photo.name ?? `Photo ${i + 1}`, {
      x: MARGIN, y: FOOTER_H - 18, size: 10, font: bold, color: rgb(...INK), maxWidth: W - MARGIN * 2 - 60,
    });

    // Caption
    if (photo.caption) {
      page.drawText(photo.caption, {
        x: MARGIN, y: FOOTER_H - 34, size: 9, font: regular, color: rgb(0.35, 0.35, 0.4), maxWidth: W - MARGIN * 2 - 60,
      });
    }

    // GPS
    if (photo.lat != null && photo.lon != null) {
      page.drawText(`GPS: ${Number(photo.lat).toFixed(5)}, ${Number(photo.lon).toFixed(5)}`, {
        x: MARGIN, y: FOOTER_H - 52, size: 8, font: regular, color: rgb(...MUTED),
      });
    }

    // Timestamp
    page.drawText(new Date(photo.created_at).toLocaleString('en-US'), {
      x: MARGIN, y: FOOTER_H - 66, size: 8, font: regular, color: rgb(...MUTED),
    });

    // Page number (bottom right)
    page.drawText(`${i + 1} / ${data.photos.length}`, {
      x: W - MARGIN - 40, y: 18, size: 8, font: regular, color: rgb(...MUTED),
    });
  }

  return doc.save();
}
