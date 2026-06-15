import { ImageManipulator, type ImageRef } from 'expo-image-manipulator';

const INPUT_SIZE = 224;

export async function preprocessImage(photoUri: string): Promise<Float32Array> {
  const image = await ImageManipulator.manipulate(photoUri)
    .resize({ width: INPUT_SIZE, height: INPUT_SIZE })
    .renderAsync();

  // In SDK 56, use the instance methods on ImageRef
  const result = await (image as any).toBase64Async({ format: 'jpeg', quality: 1 });

  const rawBytes = base64ToBytes(result);
  const normalized = normalizeImageNet(rawBytes);

  return normalized;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function normalizeImageNet(pixels: Uint8Array): Float32Array {
  const normalized = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);

  for (let i = 0; i < pixels.length && i < normalized.length; i++) {
    normalized[i] = (pixels[i] / 127.5) - 1.0;
  }

  return normalized;
}

export function getInputSize(): number {
  return INPUT_SIZE;
}
