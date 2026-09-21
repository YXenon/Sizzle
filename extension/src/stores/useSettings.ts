import {
    LocalStorage,
    LocalStorageKeys,
    LocalStorageProps,
} from "@/lib/storage";
import { RenderData } from "@/lib/types";
import { Storage } from "webextension-polyfill";
import { create } from "zustand";

const DEFAULTS = {
    sizzle_enabled: true,
    sizzle_threshold: 60,
    onboarding: true,
} satisfies LocalStorageProps;

interface Settings extends RenderData {
    setBoarding: (to: boolean) => void;
    setEnabled: (enabled?: boolean) => void;
    setThreshold: (threshold: number) => void;
}

export const useSettings = create<Settings>((set) => ({
    isEnabled: DEFAULTS.sizzle_enabled,
    onboarding: DEFAULTS.onboarding,
    qualityThreshold: DEFAULTS.sizzle_threshold,
    setBoarding: (to: boolean) => {
        set({ onboarding: to });
        LocalStorage.set({ onboarding: to });
    },
    setEnabled: (enabled?: boolean) => {
        const isEnabled = enabled !== undefined ? enabled : true;
        set({ isEnabled: isEnabled });
        LocalStorage.set({ sizzle_enabled: isEnabled });
    },
    setThreshold: (threshold: number) => {
        set({ qualityThreshold: threshold });
        LocalStorage.set({ sizzle_threshold: threshold });
    },
}));

function applyStorage(props: LocalStorageProps): void {
    const patch: Partial<RenderData> = {};
    if (props.sizzle_enabled !== undefined)
        patch.isEnabled = props.sizzle_enabled;
    if (props.sizzle_threshold !== undefined)
        patch.qualityThreshold = props.sizzle_threshold;
    if (props.onboarding !== undefined) patch.onboarding = props.onboarding;

    if (Object.keys(patch).length) useSettings.setState(patch);
}

export async function initSettings() {
    const result = await LocalStorage.get(DEFAULTS);
    applyStorage(result);
}

export function listenToSettingsChange() {
    return LocalStorage.onChanged((changes) => {
        const props = Object.fromEntries(
            Object.entries(changes).map(([key, value]) => [
                key,
                value.newValue,
            ]),
        ) as LocalStorageProps;
        applyStorage(props);
    });
}
