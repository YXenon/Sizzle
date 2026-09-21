import { FileProgress } from "./types";

class CacheManager {
    private url: string;
    private cache_key: string;
    private params: RequestInit;
    private data: ArrayBuffer | undefined;

    constructor(url: string, cache_key: string, params: RequestInit) {
        this.url = url;
        this.cache_key = cache_key;
        this.params = params;
    }

    private async _download(
        url: string,
        progress_callback?: (progress: FileProgress) => Promise<any> | any,
    ) {
        const res = await fetch(url, this.params);
        if (!res.ok) throw new Error("Failed to load file!");

        const total = Number(res.headers.get("content-length") || 0);
        const disposition = res.headers.get("Content-Disposition");
        let filename = "resource.sizzle"
        if (disposition && disposition.includes("filename")) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
            if (match && match[1]) {
            filename = decodeURIComponent(match[1]);
            }
        }
        const reader = res.body!.getReader();
        let loaded = 0;
        const chunks: Uint8Array<ArrayBuffer>[] = [];

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.length;
            progress_callback &&
                (await progress_callback({
                    name: filename,
                    loaded: loaded,
                    total: total,
                }));
        }
        return new Response(new Blob(chunks));
    }

    async save(
        progress_callback?: (file_progress: FileProgress) => Promise<any> | any,
    ) {
        if (await this.retrieve() !== null) {
            return
        }
        const cache = await caches.open(this.cache_key);
        const data = await this._download(this.url, async (p) => {
            progress_callback && (await progress_callback(p));
        });
        if (data) {
            await cache.put(this.url, data);
        } else {
            throw Error(`Couldn't fetch files for key: ${this.cache_key}`);
        }
    }

    async retrieve(): Promise<ArrayBuffer | null> {
        const cache = await caches.open(this.cache_key);
        const response = await cache.match(this.url);
        if (!response) return null;
        if (this.data) return this.data;

        this.data = await response.arrayBuffer();
        return this.data;
    }
}

export default CacheManager;
