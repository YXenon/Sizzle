// storage.ts
import Browser, { Storage } from "webextension-polyfill";
import { z } from "zod";
import { ConnectionStates } from "./types";

const LocalStorageSchema = z.object({
  sizzle_enabled: z.boolean(),
  sizzle_threshold: z.number(),
  onboarding: z.boolean(),
  connection_state: z.enum(ConnectionStates),
});

const SessionStorageSchema = z.object({});

export type LocalStorageProps = Partial<z.infer<typeof LocalStorageSchema>>;
export type LocalStorageKeys = keyof LocalStorageProps;

export type SessionStorageProps = Partial<z.infer<typeof SessionStorageSchema>>;
export type SessionStorageKeys = keyof SessionStorageProps;

export type StorageChanges<Props> = {
  [K in keyof Props]?: { oldValue?: Props[K]; newValue?: Props[K] };
};

function isContextValid(): boolean {
  try {
    if (typeof Browser !== "undefined" && Browser.runtime) {
      return Boolean(Browser.runtime.id);
    }
    if (typeof Browser !== "undefined" && Browser.runtime) {
      return Boolean(Browser.runtime.id);
    }
    return false;
  } catch {
    return false;
  }
}

class StorageArea<Props extends Record<string, unknown>> {
  constructor(private readonly area: Storage.StorageArea, private readonly areaName: "local" | "session",) {}

  async get(items: Partial<Props> | (keyof Props)[]): Promise<Partial<Props>> {
    if (!isContextValid()) {
      return (Array.isArray(items) ? {} : items) as Partial<Props>;
    }
    try {
      return (await this.area.get(items as string[] | Record<string, unknown>)) as Partial<Props>;
    } catch {
      return (Array.isArray(items) ? {} : items) as Partial<Props>;
    }
  }

  async set(items: Partial<Props>): Promise<void> {
    if (!isContextValid()) return;
    try {
      await this.area.set(items);
    } catch {
      // Gracefully handle context invalidation
    }
  }

  async remove(items: (keyof Props)[]): Promise<void> {
    if (!isContextValid()) return;
    try {
      await this.area.remove(items as string[]);
    } catch {
      // Gracefully handle context invalidation
    }
  }

  async clear(): Promise<void> {
    if (!isContextValid()) return;
    try {
      await this.area.clear();
    } catch {
      // Gracefully handle context invalidation
    }
  }

  onChanged(callback: (changes: Record<LocalStorageKeys, Storage.StorageChange>) => void): () => void {
    if (!isContextValid()) return () => {};

    const listener = (
      changes: Record<LocalStorageKeys, Storage.StorageChange>,
      areaName: string,
    ) => {
      if (areaName !== this.areaName) return;
      callback(changes);
    };

    Browser.storage.onChanged.addListener(listener);

    return () => {
      try {
        Browser.storage.onChanged.removeListener(listener);
      } catch {}
    };
  }
}

export const LocalStorage = new StorageArea<z.infer<typeof LocalStorageSchema>>(Browser.storage.local, "local");
export const SessionStorage = new StorageArea<z.infer<typeof SessionStorageSchema>>(Browser.storage.session, "session");