import { AsyncLocalStorage } from "node:async_hooks";

export type DistillStreamHooks = {
  onSummaryDelta: (delta: string) => void;
};

export const distillStreamContext = new AsyncLocalStorage<DistillStreamHooks>();
