import aws from 'aws-sdk';

import dotenv from 'dotenv';

dotenv.config();


const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    signatureVersion: 'v4'
});


export async function generateImageUrl() {
    const ImageName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME || 'quickxlearn',
        Key: ImageName,
        Expires: 60 * 5,
        ContentType: 'image/jpeg'
    };
    
    const uploadURL = await s3.getSignedUrlPromise('putObject', params);
    
    return uploadURL;
}

export async function generateVideoUrl() {
    const VideoName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.mp4`;
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME || 'quickxlearn',
        Key: VideoName,
        Expires: 60 * 5,
        ContentType: 'video/mp4'
    };

    const uploadURL = await s3.getSignedUrlPromise('putObject', params);    
    
    return uploadURL;
}


