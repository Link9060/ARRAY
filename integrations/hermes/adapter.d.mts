/** Type declarations for the server-only Hermes JavaScript adapter. */
export class HermesAdapterError extends Error {
  readonly code: string;
  constructor(message: string, code?: string);
}

export type HermesResponse = {
  ok: boolean;
  status?: number;
  json(): Promise<unknown>;
};

export interface HermesAdapterOptions {
  baseUrl?: string;
  apiKey?: string;
  enabled?: boolean;
  sandboxConfirmed?: boolean;
  timeoutMs?: number;
  fetchImpl?: (url: string, options: RequestInit) => Promise<HermesResponse>;
}

export interface HermesExecution {
  output: string;
  engine: 'hermes';
  model: 'hermes-agent';
  usage: unknown;
}

export interface HermesAdapter {
  enabled: boolean;
  health(): Promise<{ ready: boolean; reason?: string }>;
  execute(args: {
    objective: string;
    policy: 'assist' | 'review' | 'authorized';
    instructions?: string;
    signal?: AbortSignal;
  }): Promise<HermesExecution>;
}

export function createHermesAdapter(options?: HermesAdapterOptions): HermesAdapter;
