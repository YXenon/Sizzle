/**
 * Content Script Message Client
 *
 * Provides a strongly-typed, Promise-based client for content scripts
 * to communicate with the background service worker.
 */

import browser, { Runtime } from "webextension-polyfill";
import {
  ActionRequest,
  ActionResponse,
  MessageAction,
} from "./protocol";
import {
  createRequest,
  isRequestEnvelope,
  isResponseEnvelope,
  MessagingError,
  RequestEnvelope,
} from "./envelope";

/**
 * Checks whether the extension runtime context is currently valid.
 * When an extension is reloaded or updated, the content script's context is invalidated.
 */
export function isContextValid(): boolean {
  try {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      return Boolean(chrome.runtime.id);
    }
    if (typeof browser !== "undefined" && browser.runtime) {
      return Boolean(browser.runtime.id);
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks whether an error was caused by extension context invalidation.
 */
export function isContextInvalidatedError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof MessagingError && err.code === "CONTEXT_INVALIDATED") {
    return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Extension context invalidated") ||
    msg.includes("context invalidated") ||
    msg.includes("Script context has been invalidated")
  );
}

interface PendingRequest {
  resolve: (data: any) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
  action: MessageAction;
}

export interface ClientOptions {
  portName?: string;
  defaultTimeoutMs?: number;
}

export class ContentMessageClient {
  private readonly portName: string;
  private readonly defaultTimeoutMs: number;
  private port: Runtime.Port | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private isInvalidated = false;
  private invalidatedListeners = new Set<() => void>();

  constructor(options: ClientOptions = {}) {
    this.portName = options.portName ?? "classifier";
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? 15000;
  }

  /**
   * Returns true if the client and extension context are still valid.
   */
  public isValid(): boolean {
    if (this.isInvalidated) {
      return false;
    }
    if (!isContextValid()) {
      this.markInvalidated();
      return false;
    }
    return true;
  }

  /**
   * Helper to check if an error is a context invalidation error.
   */
  public isContextInvalidatedError(err: unknown): boolean {
    return isContextInvalidatedError(err);
  }

  /**
   * Registers a callback to be called when the extension context is invalidated.
   * Returns an unsubscribe function.
   */
  public onInvalidated(listener: () => void): () => void {
    this.invalidatedListeners.add(listener);
    if (this.isInvalidated) {
      try {
        listener();
      } catch (e) {
        console.error("[ContentMessageClient] Error in onInvalidated listener:", e);
      }
    }
    return () => {
      this.invalidatedListeners.delete(listener);
    };
  }

