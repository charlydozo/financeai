export function sma(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const result: number[] = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

export function ema(prices: number[], period: number): number[] {
  if (prices.length < period) return [];
  const k = 2 / (period + 1);
  let prev = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const result = [prev];
  for (let i = period; i < prices.length; i++) {
    prev = prices[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

export function rsi(prices: number[], period = 14): number | null {
  if (prices.length < period + 1) return null;
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
}

export function macd(prices: number[], fast = 12, slow = 26, signalPeriod = 9): MACDResult | null {
  if (prices.length < slow + signalPeriod) return null;
  const fastEma = ema(prices, fast);
  const slowEma = ema(prices, slow);
  // slowEma[0] corresponds to fastEma[slow - fast] (both start at same index `slow-1`)
  const macdLine = slowEma.map((s, i) => fastEma[i + (slow - fast)] - s);
  if (macdLine.length < signalPeriod) return null;
  const signalLine = ema(macdLine, signalPeriod);
  const lastMacd = macdLine.at(-1)!;
  const lastSignal = signalLine.at(-1)!;
  return { macd: lastMacd, signal: lastSignal, histogram: lastMacd - lastSignal };
}
