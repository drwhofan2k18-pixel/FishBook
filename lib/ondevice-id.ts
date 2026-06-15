import type { IdentificationMatch } from './catch-store';
import { isModelDownloaded, getModelPath, downloadModel, getModelVersion } from './model-downloader';
import { preprocessImage } from './model-preprocessor';
import { mapOutputToSpecies, getLabelCount } from './model-mapper';

export { isModelDownloaded, onDownloadProgress, type DownloadProgress, deleteModel } from './model-downloader';

export interface OnDeviceModelInfo {
  isLoaded: boolean;
  speciesCount: number;
  modelVersion: string | null;
  modelAvailable: boolean;
}

let modelInfo: OnDeviceModelInfo = {
  isLoaded: false,
  speciesCount: 0,
  modelVersion: null,
  modelAvailable: false,
};

let tfliteModel: unknown = null;

export async function loadOnDeviceModel(): Promise<boolean> {
  try {
    const downloaded = await isModelDownloaded();
    modelInfo.modelAvailable = downloaded;

    if (!downloaded) {
      modelInfo = {
        isLoaded: false,
        speciesCount: getLabelCount(),
        modelVersion: null,
        modelAvailable: false,
      };
      return false;
    }

    const version = await getModelVersion();
    modelInfo.modelVersion = version;

    let TfliteRuntime: { loadModel: (path: string) => Promise<unknown> } | null = null;
    try {
      TfliteRuntime = require('react-native-fast-tflite');
    } catch {
      try {
        TfliteRuntime = require('@tensorflow/tfjs-react-native');
      } catch {
        TfliteRuntime = null;
      }
    }

    if (!TfliteRuntime) {
      modelInfo = {
        isLoaded: false,
        speciesCount: getLabelCount(),
        modelVersion: version,
        modelAvailable: true,
      };
      return false;
    }

    tfliteModel = await TfliteRuntime.loadModel(getModelPath());

    modelInfo = {
      isLoaded: true,
      speciesCount: getLabelCount(),
      modelVersion: version,
      modelAvailable: true,
    };

    return true;
  } catch (err) {
    console.error('Failed to load on-device model:', err);
    modelInfo = {
      isLoaded: false,
      speciesCount: 0,
      modelVersion: null,
      modelAvailable: false,
    };
    tfliteModel = null;
    return false;
  }
}

export async function identifyFishOnDevice(
  photoUri: string,
): Promise<{ matches: IdentificationMatch[]; error: string | null }> {
  if (!modelInfo.isLoaded || !tfliteModel) {
    if (modelInfo.modelAvailable && !modelInfo.isLoaded) {
      return {
        matches: [],
        error: 'Model downloaded but runtime not available. Install react-native-fast-tflite.',
      };
    }
    return {
      matches: [],
      error: 'On-device model not loaded. Download the model in settings.',
    };
  }

  try {
    const inputTensor = await preprocessImage(photoUri);

    const outputTensor = await runInference(inputTensor);
    if (!outputTensor) {
      return { matches: [], error: 'Inference returned no output' };
    }

    const matches = await mapOutputToSpecies(outputTensor as Float32Array, 3);

    if (matches.length === 0) {
      return { matches: [], error: 'No species recognized. Try a clearer photo.' };
    }

    return { matches, error: null };
  } catch (err) {
    return {
      matches: [],
      error: err instanceof Error ? err.message : 'Inference failed',
    };
  }
}

async function runInference(inputTensor: Float32Array): Promise<Float32Array | null> {
  if (!tfliteModel) return null;

  try {
    const model = tfliteModel as { run: (input: Float32Array) => Promise<Float32Array[] | Float32Array> };
    const output = await model.run(inputTensor);

    if (output instanceof Float32Array) {
      return output;
    }
    if (Array.isArray(output) && output.length > 0) {
      return output[0] instanceof Float32Array ? output[0] : new Float32Array(output[0] as number[]);
    }

    return null;
  } catch {
    return null;
  }
}

export function getOnDeviceModelInfo(): OnDeviceModelInfo {
  return { ...modelInfo };
}

export async function downloadOnDeviceModel(modelUrl?: string): Promise<boolean> {
  const success = await downloadModel(modelUrl);
  if (success) {
    await loadOnDeviceModel();
  }
  return success;
}

export function isModelReady(): boolean {
  return modelInfo.isLoaded;
}

export function isModelAvailable(): boolean {
  return modelInfo.modelAvailable;
}
