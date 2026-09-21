import {
  env,
  FeatureExtractionPipeline,
  pipeline,
  ProgressInfo,
} from "@huggingface/transformers";
import modelURL from "./model/weights.json?url";
import { WasmCache, ModelName } from "@/lib/config";
import CacheManager from "@/lib/cache";
import { FileProgress } from "@/lib/types";

let model: FeatureExtractionPipeline | undefined;
let modelData: { coef: number[]; intercept: number };
let initialized = false;

const MAX_SCORE = 10;
const MIN_SCORE = 0;

// Some initialization which needs to be done only the first time an instance is asked for
async function init(): Promise<boolean> {
  if (!initialized) {
    env.useBrowserCache = true;
    const cacheManager = new CacheManager(WasmCache.cache_source, WasmCache.cache_key, {});
    const buffer = await cacheManager.retrieve();
    if (buffer && env.backends.onnx.wasm) {
      env.backends.onnx.wasm.wasmBinary = buffer;
    } else {
      throw Error("WASM could not be retrieved.");
    }
    
    if (env.backends.onnx.wasm) env.backends.onnx.wasm.numThreads = 1;
    
    const res = await fetch(modelURL);
    modelData = await res.json();
    initialized = true;
  }
  return initialized
}


// Initialize model and download files
async function createModel(
  progress_callback?: (files_progress: FileProgress[]) => Promise<unknown> | unknown,
): Promise<void> {
  if (model) return;

  model = await pipeline("feature-extraction", ModelName, {
    dtype: "int8",
    progress_callback: async (p: ProgressInfo) => {
      if (p.status == "progress_total") {
        const files_progress: FileProgress[] = Object.entries(p.files).map((i) => {
          return { name: i[0], ...i[1] };
        });
        progress_callback && await progress_callback(files_progress);
      }
    },
  });
}

async function predict(text: string): Promise<number> {
  if (!model) {
    throw Error("Model not downloaded or initiated! Run the initiate command first.");
  }
  const { coef, intercept } = modelData;
  const output = await model(text, {
    pooling: "mean",
    normalize: true,
  });
  const embedding = Array.from(output.data);
  const score = embedding.reduce(
    (sum, val, i) => sum + val * coef[i],
    intercept,
  );
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
}

const Model = {
  init,
  createModel,
  predict,
};

export default Model;