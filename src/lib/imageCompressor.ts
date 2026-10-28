/**
 * Client-side image compressor for smaller profile and receipt images.
 */
export async function compressImage(file: File, maxSizeBytes = 450 * 1024, maxDimension = 900): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // If not an image, reject
    if (!file.type.startsWith('image/')) {
      reject(new Error('Uploaded file is not an image'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Scale down proportionally if exceeding maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve(file); // fallback
          return;
        }

        // Draw and compress iteratively
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;

        const attemptCompression = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve(file);
                return;
              }
              if (blob.size <= maxSizeBytes || q <= 0.3) {
                resolve(blob);
              } else {
                attemptCompression(q - 0.15);
              }
            },
            'image/jpeg',
            q
          );
        };

        attemptCompression(quality);
      };

      img.onerror = (err) => reject(err);
    };

    reader.onerror = (err) => reject(err);
  });
}

/** Compress a small profile thumbnail and return it as a data URL for Firestore. */
export async function compressImageToDataUrl(
  file: File,
  maxSizeBytes = 32 * 1024,
  maxDimension = 320,
): Promise<string> {
  const compressed = await compressImage(file, maxSizeBytes, maxDimension);
  if (compressed.size > maxSizeBytes) {
    throw new Error('Could not compress this photo small enough. Please choose a smaller image.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not read the compressed photo. Please try another image.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Could not read the compressed photo.'));
    reader.readAsDataURL(compressed);
  });
}
