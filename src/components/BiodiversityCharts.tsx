import { useState } from 'react';
import { DatasetAnalytics } from '../types/edna.ts';

interface BiodiversityChartsProps {
  analytics: DatasetAnalytics;
}

const PHYLUM_COLORS = [
  '#059669',
  '#0284C7',
  '#0D9488',
  '#0369A1',
  '#10B981',
  '#0EA5E9',
  '#15803D',
];

export function BiodiversityCharts({ analytics }: BiodiversityChartsProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    readsSampled: number;
    expectedSpecies: number;
    x: number;
    y: number;
  } | null>(null);

  const curve = analytics.rarefactionCurve || [];
  const maxReads = Math.max(1, ...curve.map((p) => p.readsSampled));
  const maxSpecies = Math.max(1, ...curve.map((p) => p.expectedSpecies));

  const svgWidth = 520;
  const svgHeight = 220;
  const padL = 44;
  const padR = 16;
  const padT = 18;
  const padB = 34;
  const plotW = svgWidth - padL - padR;
  const plotH = svgHeight - padT - padB;

  const toX = (reads: number) => padL + (reads / maxReads) * plotW;
  const toY = (species: number) => padT + plotH - (species / maxSpecies) * plotH;

  const pathD =
    curve.length > 0
      ? curve
          .map(
            (pt, idx) =>
              `${idx === 0 ? 'M' : 'L'} ${toX(pt.readsSampled).toFixed(1)} ${toY(pt.expectedSpecies).toFixed(1)}`
          )
          .join(' ')
      : '';

  const areaD =
    curve.length > 0
      ? `${pathD} L ${toX(curve[curve.length - 1].readsSampled).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${toX(curve[0].readsSampled).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
      : '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Chart 1: Hurlbert Rarefaction Curve */}
      <div className="bg-white border border-[#D8E5E1] rounded-xl p-5">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-semibold text-[#0B2528]">
              Hurlbert Rarefaction Curve
            </h3>
            <p className="text-xs text-[#4A6366] mt-0.5">
              Expected species richness vs. sequencing read depth
            </p>
          </div>
          {hoveredPoint && (
            <div className="text-xs font-mono tabular-nums text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-md">
              {hoveredPoint.readsSampled} reads · {hoveredPoint.expectedSpecies} taxa
            </div>
          )}
        </div>

        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto cursor-crosshair"
            role="img"
            aria-label="Hurlbert Rarefaction Curve showing expected species richness across read depths"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = padT + plotH * (1 - frac);
              const val = (maxSpecies * frac).toFixed(1);
              return (
                <g key={frac}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={svgWidth - padR}
                    y2={y}
                    stroke="#E7F0ED"
                    strokeWidth="1"
                  />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-[#4A6366] text-[10px] font-mono"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* X-axis ticks */}
            {[0, 0.5, 1].map((frac) => {
              const x = padL + plotW * frac;
              const val = Math.round(maxReads * frac);
              return (
                <text
                  key={frac}
                  x={x}
                  y={svgHeight - 8}
                  textAnchor="middle"
                  className="fill-[#4A6366] text-[10px] font-mono"
                >
                  {val} reads
                </text>
              );
            })}

            {areaD && <path d={areaD} fill="#0284C7" fillOpacity="0.1" />}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#0284C7"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {hoveredPoint && (
              <line
                x1={hoveredPoint.x}
                y1={padT}
                x2={hoveredPoint.x}
                y2={padT + plotH}
                stroke="#059669"
                strokeDasharray="3 3"
                strokeWidth="1.2"
              />
            )}

            {curve.map((pt, i) => {
              const cx = toX(pt.readsSampled);
              const cy = toY(pt.expectedSpecies);
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r={hoveredPoint?.readsSampled === pt.readsSampled ? 5 : 3.5}
                  fill="#059669"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      readsSampled: pt.readsSampled,
                      expectedSpecies: pt.expectedSpecies,
                      x: cx,
                      y: cy,
                    })
                  }
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Chart 2: Taxonomic Phylum Composition & Rank Abundance */}
      <div className="bg-white border border-[#D8E5E1] rounded-xl p-5 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-semibold text-[#0B2528]">
            Phylum Read Composition
          </h3>
          <p className="text-xs text-[#4A6366] mt-0.5 mb-4">
            Relative amplicon read proportion across detected phyla
          </p>

          {/* Segmented Composition Bar */}
          <div className="w-full h-4 rounded-md overflow-hidden flex bg-[#F0F6F4] mb-5">
            {analytics.phylumBreakdown.map((item, idx) => (
              <div
                key={item.phylum}
                style={{
                  width: `${Math.max(item.percentage, 2)}%`,
                  backgroundColor: PHYLUM_COLORS[idx % PHYLUM_COLORS.length],
                }}
                title={`${item.phylum}: ${item.percentage}% (${item.reads} reads)`}
              />
            ))}
          </div>

          <div className="space-y-3">
            {analytics.phylumBreakdown.map((item, idx) => (
              <div key={item.phylum} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{
                        backgroundColor: PHYLUM_COLORS[idx % PHYLUM_COLORS.length],
                      }}
                    />
                    <span className="font-medium text-[#0B2528] truncate">
                      {item.phylum}
                    </span>
                    <span className="text-[#4A6366]">
                      · {item.speciesCount} {item.speciesCount === 1 ? 'taxon' : 'taxa'}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums text-[#0B2528] shrink-0">
                    {item.reads.toLocaleString()} reads ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#F0F6F4] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: PHYLUM_COLORS[idx % PHYLUM_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#E7F0ED] flex items-center justify-between text-xs text-[#4A6366] font-mono tabular-nums">
          <span>Margalef Richness d = {analytics.margalefRichness.toFixed(3)}</span>
          <span>Total Reads N = {analytics.totalReads.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
