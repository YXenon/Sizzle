// setup.ts
import Model from "./model";
import { ConnectionStates, FileProgress } from "@/lib/types";
import { CacheFiles } from "@/lib/config";
import { LocalStorage } from "@/lib/storage";
import CacheManager from "@/lib/cache";
import { MessageAction, sendRuntimeNotification } from "../messaging";

async function reportProgress(
    file_progress: FileProgress | FileProgress[],
): Promise<void> {
    await sendRuntimeNotification(MessageAction.SetupProgress, {
        files: Array.isArray(file_progress) ? file_progress : [file_progress],
    });
}

async function downloadModel(): Promise<void> {
    await Model.init();
    await Model.createModel(reportProgress);
}

async function downloadCacheFiles(): Promise<void> {
    for (const file of CacheFiles) {
        const cacheManager = new CacheManager(
            file.cache_source,
            file.cache_key,
            file.cache_params ?? {},
        );
        await cacheManager.save((p) => reportProgress(p));
    }
}

async function isIncompleteDownload(): Promise<boolean> {
    const { connection_state } = await LocalStorage.get([
        "connection_state",
    ]);
    return (
        connection_state !== ConnectionStates.Completed
    );
}

async function clearCaches(): Promise<void> {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
}

async function download(): Promise<void> {
    await LocalStorage.set({ connection_state: ConnectionStates.Started });

    if (await isIncompleteDownload()) {
        await clearCaches();
    }

    await downloadCacheFiles();
    await downloadModel();

    await LocalStorage.set({
        connection_state: ConnectionStates.Completed,
    });
    await sendRuntimeNotification(MessageAction.SetupComplete);
}

const Setup = {
    reportProgress,
    downloadModel,
    downloadCacheFiles,
    download
}

export default Setup;