const IMGBB_API_KEY = 'c801a65662b845829fe6097c3b1e96f0';
const FREEIMAGE_API_KEY = '6d207e02198a847aa98d0a2a901485a5';

/**
 * Helper to upload to Chevereto-based APIs (ImgBB, Freeimage.host)
 */
const uploadToService = async (url: string, formData: FormData): Promise<string> => {
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'multipart/form-data',
    },
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Upload failed');
  }
  return data.data.display_url;
};

/**
 * Uploads an image from a local URI to ImgBB AND Freeimage.host for backup sync.
 * @param uri The local URI of the image
 * @returns The public download URL of the primary uploaded image
 */
export const uploadImage = async (uri: string, _path?: string): Promise<string> => {
  try {
    const formData = new FormData();
    const filename = uri.split('/').pop() || `img_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    formData.append('image', { uri, name: filename, type } as any);

    // Fire both uploads simultaneously
    const imgbbPromise = uploadToService(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, formData);
    const freeimagePromise = uploadToService(`https://freeimage.host/api/1/upload?key=${FREEIMAGE_API_KEY}`, formData);

    const results = await Promise.allSettled([imgbbPromise, freeimagePromise]);

    const imgbbResult = results[0];
    const freeimageResult = results[1];

    if (imgbbResult.status === 'fulfilled') {
      // Primary succeeded
      if (freeimageResult.status === 'rejected') {
        console.warn('Backup sync to Freeimage.host failed, but primary succeeded.', freeimageResult.reason);
      }
      return imgbbResult.value;
    } else if (freeimageResult.status === 'fulfilled') {
      // Primary failed, but backup succeeded
      console.warn('Primary ImgBB upload failed, falling back to Freeimage.host.', imgbbResult.reason);
      return freeimageResult.value;
    } else {
      // Both failed
      throw new Error(`Both image clouds failed. ImgBB: ${imgbbResult.reason}, Freeimage: ${freeimageResult.reason}`);
    }
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
};
