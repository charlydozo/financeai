'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface StreamQuote {
  T: 'q' | 't' | 'error';
  S: string;
  bp: number;   // bid price
  bs: number;   // bid size
  ap: number;   // ask price
  as: number;   // ask size
  lp?: number;  // last price (synthetic / trade price)
  v?: number;   // volume
  simulated?: boolean;
}

export interface UseMarketStreamResult {
  quote: StreamQuote | null;
  connected: boolean;
  error: string | null;
}

export function useMarketStream(symbol: string): UseMarketStreamResult {
  const [quote, setQuote] = useState<StreamQuote | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    esRef.current?.close();
    setQuote(null);

    const es = new EventSource(`/api/market/stream?symbol=${encodeURIComponent(symbol)}`);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as StreamQuote;
        if (data.T === 'error') {
          setError((data as any).message ?? 'Erreur stream');
        } else {
          setQuote(data);
        }
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
      // EventSource reconnecte automatiquement — on ne ferme pas
    };
  }, [symbol]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      setConnected(false);
    };
  }, [connect]);

  return { quote, connected, error };
}
