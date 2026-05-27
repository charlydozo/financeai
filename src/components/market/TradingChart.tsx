'use client';

import { useEffect, useRef } from 'react';

const CONTAINER_ID = 'tv_advanced_chart';
const TV_SCRIPT_ID = 'tradingview-tv-js';

export function TradingChart({ symbol }: { symbol: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = '';
    let cancelled = false;

    function createWidget() {
      if (cancelled || !containerRef.current) return;
      new (window as any).TradingView.widget({
        autosize: true,
        symbol: symbol.toUpperCase(),
        interval: 'D',
        timezone: 'Europe/Paris',
        theme: 'dark',
        style: '1',
        locale: 'fr',
        enable_publishing: false,
        allow_symbol_change: false,
        withdateranges: true,
        hide_side_toolbar: false,
        details: true,
        container_id: CONTAINER_ID,
      });
    }

    if (typeof (window as any).TradingView !== 'undefined') {
      createWidget();
    } else {
      let script = document.getElementById(TV_SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = TV_SCRIPT_ID;
        script.src = 'https://s3.tradingview.com/tv.js';
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener('load', createWidget, { once: true });
    }

    return () => {
      cancelled = true;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol]);

  return <div ref={containerRef} id={CONTAINER_ID} className="w-full h-full" />;
}
