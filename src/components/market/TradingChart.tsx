'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingChartProps {
  symbol: string;
  interval: '1d' | '1h' | '5m';
  livePrice?: number;
}

export function TradingChart({ symbol, interval, livePrice }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartReady, setChartReady] = useState(false);
  const [lastClose, setLastClose] = useState<number | null>(null);
  const lastBarTimeRef = useRef<number>(0);

  // Create chart once — never re-runs so the canvas is never destroyed mid-session
  useEffect(() => {
    if (!containerRef.current) return;
    let destroyed = false;

    import('lightweight-charts').then(({ createChart, ColorType, CrosshairMode }) => {
      if (destroyed || !containerRef.current) return;

      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#111827' },
          textColor: '#9ca3af',
          fontFamily: 'Inter, system-ui, sans-serif',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#374151', scaleMargins: { top: 0.1, bottom: 0.25 } },
        timeScale: { borderColor: '#374151', timeVisible: true, secondsVisible: false },
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      });

      const candleSeries = chart.addCandlestickSeries({
        upColor: '#02559F',
        downColor: '#ef4444',
        borderVisible: false,
        wickUpColor: '#02559F',
        wickDownColor: '#ef4444',
      });

      const volumeSeries = chart.addHistogramSeries({
        color: '#1f2937',
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
      });
      chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

      chartRef.current = chart;
      candleSeriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      const handleResize = () => {
        if (containerRef.current && !destroyed) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener('resize', handleResize);
      resizeHandlerRef.current = handleResize;

      setChartReady(true);
    });

    return () => {
      destroyed = true;
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        resizeHandlerRef.current = null;
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
      }
    };
  }, []);

  // Reload OHLCV data whenever symbol or interval changes (or when chart becomes ready)
  useEffect(() => {
    if (!chartReady || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    setLoading(true);
    setLastClose(null);
    lastBarTimeRef.current = 0;

    fetch(`/api/market/history/${symbol}?interval=${interval}`)
      .then((r) => r.json())
      .then(({ candles }: { candles: Candle[] }) => {
        if (!candleSeriesRef.current || !volumeSeriesRef.current || !candles?.length) {
          setLoading(false);
          return;
        }

        candleSeriesRef.current.setData(
          candles.map((c) => ({ time: c.time as any, open: c.open, high: c.high, low: c.low, close: c.close })),
        );
        volumeSeriesRef.current.setData(
          candles.map((c) => ({
            time: c.time as any,
            value: c.volume,
            color: c.close >= c.open ? '#02559F22' : '#ef444422',
          })),
        );

        const lastCandle = candles[candles.length - 1];
        setLastClose(lastCandle?.close ?? null);
        lastBarTimeRef.current = lastCandle?.time ?? 0;
        chartRef.current?.timeScale().fitContent();
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [chartReady, symbol, interval]);

  // Update last candle with live price tick
  useEffect(() => {
    if (!livePrice || !candleSeriesRef.current || !lastClose || !lastBarTimeRef.current) return;

    candleSeriesRef.current.update({
      time: lastBarTimeRef.current as any,
      open: lastClose,
      high: Math.max(lastClose, livePrice),
      low: Math.min(lastClose, livePrice),
      close: livePrice,
    });
  }, [livePrice, lastClose]);

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 rounded-xl z-10">
          <Loader2 className="w-6 h-6 text-gray-600 animate-spin" />
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
