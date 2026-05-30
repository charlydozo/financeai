'use client';

import { useEffect, useRef } from 'react';
import {
  Chart,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
} from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

interface Props {
  labels: string[];
  values: number[];
}

export function BarChartWidget({ labels, values }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const accent =
      getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#6B93FF';

    const colors = values.map((_, i) =>
      i === values.length - 1 ? accent : `${accent}40`,
    );

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${(ctx.parsed.y ?? 0).toLocaleString('fr-FR', {
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                })}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: 'var(--text-3)',
              font: { size: 10 },
            },
          },
          y: { display: false },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels, values]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}
