import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { r2Download, r2Upload } from './r2';

export interface WatermarkJob {
  photoId: string;
  objectKey: string;
  orgId: string;
  lat: number | null;
  lon: number | null;
  createdAt: string;
}

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function processWatermark(job: WatermarkJob): Promise<void> {
  const { photoId, objectKey, orgId, lat, lon, createdAt } = job;
  const svc = makeServiceClient();

  // Only watermark for Pro / Trial orgs
  const { data: orgPlan } = await svc
    .from('_v_org_plan')
    .select('effective_plan')
    .eq('org_id', orgId)
    .single<{ effective_plan: string }>();

  if (!orgPlan || orgPlan.effective_plan === 'basic') return;

  // Download original from R2
  let buffer: Buffer;
  try {
    buffer = await r2Download(objectKey);
  } catch (dlErr) {
    console.error('[watermark] download failed', dlErr);
    return;
  }

  // Build overlay text
  const ts = new Date(createdAt).toLocaleString('en-US', { timeZone: 'UTC' });
  const gps = lat != null && lon != null
    ? `${Number(lat).toFixed(5)}, ${Number(lon).toFixed(5)}`
    : null;
  const text = [gps, ts].filter(Boolean).join('   |   ');

  // Measure image to size the bar proportionally
  const meta = await sharp(buffer).metadata();
  const imgW = meta.width ?? 1280;
  const barH = Math.max(28, Math.round(imgW * 0.045));
  const fontSize = Math.max(11, Math.round(barH * 0.44));
  const safeText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // SVG semi-transparent bar composited onto the bottom of the image
  const svg = Buffer.from(`
    <svg width="${imgW}" height="${barH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${imgW}" height="${barH}" fill="rgba(0,0,0,0.62)"/>
      <text
        x="10" y="${barH - Math.round(barH * 0.22)}"
        font-family="Arial, Helvetica, sans-serif"
        font-size="${fontSize}"
        fill="white"
        font-weight="500"
      >${safeText}</text>
    </svg>`);

  const watermarked = await sharp(buffer)
    .composite([{ input: svg, gravity: 'south' }])
    .jpeg({ quality: 88 })
    .toBuffer();

  // Upload watermarked version alongside original (wm/ prefix)
  const wmKey = `wm/${objectKey}`;
  try {
    await r2Upload(wmKey, watermarked, 'image/jpeg');
  } catch (upErr) {
    console.error('[watermark] upload failed', upErr);
    return;
  }

  // Update photo record to point at watermarked file
  await svc
    .from('photos')
    .update({ upload_status: 'watermarked', object_key: wmKey })
    .eq('id', photoId);
}
