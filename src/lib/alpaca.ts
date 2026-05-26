export const ALPACA_BASE_URL = process.env.ALPACA_BASE_URL ?? 'https://paper-api.alpaca.markets';
export const ALPACA_DATA_URL = 'https://data.alpaca.markets';
export const ALPACA_STREAM_URL = 'wss://stream.data.alpaca.markets/v2/iex';

function headers() {
  return {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY ?? '',
    'APCA-API-SECRET-KEY': process.env.ALPACA_API_SECRET ?? '',
    'Content-Type': 'application/json',
  };
}

export function isAlpacaConfigured(): boolean {
  const key = process.env.ALPACA_API_KEY ?? '';
  const secret = process.env.ALPACA_API_SECRET ?? '';
  return key.length > 10 && secret.length > 10 && !key.startsWith('your_');
}

async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const base = path.startsWith('http') ? '' : ALPACA_BASE_URL;
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
  });

  if (res.status === 204) return null as T;
  const data = await res.json();
  if (!res.ok) throw new Error((data as any)?.message ?? `Alpaca ${res.status}`);
  return data as T;
}

export const alpaca = {
  getAccount: () => apiFetch('/v2/account'),

  getPositions: () => apiFetch<AlpacaPosition[]>('/v2/positions'),

  getOrders: (status: 'open' | 'closed' | 'all' = 'open') =>
    apiFetch<AlpacaOrder[]>(`/v2/orders?status=${status}&limit=50&direction=desc`),

  placeOrder: (order: PlaceOrderInput) =>
    apiFetch<AlpacaOrder>('/v2/orders', { method: 'POST', body: JSON.stringify(order) }),

  cancelOrder: (id: string) =>
    apiFetch<null>(`/v2/orders/${id}`, { method: 'DELETE' }),

  getLatestQuote: (symbol: string) =>
    apiFetch<{ quote: AlpacaQuote }>(`${ALPACA_DATA_URL}/v2/stocks/${symbol}/quotes/latest`),
};

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PlaceOrderInput {
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: 'day' | 'gtc' | 'ioc' | 'fok';
  limit_price?: number;
  stop_price?: number;
}

export interface AlpacaPosition {
  symbol: string;
  qty: string;
  qty_available: string;
  avg_entry_price: string;
  current_price: string;
  lastday_price: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  unrealized_intraday_pl: string;
  unrealized_intraday_plpc: string;
  change_today: string;
  side: 'long' | 'short';
}

export interface AlpacaOrder {
  id: string;
  symbol: string;
  qty: string;
  filled_qty: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  status: string;
  created_at: string;
  filled_at: string | null;
  filled_avg_price: string | null;
}

export interface AlpacaQuote {
  ap: number;  // ask price
  as: number;  // ask size
  bp: number;  // bid price
  bs: number;  // bid size
  t: string;   // timestamp
}

// ─── Données simulées (clés non configurées) ────────────────────────────────

export const MOCK_ACCOUNT = {
  buying_power: '97500.00',
  equity: '104234.59',
  cash: '97500.00',
  portfolio_value: '104234.59',
  daytrade_count: 0,
  simulated: true,
};

export const MOCK_POSITIONS: AlpacaPosition[] = [
  {
    symbol: 'AAPL', qty: '10', qty_available: '10', side: 'long',
    avg_entry_price: '172.50', current_price: '178.72', lastday_price: '177.49',
    market_value: '1787.20', cost_basis: '1725.00',
    unrealized_pl: '62.20', unrealized_plpc: '0.0361',
    unrealized_intraday_pl: '12.30', unrealized_intraday_plpc: '0.0069',
    change_today: '0.0069',
  },
  {
    symbol: 'MSFT', qty: '5', qty_available: '5', side: 'long',
    avg_entry_price: '368.00', current_price: '374.51', lastday_price: '376.66',
    market_value: '1872.55', cost_basis: '1840.00',
    unrealized_pl: '32.55', unrealized_plpc: '0.0177',
    unrealized_intraday_pl: '-10.75', unrealized_intraday_plpc: '-0.0057',
    change_today: '-0.0057',
  },
  {
    symbol: 'NVDA', qty: '3', qty_available: '3', side: 'long',
    avg_entry_price: '510.00', current_price: '495.28', lastday_price: '482.88',
    market_value: '1485.84', cost_basis: '1530.00',
    unrealized_pl: '-44.16', unrealized_plpc: '-0.0288',
    unrealized_intraday_pl: '37.20', unrealized_intraday_plpc: '0.0257',
    change_today: '0.0257',
  },
];

export const MOCK_ORDERS: AlpacaOrder[] = [
  {
    id: 'mock-1', symbol: 'TSLA', qty: '2', filled_qty: '0', side: 'buy',
    type: 'limit', time_in_force: 'day', limit_price: '235.00', stop_price: null,
    status: 'new', created_at: new Date().toISOString(), filled_at: null, filled_avg_price: null,
  },
];
