import { Cache } from "./types";

const ModelName = "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
const TransformerCacheKey = "transformers-cache";
const WasmCache: Cache = {
    cache_key: TransformerCacheKey,
    cache_source:
        "https://huggingface.co/buckets/kulinsoni/skia/resolve/ort-wasm-simd-threaded.asyncify.wasm?download=true",
    cache_params: {
        headers: {
            "Accept-Encoding": "identity",
            "Access-Control-Expose-Headers": "Content-Disposition"
        },
    },
};
const CacheFiles: Cache[] = [WasmCache];

export {
    ModelName,
    TransformerCacheKey,
    WasmCache,
    CacheFiles,
};
