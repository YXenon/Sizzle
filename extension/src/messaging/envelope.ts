/**
 * Message Envelope and Serialization Architecture
 *
 * Provides normalized, structured envelopes for all messages exchanged
 * between content script and background service worker.
 */

import { ActionRequest, ActionResponse, MessageAction } from "./protocol";

export interface MessagingErrorDetails {
  code: string;
  message: string;
  details?: unknown;
}

export class MessagingError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "MessagingError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, MessagingError.prototype);
  }

  toJSON(): MessagingErrorDetails {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

/**
 * Standardized request envelope
 */
export interface RequestEnvelope<A extends MessageAction = MessageAction> {
  id: string;
  action: A;
  payload?: ActionRequest<A>;
  timestamp: number;
}

/**
 * Standardized success response envelope
 */
export interface ResponseSuccessEnvelope<A extends MessageAction = MessageAction> {
  id: string;
  action: A;
  success: true;
  data: ActionResponse<A>;
  timestamp: number;
}

/**
 * Standardized error response envelope
 */
export interface ResponseErrorEnvelope<A extends MessageAction = MessageAction> {
  id: string;
  action: A;
  success: false;
  error: MessagingErrorDetails;
  timestamp: number;
}

export type ResponseEnvelope<A extends MessageAction = MessageAction> =
  | ResponseSuccessEnvelope<A>
  | ResponseErrorEnvelope<A>;

/**
 * Generates a unique message ID (using crypto.randomUUID or fallback)
 */
export function generateMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Creates a normalized request envelope
 */
export function createRequest<A extends MessageAction>(
  action: A,
  payload?: ActionRequest<A>
): RequestEnvelope<A> {
  return {
    id: generateMessageId(),
    action,
    payload,
    timestamp: Date.now(),
  };
}

/**
 * Creates a normalized success response envelope
 */
export function createSuccessResponse<A extends MessageAction>(
  id: string,
  action: A,
  data: ActionResponse<A>
): ResponseSuccessEnvelope<A> {
  return {
    id,
    action,
    success: true,
    data,
    timestamp: Date.now(),
  };
}

/**
 * Creates a normalized error response envelope
 */
export function createErrorResponse<A extends MessageAction>(
  id: string,
  action: A,
  code: string,
  message: string,
  details?: unknown
): ResponseErrorEnvelope<A> {
  return {
    id,
    action,
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: Date.now(),
  };
}

/**
 * Type guard for RequestEnvelope
 */
export function isRequestEnvelope(value: unknown): value is RequestEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.action === "string" &&
    typeof candidate.timestamp === "number"
  );
}

/**
 * Type guard for ResponseEnvelope
 */
export function isResponseEnvelope(value: unknown): value is ResponseEnvelope {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.action === "string" &&
    typeof candidate.timestamp === "number" &&
    typeof candidate.success === "boolean"
  );
}