  /**
   * Marks the client as permanently invalidated and cleanly rejects pending requests.
   */
  private markInvalidated(): void {
    if (this.isInvalidated) {
      return;
    }
    this.isInvalidated = true;
    this.port = null;

    const invalidError = new MessagingError(
      "CONTEXT_INVALIDATED",
      "Extension context invalidated. Extension was updated or reloaded."
    );

    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timeoutId);
      pending.reject(invalidError);
    }
    this.pendingRequests.clear();

    for (const listener of this.invalidatedListeners) {
      try {
        listener();
      } catch (e) {
        console.error("[ContentMessageClient] Error in onInvalidated listener:", e);
      }
    }
  }

  /**
   * Lazily acquires or reconnects the communication port.
   */
  private getOrCreatePort(): Runtime.Port {
    if (this.isInvalidated || !this.isValid()) {
      throw new MessagingError(
        "CONTEXT_INVALIDATED",
        "Extension context invalidated. Extension was updated or reloaded."
      );
    }

    if (this.port) {
      return this.port;
    }

    try {
      this.port = browser.runtime.connect({ name: this.portName });
    } catch (err) {
      if (isContextInvalidatedError(err)) {
        this.markInvalidated();
        throw new MessagingError(
          "CONTEXT_INVALIDATED",
          "Failed to establish port connection: Extension context invalidated."
        );
      }
      throw new MessagingError(
        "CONNECTION_FAILED",
        `Failed to establish port connection "${this.portName}": ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Attach listeners synchronously upon port creation
    this.port.onMessage.addListener(this.handleIncomingMessage);
    this.port.onDisconnect.addListener(this.handlePortDisconnect);

    return this.port;
  }

  /**
   * Handles incoming responses from the background worker.
   */
  private handleIncomingMessage = (message: unknown): void => {
    if (!isResponseEnvelope(message)) {
      return;
    }

    const pending = this.pendingRequests.get(message.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeoutId);
    this.pendingRequests.delete(message.id);

    if (message.success) {
      pending.resolve(message.data);
    } else {
      pending.reject(
        new MessagingError(
          message.error.code,
          message.error.message,
          message.error.details
        )
      );
    }
  };

  /**
   * Handles port disconnection (e.g. background worker sleep or reload).
   */
  private handlePortDisconnect = (): void => {
    this.port = null;

    if (!isContextValid()) {
      this.markInvalidated();
      return;
    }

    const lastError = browser.runtime.lastError?.message;
    if (lastError && isContextInvalidatedError(lastError)) {
      this.markInvalidated();
      return;
    }

    const pendingCount = this.pendingRequests.size;
    if (pendingCount > 0) {
      const disconnectError = new MessagingError(
        "PORT_DISCONNECTED",
        lastError || "Connection to background worker was terminated."
      );

      for (const [, pending] of this.pendingRequests) {
        clearTimeout(pending.timeoutId);
        pending.reject(disconnectError);
      }
      this.pendingRequests.clear();
    }
  };

  /**
   * Sends a strongly typed request to the worker and returns a Promise for the response.
   */
  public async send<A extends MessageAction>(
    action: A,
    payload?: ActionRequest<A>,
    options?: { timeoutMs?: number }
  ): Promise<ActionResponse<A>> {
    if (this.isInvalidated || !this.isValid()) {
      throw new MessagingError(
        "CONTEXT_INVALIDATED",
        "Extension context invalidated. Extension was updated or reloaded."
      );
    }

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeoutMs;
    const requestEnvelope: RequestEnvelope<A> = createRequest(action, payload);

    return new Promise<ActionResponse<A>>((resolve, reject) => {
      let port: Runtime.Port;
      try {
        port = this.getOrCreatePort();
      } catch (err) {
        return reject(err);
      }

      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestEnvelope.id);
        reject(
          new MessagingError(
            "TIMEOUT",
            `Request '${action}' (ID: ${requestEnvelope.id}) timed out after ${timeoutMs}ms.`
          )
        );
      }, timeoutMs);

      this.pendingRequests.set(requestEnvelope.id, {
        resolve,
        reject,
        timeoutId,
        action,
      });

      try {
        port.postMessage(requestEnvelope);
      } catch (err) {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(requestEnvelope.id);
        this.port = null;

        if (isContextInvalidatedError(err)) {
          this.markInvalidated();
          return reject(
            new MessagingError(
              "CONTEXT_INVALIDATED",
              "Extension context invalidated."
            )
          );
        }

        reject(
          new MessagingError(
            "SEND_FAILED",
            `Failed to post message for '${action}': ${err instanceof Error ? err.message : String(err)}`
          )
        );
      }
    });
  }

  /**
   * Domain helper: Classify a comment text.
   */
  public async classify(
    text: string,
    id?: string
  ): Promise<ActionResponse<typeof MessageAction.Classify>> {
    return this.send(MessageAction.Classify, { text, id });
  }

  /**
   * Domain helper: Ping background worker to check liveness.
   */
  public async ping(): Promise<ActionResponse<typeof MessageAction.Ping>> {
    return this.send(MessageAction.Ping);
  }

  /**
   * Domain helper: Retrieve worker model readiness and status.
   */
  public async getStatus(): Promise<ActionResponse<typeof MessageAction.GetStatus>> {
    return this.send(MessageAction.GetStatus);
  }

  /**
   * Explicitly closes any active port connection and clears pending requests.
   */
  public disconnect(): void {
    if (this.port) {
      try {
        this.port.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      this.port = null;
    }
    this.handlePortDisconnect();
  }
}

export { ContentMessageClient as MessageClient };

/**
 * Sends a strongly-typed one-off runtime request to the background worker and awaits response.
 */
export async function sendRuntimeMessage<A extends MessageAction>(
  action: A,
  payload?: ActionRequest<A>
): Promise<ActionResponse<A>> {
  if (!isContextValid()) {
    throw new MessagingError(
      "CONTEXT_INVALIDATED",
      "Extension context invalidated."
    );
  }
  const envelope = createRequest(action, payload);
  let response: unknown;
  try {
    response = await browser.runtime.sendMessage(envelope);
  } catch (err) {
    if (isContextInvalidatedError(err)) {
      throw new MessagingError(
        "CONTEXT_INVALIDATED",
        "Extension context invalidated."
      );
    }
    throw err;
  }

  if (isResponseEnvelope(response)) {
    if (response.success) {
      return response.data as ActionResponse<A>;
    }
    throw new MessagingError(
      response.error.code,
      response.error.message,
      response.error.details
    );
  }

  return response as ActionResponse<A>;
}

/**
 * Broadcasts a one-off runtime notification without requiring a response.
 */
export async function sendRuntimeNotification<A extends MessageAction>(
  action: A,
  payload?: ActionRequest<A>
): Promise<void> {
  if (!isContextValid()) {
    return;
  }
  const envelope = createRequest(action, payload);
  try {
    await browser.runtime.sendMessage(envelope);
  } catch {
    // Non-fatal if no active listeners in other extension contexts (e.g. popup closed)
  }
}

/**
 * Registers a type-safe listener for incoming runtime messages matching a specific action.
 * Returns an unsubscribe function.
 */
export function onRuntimeMessage<A extends MessageAction>(
  action: A,
  listener: (payload: ActionRequest<A>, sender: Runtime.MessageSender) => void | Promise<void>
): () => void {
  const handler = (raw: unknown, sender: Runtime.MessageSender) => {
    if (isRequestEnvelope(raw) && raw.action === action) {
      return listener(raw.payload as ActionRequest<A>, sender);
    }
  };
  browser.runtime.onMessage.addListener(handler);
  return () => {
    browser.runtime.onMessage.removeListener(handler);
  };
}
