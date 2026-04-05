import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

function getPublicUrlFromSignedUrl(url) {
  return url.split('?')[0];
}

export async function uploadFileToS3({ file, token, type = 'image', onProgress }) {
  if (!file) {
    return '';
  }

  const endpoint = type === 'video' ? '/s3VideoUrl' : '/s3Url';
  const { data } = await axios.get(`${API_URL}${endpoint}`, {
    params: { contentType: file.type || (type === 'video' ? 'video/mp4' : 'image/jpeg') },
    headers: getHeaders(token),
  });

  await axios.put(data.url, file, {
    headers: {
      'Content-Type': file.type || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
    },
    onUploadProgress: (event) => {
      if (!onProgress || !event.total) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });

  return getPublicUrlFromSignedUrl(data.url);
}
