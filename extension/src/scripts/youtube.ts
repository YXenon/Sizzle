// youtube.ts
import {
    initSettings,
    listenToSettingsChange,
    useSettings,
} from "@/stores/useSettings";
import { ContentMessageClient } from "../messaging";

const unSubSettingsChange = listenToSettingsChange();
const classifierClient = new ContentMessageClient({ portName: "classifier" });
const THRESHOLD_QUOTIENT = 10;

let isDestroyed = false;
let currentObserver: MutationObserver | null = null;

function destroy(reason = "Extension context invalidated"): void {
    if (isDestroyed) return;
    isDestroyed = true;

    if (currentObserver) {
        currentObserver.disconnect();
        currentObserver = null;
    }

    window.removeEventListener("yt-navigate-finish", handleUrlChange);

    classifierClient.disconnect();

    unSubSettingsChange();

    document
        .querySelectorAll<HTMLElement>("ytd-comment-thread-renderer")
        .forEach((node) => {
            if (node.style.visibility === "hidden") {
                node.style.visibility = "visible";
            }
        });

    console.info(
        `[Sizzle] ${reason}. Comment processing stopped on this tab. Refreshing may fix the issue.`,
    );
}

// Auto-destroy when classifierClient detects invalidation
classifierClient.onInvalidated(() => {
    destroy();
});

async function waitForElement(
    parent: Node,
    selector: string,
): Promise<Element | null> {
    if (isDestroyed || !classifierClient.isValid()) {
        destroy();
        return null;
    }

    const existing = document.querySelector(selector);
    if (existing) return existing;

    return new Promise((resolve) => {
        const observer = new MutationObserver(() => {
            if (isDestroyed || !classifierClient.isValid()) {
                observer.disconnect();
                destroy();
                resolve(null);
                return;
            }
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });
        observer.observe(parent, { childList: true, subtree: true });
    });
}

function extractText(input: string | Element): string {
    const el =
        typeof input === "string"
            ? Object.assign(document.createElement("div"), { innerHTML: input })
            : input;

    const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
    );
    let out = "";
    while (walker.nextNode()) {
        const n = walker.currentNode;
        out +=
            n.nodeName === "IMG"
                ? (n as HTMLImageElement).alt
                : n.nodeType === Node.TEXT_NODE
                  ? (n.textContent ?? "")
                  : "";
    }
    return out.trim();
}

function checkValidity(): boolean {
    const re =
        /^https:\/\/(www\.)?youtube\.com\/(watch\?v=[\w-]+|live\/[\w-]+)([?&].*)?$/;
    return re.test(document.URL);
}

function cleanGhostLoader(node: Element): void {
    const ghosts = node.querySelectorAll(
        "ytd-continuation-item-renderer.ytd-item-section-renderer",
    );
    ghosts.forEach((ghost, i) => {
        if (i < ghosts.length - 1) ghost.remove();
    });
}

/**
 * Classifies an individual YouTube comment element and hides/shows/removes it.
 */
async function processComment(node: HTMLElement): Promise<void> {
    const state = useSettings.getState();
    const visible = () => {
        node.style.visibility = "visible";
    };
    if (isDestroyed || !classifierClient.isValid()) {
        destroy();
        return;
    }
    // Temporarily hide comment while evaluation is in-flight
    node.style.visibility = "hidden";

    const span = node.querySelector(
        "#comment-container #comment #body #main #expander #content #content-text span",
    );

    const text = span && extractText(span);
    if (!text) return visible();

    try {
        const { score } = await classifierClient.classify(text);
        console.log(score, score < state.qualityThreshold/THRESHOLD_QUOTIENT);
        if (score < state.qualityThreshold/THRESHOLD_QUOTIENT) {
            node.remove();
        } else {
            visible();
        }
    } catch (err) {
        visible();

        if (classifierClient.isContextInvalidatedError(err)) {
            destroy();
            return;
        }

        console.warn(
            "[Sizzle] Failed to classify comment, displaying as fallback:",
            err,
        );
    }
}

function getRenderedComments(mutations: MutationRecord[]): void {
    if (isDestroyed || !classifierClient.isValid()) {
        destroy();
        return;
    }

    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (
                node instanceof HTMLElement &&
                node.matches("ytd-comment-thread-renderer")
            ) {
                void processComment(node);
            }
        }
    }
}

async function addCommentListener(): Promise<MutationObserver | undefined> {
    if (isDestroyed || !classifierClient.isValid()) {
        destroy();
        return;
    }

    const commentsElement = await waitForElement(
        document,
        "#below ytd-comments ytd-item-section-renderer #contents",
    );
    if (!commentsElement || isDestroyed) return;

    const observer = new MutationObserver((mutations) => {
        if (isDestroyed || !classifierClient.isValid()) {
            destroy();
            return;
        }
        getRenderedComments(mutations);
        cleanGhostLoader(commentsElement);
    });
    observer.observe(commentsElement, { childList: true });
    return observer;
}

async function handleUrlChange(): Promise<void> {
    if (isDestroyed || !classifierClient.isValid()) {
        destroy();
        return;
    }

    currentObserver?.disconnect();
    currentObserver = null;

    // Send a ping to awaken the background service worker
    try {
        await classifierClient.ping();
    } catch (err) {
        if (classifierClient.isContextInvalidatedError(err)) {
            destroy();
            return;
        }
        // Ping error can happen if worker is waking up; subsequent calls will reconnect
    }

    if (checkValidity()) {
        currentObserver = (await addCommentListener()) ?? null;
    }
}

async function addPageListener(): Promise<void> {
    const state = useSettings.getState();
    console.log(`[Sizzle] Threshold: ${state.qualityThreshold}`);

    (["pushState", "replaceState"] as const).forEach((method) => {
        const original = history[method].bind(history);
        history[method] = function (
            ...args: Parameters<History[typeof method]>
        ) {
            Reflect.apply(original, history, args);
            if (!isDestroyed) {
                void handleUrlChange();
            }
        };
    });
    window.addEventListener("yt-navigate-finish", handleUrlChange);

    await handleUrlChange();
}

async function init(): Promise<void> {
    try {
        await initSettings();
        const state = useSettings.getState();
        if (state.onboarding) {
            console.warn(
                "[Sizzle] Necessary files are not installed yet, open the extension popup to install them.",
            );
            return;
        }
        if (!classifierClient.isValid()) {
            throw Error("Classifier client invalid!");
        }
        if (state.isEnabled ?? false) {
            await addPageListener();
        }
    } catch (err) {
        if (classifierClient.isContextInvalidatedError(err)) {
            destroy();
            return;
        }
        unSubSettingsChange();
        console.warn("[Sizzle] Failed to initialize:", err);
    }
}

if (
    document.readyState === "complete" ||
    document.readyState === "interactive"
) {
    void init();
} else {
    window.addEventListener("load", () => void init(), { once: true });
}
