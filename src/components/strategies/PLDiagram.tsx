'use client';

import { useState, useRef, useCallback } from 'react';
import { generateCurve, type PayoffPoint } from '@/lib/strategies/payoff';

interface PLDiagramProps {
  type: 'STRADDLE' | 'BUTTERFLY' | 'STRANGLE';
  config: any;
}

const W = 560;
const H = 220;
const PAD = { top: 16, right: 20, bottom: 36, left: 60 };
const PW = W - PAD.left - PAD.right;
const PH = H - PAD.top - PAD.bottom;

export function PLDiagram({ type, config }: PLDiagramProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; price: number; pl: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const points: PayoffPoint[] = generateCurve(type, config, 100);
  const prices = points.map((p) => p.price);
  const pls = points.map((p) => p.pl);

  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const minPL = Math.min(...pls);
  const maxPL = Math.max(...pls);
  const plSpan = maxPL - minPL || 1;

  const toX = (price: number) => PAD.left + ((price - minP) / (maxP - minP)) * PW;
  const toY = (pl: number) => PAD.top + PH - ((pl - minPL) / plSpan) * PH;
  const zeroY = toY(0);

  // SVG path for the P&L line
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.price).toFixed(1)},${toY(p.pl).toFixed(1)}`)
    .join(' ');

  // Fill above/below zero
  const profitPath = [
    `M${toX(points[0].price).toFixed(1)},${Math.min(zeroY, toY(points[0].pl)).toFixed(1)}`,
    ...points.map((p) => `L${toX(p.price).toFixed(1)},${Math.min(zeroY, toY(p.pl)).toFixed(1)}`),
    `L${toX(points.at(-1)!.price).toFixed(1)},${zeroY.toFixed(1)}`,
    `L${toX(points[0].price).toFixed(1)},${zeroY.toFixed(1)}Z`,
  ].join(' ');

  const lossPath = [
    `M${toX(points[0].price).toFixed(1)},${Math.max(zeroY, toY(points[0].pl)).toFixed(1)}`,
    ...points.map((p) => `L${toX(p.price).toFixed(1)},${Math.max(zeroY, toY(p.pl)).toFixed(1)}`),
    `L${toX(points.at(-1)!.price).toFixed(1)},${zeroY.toFixed(1)}`,
    `L${toX(points[0].price).toFixed(1)},${zeroY.toFixed(1)}Z`,
  ].join(' ');

  // Breakeven annotations
  const breakevenPrices: number[] = [];
  for (let i = 1; i < points.length; i++) {
    if ((points[i - 1].pl < 0 && points[i].pl >= 0) || (points[i - 1].pl >= 0 && points[i].pl < 0)) {
      breakevenPrices.push((points[i - 1].price + points[i].price) / 2);
    }
  }

  // Y axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks }, (_, i) => minPL + (i / (yTicks - 1)) * plSpan);

  // Mouse handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = W / rect.width;
      const svgX = (e.clientX - rect.left) * scaleX;
      const price = minP + ((svgX - PAD.left) / PW) * (maxP - minP);
      if (price < minP || price > maxP) { setTooltip(null); return; }

      // Find nearest point
      const nearest = points.reduce((best, p) =>
        Math.abs(p.price - price) < Math.abs(best.price - price) ? p : best,
      );

      setTooltip({
        x: toX(nearest.price),
        y: toY(nearest.pl),
        price: nearest.price,
        pl: nearest.pl,
      });
    },
    [points, minP, maxP],
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: H }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Y axis ticks & grid */}
        {yTickValues.map((v, i) => {
          const y = toY(v);
          return (
            <g key={i}>
              <line x1={PAD.left} y1={y} x2={PAD.left + PW} y2={y} stroke="#1f2937" strokeWidth={1} />
              <text
                x={PAD.left - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={9}
                fill="#6b7280"
              >
                {v >= 0 ? `+${v.toFixed(0)}` : v.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* X axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const price = minP + t * (maxP - minP);
          const x = toX(price);
          return (
            <g key={i}>
              <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + PH} stroke="#1f2937" strokeWidth={1} />
              <text x={x} y={H - 8} textAnchor="middle" fontSize={9} fill="#6b7280">
                ${price.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        {zeroY >= PAD.top && zeroY <= PAD.top + PH && (
          <line
            x1={PAD.left}
            y1={zeroY}
            x2={PAD.left + PW}
            y2={zeroY}
            stroke="#374151"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        )}

        {/* Profit fill (green) */}
        <path d={profitPath} fill="#02559F" fillOpacity={0.12} />

        {/* Loss fill (red) */}
        <path d={lossPath} fill="#ef4444" fillOpacity={0.12} />

        {/* P&L line */}
        <path d={linePath} fill="none" stroke="#02559F" strokeWidth={2} strokeLinejoin="round" />

        {/* Breakeven vertical lines */}
        {breakevenPrices.map((bp, i) => {
          const x = toX(bp);
          return (
            <g key={i}>
              <line
                x1={x} y1={PAD.top} x2={x} y2={PAD.top + PH}
                stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3"
              />
              <text x={x} y={PAD.top - 3} textAnchor="middle" fontSize={8} fill="#f59e0b">
                BE ${bp.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Tooltip crosshair + bubble */}
        {tooltip && (
          <g>
            <line
              x1={tooltip.x} y1={PAD.top} x2={tooltip.x} y2={PAD.top + PH}
              stroke="#9ca3af" strokeWidth={1} strokeDasharray="2 2"
            />
            <circle cx={tooltip.x} cy={tooltip.y} r={4} fill={tooltip.pl >= 0 ? '#02559F' : '#ef4444'} />
            <rect
              x={Math.min(tooltip.x + 8, W - 90)}
              y={Math.max(tooltip.y - 22, PAD.top)}
              width={82}
              height={32}
              rx={4}
              fill="#111827"
              stroke="#374151"
              strokeWidth={1}
            />
            <text
              x={Math.min(tooltip.x + 12, W - 86)}
              y={Math.max(tooltip.y - 9, PAD.top + 13)}
              fontSize={9}
              fill="#9ca3af"
            >
              ${tooltip.price.toFixed(2)}
            </text>
            <text
              x={Math.min(tooltip.x + 12, W - 86)}
              y={Math.max(tooltip.y + 4, PAD.top + 26)}
              fontSize={10}
              fontWeight="600"
              fill={tooltip.pl >= 0 ? '#02559F' : '#ef4444'}
            >
              {tooltip.pl >= 0 ? '+' : ''}${tooltip.pl.toFixed(2)}
            </text>
          </g>
        )}

        {/* Axes borders */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PH} stroke="#374151" strokeWidth={1} />
        <line x1={PAD.left} y1={PAD.top + PH} x2={PAD.left + PW} y2={PAD.top + PH} stroke="#374151" strokeWidth={1} />
      </svg>
    </div>
  );
}
