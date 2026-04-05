/**
 * Verifies presigned PUT (same path as /s3VideoUrl) and uploads a local file.
 * Usage: node scripts/testS3Upload.js [path/to/video.mp4]
 * Requires Backend/.env with AWS credentials and bucket.
 */
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
process.env.AWS_REQUEST_CHECKSUM_CALCULATION = 'WHEN_REQUIRED';
process.env.AWS_RESPONSE_CHECKSUM_VALIDATION = 'WHEN_REQUIRED';

const s3Config = require('../config/s3Config');

const defaultVideo = path.join(
  __dirname,
  '..',
  '..',
  'Frontend',
  'my-app',
  'public',
  'images',
  'stock.mp4'
);

async function main() {
  const filePath = path.resolve(process.argv[2] || defaultVideo);
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    process.exit(1);
  }

  const body = fs.readFileSync(filePath);
  const contentType = 'video/mp4';
  const bucket = process.env.AWS_BUCKET_NAME || 'quickxlearn';
  const region = process.env.AWS_REGION || 'eu-north-1';

  // 1) Tiny direct PutObject — if SignatureDoesNotMatch, fix .env keys (not presign/CORS).
  const directClient = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  const testKey = `credential-test-${Date.now()}.mp4`;
  try {
    await directClient.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: testKey,
        Body: body.subarray(0, Math.min(body.length, 4096)),
        ContentType: contentType,
      })
    );
    console.log('Direct PutObject OK (credentials work for this bucket/region).');
  } catch (e) {
    if (e.name === 'SignatureDoesNotMatch' || e.Code === 'SignatureDoesNotMatch') {
      console.error(
        '\n[AWS] SignatureDoesNotMatch on direct PutObject — your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY\n' +
          'in Backend/.env do not belong together (typo, extra space/quotes, or the secret was rotated).\n' +
          'Create a new access key in IAM → Users → Security credentials, update .env, restart the server.\n'
      );
      process.exit(1);
    }
    throw e;
  }

  const url = await s3Config.generateVideoUrl(contentType);
  const bad =
    url.includes('x-amz-checksum') ||
    url.includes('x-amz-sdk-checksum-algorithm') ||
    url.includes('checksum-crc');

  console.log('Presigned URL (truncated):', url.slice(0, 120) + '...');
  console.log('Contains CRC/checksum query params (should be false):', bad);
  if (bad) {
    console.error(
      '\nFix: ensure Backend/config/s3Config.js uses WHEN_REQUIRED and restart the server.\n' +
        'Also remove AWS_REQUEST_CHECKSUM_CALCULATION=when_supported from .env if present.\n'
    );
    process.exit(1);
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body,
  });

  console.log('PUT status:', res.status, res.statusText);
  if (!res.ok) {
    const text = await res.text();
    console.error('Body:', text.slice(0, 500));
    process.exit(1);
  }

  const publicUrl = url.split('?')[0];
  console.log('OK — object URL:', publicUrl);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
