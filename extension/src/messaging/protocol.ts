/**
 * Communication Protocol Definition
 *
 * Defines the contract, message actions, and strongly-typed request/response
 * mappings between the background worker script, popup, and content scripts.
 *
 */

import { FileProgress } from "@/lib/types";

export const MessageAction = {
  Classify: "Classify",
  Ping: "Ping",
  GetStatus: "GetStatus",
  StartSetup: "StartSetup",
  SetupProgress: "SetupProgress",
  SetupComplete: "SetupComplete",
} as const;

export type MessageAction = (typeof MessageAction)[keyof typeof MessageAction];

/**
 * Type-safe mapping of actions to their respective request and response payloads.
 * 
 * Request doesn't necessarily mean that it will be sent from frontend to service worker.
 * It can be from service worker as well (as in the case of SetupProgress).
 */
export interface MessageProtocol {
  [MessageAction.Classify]: {
    request: {
      text: string;
      id?: string;
    };
    response: {
      score: number;
      id?: string;
    };
  };
  [MessageAction.Ping]: {
    request?: void;
    response: {
      pong: true;
      timestamp: number;
    };
  };
  [MessageAction.GetStatus]: {
    request?: void;
    response: {
      ready: boolean;
    };
  };
  [MessageAction.StartSetup]: {
    request?: void;
    response: {
      success: boolean;
    };
  };
  [MessageAction.SetupProgress]: {
    request: {
      files: FileProgress[]
    };
    response?: {
      success: boolean;
    } | void;
  };
  [MessageAction.SetupComplete]: {
    request?: {
      success?: boolean;
    } | void;
    response?: {
      success: boolean;
    } | void;
  };
}

export type ActionRequest<A extends MessageAction> = MessageProtocol[A]["request"];
export type ActionResponse<A extends MessageAction> = MessageProtocol[A]["response"];

export type ClassificationData = ActionRequest<typeof MessageAction.Classify>;
export type ClassificationResult = ActionResponse<typeof MessageAction.Classify>;
export type ProgressData = ActionRequest<typeof MessageAction.SetupProgress>;
