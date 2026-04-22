// src/components/charts/DonutChart.jsx
// SVG donut chart for expense breakdown
// Props: segments — array of { label, value, colour }

export default function DonutChart({ segments }) {
    const total = segments.reduce((sum, s) => sum + s.value, 0)

    if (total === 0) {
        return <p className="chart-empty">No expenses entered yet.</p>
    }

    const radius = 50
    const circumference = 2 * Math.PI * radius
    const cx = 70
    const cy = 70

    // Build each arc segment
    let cumulativePct = 0
    const arcs = segments
        .filter(s => s.value > 0)
        .map(s => {
            const pct    = s.value / total
            const offset = circumference - (cumulativePct * circumference)
            const dash   = pct * circumference
            cumulativePct += pct
            return { ...s, pct, dash, offset }
        })

    return (
        <div className="donut-chart">
            <svg viewBox="0 0 140 140" width="180" height="180">
                {arcs.map((arc, i) => (
                    <circle
                        key={i}
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke={arc.colour}
                        strokeWidth="20"
                        strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                        strokeDashoffset={arc.offset}
                        transform={`rotate(-90 ${cx} ${cy})`}
                        style={{ transition: 'stroke-dasharray 0.5s ease' }}
                    />
                ))}
                {/* Centre label */}
                <text x={cx} y={cy - 6} textAnchor="middle" fontSize="9" fill="#6b7280">
                    total expenses
                </text>
                <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#111">
                    {new Intl.NumberFormat('en-ZA', {
                        style: 'currency', currency: 'ZAR',
                        maximumFractionDigits: 0
                    }).format(total)}
                </text>
            </svg>

            {/* Legend */}
            <ul className="donut-legend">
                {arcs.map((arc, i) => (
                    <li key={i} className="donut-legend-item">
                        <span
                            className="donut-legend-dot"
                            style={{ background: arc.colour }}
                        />
                        <span className="donut-legend-label">{arc.label}</span>
                        <span className="donut-legend-pct">
                            {Math.round(arc.pct * 100)}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}