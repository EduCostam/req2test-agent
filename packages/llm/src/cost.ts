import type { Usage } from './types.js';
export interface Price { input: number; output: number; cached: number }
export type Prices = Record<string, Price>;
// USD per million tokens, fictitious prices for testing arithmetic only.
export const simulatedPrices: Prices = { 'fake-qa-v1': { input: 1, output: 2, cached: 0.25 } };
export function costUsd(model: string, usage: Usage, prices: Prices): number {
  const price = prices[model];
  if (!price || Object.values(price).some(v => !Number.isFinite(v) || v < 0)) throw new Error('Missing/invalid price');
  const cached = usage.cachedTokens ?? 0;
  if ([usage.inputTokens, usage.outputTokens, cached].some(v => !Number.isSafeInteger(v) || v < 0) || cached > usage.inputTokens)
    throw new Error('Invalid usage');
  return Number((((usage.inputTokens - cached) * price.input + cached * price.cached + usage.outputTokens * price.output) / 1_000_000).toFixed(10));
}
