const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

// If .env sets AWS_REQUEST_CHECKSUM_CALCULATION=when_supported, presigned PutObject URLs
// include CRC32 query params and browser uploads get 403 — force safe mode after dotenv.
process.env.AWS_REQUEST_CHECKSUM_CALCULATION = 'WHEN_REQUIRED';
process.env.AWS_RESPONSE_CHECKSUM_VALIDATION = 'WHEN_REQUIRED';

// AWS SDK v3 defaults to WHEN_SUPPORTED and adds CRC32 to PutObject presigned URLs.
// Browsers cannot send matching x-amz-checksum-* headers → 403. Use WHEN_REQUIRED so
// optional request checksums are omitted for operations that do not require them.
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
});

async function generateImageUrl(contentType = 'image/jpeg') {
    try {
        const extension = contentType.split('/')[1] || 'jpg';
        const ImageName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${extension}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME || 'quickxlearn',
            Key: ImageName,
            ContentType: contentType,
        });

        const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        console.log(`[S3] Signed PUT URL generated for image: ${ImageName}`);
        return uploadURL;
    } catch (error) {
        console.error('[S3] Error generating signed PUT URL for image:', error);
        throw error;
    }
}

/** Must match what the browser sends on PUT (file.type) or uploads get 403. */
const VIDEO_MIME_TO_EXT = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'video/x-matroska': 'mkv',
    'video/ogg': 'ogv',
};

const ALLOWED_VIDEO_MIMES = new Set(Object.keys(VIDEO_MIME_TO_EXT));

function normalizeVideoContentType(raw) {
    if (typeof raw !== 'string' || !raw.startsWith('video/')) {
        return 'video/mp4';
    }
    const lower = raw.toLowerCase().split(';')[0].trim();
    return ALLOWED_VIDEO_MIMES.has(lower) ? lower : 'video/mp4';
}

function videoFileExtension(contentType) {
    return VIDEO_MIME_TO_EXT[contentType] || 'mp4';
}

async function generateVideoUrl(contentType = 'video/mp4') {
    try {
        const ct = normalizeVideoContentType(contentType);
        const ext = videoFileExtension(ct);
        const VideoName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${ext}`;
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME || 'quickxlearn',
            Key: VideoName,
            ContentType: ct,
        });

        const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        console.log(`[S3] Signed PUT URL generated for video: ${VideoName} (${ct})`);
        return uploadURL;
    } catch (error) {
        console.error('[S3] Error generating signed PUT URL for video:', error);
        throw error;
    }
}

module.exports = {
    generateImageUrl,
    generateVideoUrl,
    s3: s3Client // For legacy compatibility if needed
};
