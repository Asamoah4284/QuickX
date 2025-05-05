const aws = require('aws-sdk');
require('dotenv').config();


const s3 = new aws.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'eu-north-1',
    signatureVersion: 'v4'
});

async function generateImageUrl() {
    const ImageName = `${Date.now()}-${Math.random().toString(40).substring(2, 12)}.jpg`;



    const params = {
        Bucket: 'quickxlearn',
        Key: ImageName,
        Expires: 300, // Valid for 5 minutes
        ContentType: 'image/jpeg',
    };
    const uploadURL = await s3.getSignedUrlPromise('putObject', params);
    console.log('Upload URL:', uploadURL);
    console.log('Uploading to bucket:', process.env.AWS_BUCKET_NAME);
    console.log('Params:', params);
    

    return uploadURL;
}

async function generateVideoUrl() {
    const VideoName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.mp4`;
    const params = {
        Bucket:  'quickxlearn',
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


