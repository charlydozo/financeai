// ─── P&L payoff calculations for options strategies ──────────────────────────

export function straddlePayoff(S: number, K: number, totalPremium: number): number {
  return Math.abs(S - K) - totalPremium;
}

export function butterflyPayoff(
  S: number,
  K1: number,
  K2: number,
  K3: number,
  netDebit: number,
): number {
  return Math.max(S - K1, 0) - 2 * Math.max(S - K2, 0) + Math.max(S - K3, 0) - netDebit;
}

export function stranglePayoff(S: number, Kp: number, Kc: number, totalPremium: number): number {
  return Math.max(S - Kc, 0) + Math.max(Kp - S, 0) - totalPremium;
}

// ─── Metrics (breakevens, max profit/loss) ────────────────────────────────────

export interface PayoffMetrics {
  maxProfit: number | null; // null = unlimited
  maxLoss: number;
  breakevenLow: number;
  breakevenHigh: number;
  priceRange: [number, number];
}

export function straddleMetrics(K: number, totalPremium: number): PayoffMetrics {
  return {
    maxProfit: null, // unlimited
    maxLoss: -totalPremium,
    breakevenLow: K - totalPremium,
    breakevenHigh: K + totalPremium,
    priceRange: [K * 0.75, K * 1.25],
  };
}

export function butterflyMetrics(
  K1: number,
  K2: number,
  K3: number,
  netDebit: number,
): PayoffMetrics {
  return {
    maxProfit: K2 - K1 - netDebit,
    maxLoss: -netDebit,
    breakevenLow: K1 + netDebit,
    breakevenHigh: K3 - netDebit,
    priceRange: [K1 * 0.88, K3 * 1.12],
  };
}

export function strangleMetrics(Kp: number, Kc: number, totalPremium: number): PayoffMetrics {
  return {
    maxProfit: null, // unlimited
    maxLoss: -totalPremium,
    breakevenLow: Kp - totalPremium,
    breakevenHigh: Kc + totalPremium,
    priceRange: [Kp * 0.75, Kc * 1.25],
  };
}

// ─── Generate curve points ────────────────────────────────────────────────────

export interface PayoffPoint {
  price: number;
  pl: number;
}

export function generateCurve(
  type: 'STRADDLE' | 'BUTTERFLY' | 'STRANGLE',
  config: any,
  steps = 100,
): PayoffPoint[] {
  let metrics: PayoffMetrics;
  let fn: (S: number) => number;

  if (type === 'STRADDLE') {
    const totalPrem = config.callPremium + config.putPremium;
    metrics = straddleMetrics(config.strike, totalPrem);
    fn = (S) => straddlePayoff(S, config.strike, totalPrem) * config.quantity;
  } else if (type === 'BUTTERFLY') {
    metrics = butterflyMetrics(config.lowStrike, config.midStrike, config.highStrike, config.netDebit);
    fn = (S) =>
      butterflyPayoff(S, config.lowStrike, config.midStrike, config.highStrike, config.netDebit) *
      config.quantity;
  } else {
    const totalPrem = config.callPremium + config.putPremium;
    metrics = strangleMetrics(config.putStrike, config.callStrike, totalPrem);
    fn = (S) => stranglePayoff(S, config.putStrike, config.callStrike, totalPrem) * config.quantity;
  }

  const [pMin, pMax] = metrics.priceRange;
  return Array.from({ length: steps }, (_, i) => {
    const price = pMin + (i / (steps - 1)) * (pMax - pMin);
    return { price, pl: fn(price) };
  });
}
