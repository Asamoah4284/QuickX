const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-north-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED"
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

async function generateVideoUrl() {
    try {
        const VideoName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.mp4`;
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME || 'quickxlearn',
            Key: VideoName,
            ContentType: 'video/mp4'
        });

        const uploadURL = await getSignedUrl(s3Client, command, { expiresIn: 300 });
        console.log(`[S3] Signed PUT URL generated for video: ${VideoName}`);
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
