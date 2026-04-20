import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn('[r2] Missing R2 env vars — uploads and signed URLs will fail.');
}

export const r2Bucket = R2_BUCKET ?? '';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: R2_SECRET_ACCESS_KEY ?? '',
  },
});

export async function r2Upload(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType?: string,
): Promise<void> {
  const bodyBytes =
    body instanceof Blob ? new Uint8Array(await body.arrayBuffer()) : body;
  await r2.send(
    new PutObjectCommand({
      Bucket: r2Bucket,
      Key: key,
      Body: bodyBytes,
      ContentType: contentType,
    }),
  );
}

export async function r2Download(key: string): Promise<Buffer> {
  const res = await r2.send(new GetObjectCommand({ Bucket: r2Bucket, Key: key }));
  const bytes = await res.Body!.transformToByteArray();
  return Buffer.from(bytes);
}

export async function r2Delete(key: string): Promise<void> {
  await r2.send(new DeleteObjectCommand({ Bucket: r2Bucket, Key: key }));
}

export async function r2SignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: r2Bucket, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}
