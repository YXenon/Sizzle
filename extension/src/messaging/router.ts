/**
 * Worker Message Router
 *
 * Provides a declarative, type-safe router in the background service worker
 * for dispatching and responding to requests from content scripts.
 */

import browser, { Runtime } from "webextension-polyfill";
import {
  ActionRequest,
  ActionResponse,
  MessageAction,
} from "./protocol";
import {
  createErrorResponse,
  createSuccessResponse,
  isRequestEnvelope,
  MessagingError,
  RequestEnvelope,
  ResponseEnvelope,
} from "./envelope";

export type ActionHandler<A extends MessageAction> = (
  payload: ActionRequest<A>,
  port?: Runtime.Port
) => Promise<ActionResponse<A>> | ActionResponse<A>;

export interface RouterOptions {
  portName?: string;
  onLegacyMessage?: (
    message: unknown,
    sender: Runtime.MessageSender
  ) => Promise<unknown> | unknown;
  onLegacyPortMessage?: (
    message: unknown,
    port: Runtime.Port
  ) => Promise<void> | void;
}

export class WorkerMessageRouter {
  private readonly portName: string;
  private readonly onLegacyMessage?: (
    message: unknown,
    sender: Runtime.MessageSender
  ) => Promise<unknown> | unknown;
  private readonly onLegacyPortMessage?: (
    message: unknown,
    port: Runtime.Port
  ) => Promise<void> | void;

  private handlers = new Map<
    MessageAction,
    (payload: any, port?: Runtime.Port) => Promise<any> | any
  >();

  private isListening = false;

  constructor(options: RouterOptions = {}) {
    this.portName = options.portName ?? "classifier";
    this.onLegacyMessage = options.onLegacyMessage;
    this.onLegacyPortMessage = options.onLegacyPortMessage;
  }

  /**
   * Registers a type-safe handler for a specific protocol action.
   */
  public handle<A extends MessageAction>(
    action: A,
    handler: ActionHandler<A>
  ): this {
    if (this.handlers.has(action)) {
      console.warn(`[WorkerMessageRouter] Overwriting handler for action "${action}"`);
    }
    this.handlers.set(action, handler as (payload: any, port?: Runtime.Port) => any);
    return this;
  }

  /**
   * Dispatches an incoming request envelope to its registered handler.
   */
  private async dispatch<A extends MessageAction>(
    request: RequestEnvelope<A>,
    port?: Runtime.Port
  ): Promise<ResponseEnvelope<A>> {
    const handler = this.handlers.get(request.action);

    if (!handler) {
      return createErrorResponse(
        request.id,
        request.action,
        "UNREGISTERED_ACTION",
        `No handler registered for action: "${request.action}"`
      );
    }

    try {
      const data = await handler(request.payload as ActionRequest<A>, port);
      return createSuccessResponse(request.id, request.action, data);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = err instanceof MessagingError ? err.code : "HANDLER_ERROR";
      const details = err instanceof MessagingError ? err.details : undefined;

      return createErrorResponse(
        request.id,
        request.action,
        code,
        message,
        details
      );
    }
  }

  /**
   * Handles incoming port connections from content scripts.
   */
  private handleConnect = (port: Runtime.Port): void => {
    if (port.name !== this.portName) {
      return;
    }

    port.onMessage.addListener(async (raw: unknown) => {
      if (!isRequestEnvelope(raw)) {
        if (this.onLegacyPortMessage) {
          try {
            await this.onLegacyPortMessage(raw, port);
          } catch (err) {
            console.warn(`[WorkerMessageRouter] Error handling legacy port message:`, err);
          }
        }
        return;
      }

      const response = await this.dispatch(raw, port);
      try {
        port.postMessage(response);
      } catch (err) {
        console.warn(`[WorkerMessageRouter] Failed to post response to port:`, err);
      }
    });
  };

  /**
   * Handles one-off runtime messages (with fallback for legacy messages like SETUP).
   */
  private handleRuntimeMessage = async (
    message: unknown,
    sender: Runtime.MessageSender
  ): Promise<unknown> => {
    if (isRequestEnvelope(message)) {
      if (this.handlers.has(message.action as MessageAction)) {
        return this.dispatch(message as RequestEnvelope<MessageAction>);
      }
    }

    if (this.onLegacyMessage) {
      return this.onLegacyMessage(message, sender);
    }

    if (isRequestEnvelope(message)) {
      return this.dispatch(message as RequestEnvelope<MessageAction>);
    }

    return { success: true };
  };

  /**
   * Starts listening for port connections and runtime messages.
   */
  public listen(): void {
    if (this.isListening) {
      return;
    }
    this.isListening = true;

    browser.runtime.onConnect.addListener(this.handleConnect);
    browser.runtime.onMessage.addListener(this.handleRuntimeMessage);
  }

  /**
   * Stops listening and cleans up handlers.
   */
  public destroy(): void {
    if (!this.isListening) {
      return;
    }
    this.isListening = false;

    browser.runtime.onConnect.removeListener(this.handleConnect);
    browser.runtime.onMessage.removeListener(this.handleRuntimeMessage);
    this.handlers.clear();
  }
}
