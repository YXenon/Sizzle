// background.ts
import Browser from "webextension-polyfill";
// import {
//   ModelRegistry
// } from "@huggingface/transformers";
import { MessageAction, WorkerMessageRouter } from "../messaging";
import Model from "./model";
import Setup from "./setup";

/**
 * Sequential task queue to safely serialize ONNX Web WASM inferences
 * and prevent memory contention or race conditions.
 */
class AsyncQueue {
  private queue: Promise<unknown> = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue.then(async () => {
        try {
          resolve(await task());
        } catch (err) {
          reject(err);
        }
      });
    });
  }
}

const inferenceQueue = new AsyncQueue();

// Model readiness singleton manager
let modelInitPromise: Promise<void> | null = null;
async function ensureModelInitialized(): Promise<void> {
  if (!modelInitPromise) {
    modelInitPromise = (async () => {
      await Model.init();
      await Model.createModel();
    })();
  }
  return modelInitPromise;
}

// Instantiate declarative worker message router
const router = new WorkerMessageRouter({ portName: "classifier" });

// Action: Classify
router.handle(MessageAction.Classify, async ({ text, id }) => {
  return inferenceQueue.enqueue(async () => {
    await ensureModelInitialized();
    const score = await Model.predict(text);
    return { score, id };
  });
});

// Action: Ping (liveness and wake-up check)
router.handle(MessageAction.Ping, async () => {
  return {
    pong: true,
    timestamp: Date.now(),
  };
});

// Action: GetStatus (model readiness check)
router.handle(MessageAction.GetStatus, async () => {
  return {
    ready: Boolean(await Model.init())
  };
});

// Action: StartSetup (triggers background asset download)
router.handle(MessageAction.StartSetup, async () => {
  void Setup.download();
  return { success: true };
});

// Start listening for incoming connections and messages
router.listen();



Browser.runtime.onInstalled.addListener((details)=>{
  if (details.reason == "install") {
    Browser.tabs.create({ url: "onboarding.html" });
  }
});