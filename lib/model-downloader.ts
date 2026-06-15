import { File, Directory, Paths } from 'expo-file-system';

const MODEL_DIR_NAME = 'models';
const MODEL_FILE_NAME = 'fish-classifier.tflite';
const VERSION_FILE_NAME = 'model-version.json';

const DEFAULT_MODEL_URL = process.env.EXPO_PUBLIC_TFLITE_MODEL_URL ?? '';
const DEFAULT_MODEL_VERSION = '0.1.0';

function getModelDir(): Directory {
  return new Directory(Paths.document, MODEL_DIR_NAME);
}

function getModelFile(): File {
  return new File(Paths.document, MODEL_DIR_NAME, MODEL_FILE_NAME);
}

function getVersionFile(): File {
  return new File(Paths.document, MODEL_DIR_NAME, VERSION_FILE_NAME);
}

export interface DownloadProgress {
  totalBytes: number;
  downloadedBytes: number;
  percent: number;
}

type ProgressListener = (progress: DownloadProgress) => void;
const progressListeners = new Set<ProgressListener>();

export function onDownloadProgress(listener: ProgressListener) {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
}

function notifyProgress(progress: DownloadProgress) {
  for (const listener of progressListeners) {
    listener(progress);
  }
}

function ensureModelDir() {
  const dir = getModelDir();
  if (!dir.exists) {
    dir.create();
  }
}

export async function isModelDownloaded(): Promise<boolean> {
  try {
    return getModelFile().exists;
  } catch {
    return false;
  }
}

export async function getModelVersion(): Promise<string | null> {
  try {
    const versionFile = getVersionFile();
    if (!versionFile.exists) return null;
    const content = versionFile.textSync();
    const parsed = JSON.parse(content) as { version: string };
    return parsed.version;
  } catch {
    return null;
  }
}

export async function downloadModel(
  modelUrl?: string,
  expectedVersion?: string,
): Promise<boolean> {
  const url = modelUrl || DEFAULT_MODEL_URL;
  if (!url) return false;

  try {
    ensureModelDir();

    const remoteVersion = expectedVersion || DEFAULT_MODEL_VERSION;
    const localVersion = await getModelVersion();

    if (localVersion === remoteVersion && (await isModelDownloaded())) {
      return true;
    }

    notifyProgress({ totalBytes: 0, downloadedBytes: 0, percent: 0 });

    const response = await fetch(url);
    if (!response.ok) return false;

    const contentLength = parseInt(response.headers.get('content-length') ?? '0', 10);
    const reader = response.body?.getReader();
    if (!reader) return false;

    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
        notifyProgress({
          totalBytes: contentLength,
          downloadedBytes: received,
          percent: contentLength > 0 ? received / contentLength : 0,
        });
      }
    }

    const totalBuffer = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      totalBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    const modelFile = getModelFile();
    modelFile.write(totalBuffer);

    const versionFile = getVersionFile();
    versionFile.write(JSON.stringify({
      version: remoteVersion,
      downloaded_at: new Date().toISOString(),
    }));

    return true;
  } catch (err) {
    console.error('Model download failed:', err);
    return false;
  }
}

export async function deleteModel(): Promise<void> {
  try {
    const dir = getModelDir();
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // silent
  }
}

export function getModelPath(): string {
  return getModelFile().uri;
}
