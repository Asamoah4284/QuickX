const aws = require('aws-sdk');
require('dotenv').config();
const AWS_ACCESS_KEY_ID = 'AKIAUGIL3O2BTE6IF7OL'

const s3 = new aws.S3({
    accessKeyId:AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'eu-north-1',
    signatureVersion: 'v4'
});

async function generateImageUrl() {
    const ImageName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.jpg`;



    const params = {
        Bucket: process.env.AWS_BUCKET_NAME || 'quickxlearn',
        Key: ImageName,
        Expires: 300, // Valid for 5 minutes
        ContentType: 'image/jpeg',
    };
    
    const uploadURL = await s3.getSignedUrlPromise('putObject', params);
    



    
    return uploadURL;
}

async function generateVideoUrl() {
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

module.exports = {
    generateImageUrl,
    generateVideoUrl,
    s3
};


