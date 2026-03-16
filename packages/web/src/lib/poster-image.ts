const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_LENGTH = 900_000;
const MAX_DIMENSION = 1600;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read poster image."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Poster image did not produce a data URL."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to load poster image."));
    image.src = dataUrl;
  });
}

function resizeDimensions(width: number, height: number) {
  const longestSide = Math.max(width, height);
  if (longestSide <= MAX_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_DIMENSION / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function preparePosterImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Poster must be an image file.");
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Poster is too large. Please use an image under 8 MB.");
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const canvas = document.createElement("canvas");
  const dimensions = resizeDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height);

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas is unavailable for poster processing.");
  }

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const attempts: Array<{ type: string; quality?: number }> = [
    { type: "image/webp", quality: 0.86 },
    { type: "image/webp", quality: 0.76 },
    { type: "image/jpeg", quality: 0.82 },
    { type: "image/jpeg", quality: 0.7 },
  ];

  for (const attempt of attempts) {
    const dataUrl = canvas.toDataURL(attempt.type, attempt.quality);
    if (dataUrl.length <= MAX_OUTPUT_LENGTH) {
      return dataUrl;
    }
  }

  throw new Error("Poster is still too large after compression. Try a smaller image.");
}
