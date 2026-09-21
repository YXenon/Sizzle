export interface RenderData {
    isEnabled: boolean;
    qualityThreshold: number;
    onboarding: boolean;
}

export enum ConnectionStates {
    Idle = 0,
    Started = 1,
    Completed = 2
}

export interface Cache {
    cache_source: string;
    cache_key: string;
    cache_params?: RequestInit;
}

export interface FileProgress {
    name: string;
    loaded: number;
    total: number;
}

