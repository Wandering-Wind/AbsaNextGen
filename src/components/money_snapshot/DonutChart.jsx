import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

/* Custom tooltip shown when hovering a slice
   'active' and 'payload' are props Recharts passes in automatically */
function DonutTooltip({ active, payload, total }) {
    if (!active || !payload?.length) return null
    const item = payload[0]
    return (
        <div className="chart-tooltip">
            <span className="chart-tooltip-label">{item.name}</span>
            <span className="chart-tooltip-value">
                R {Math.round(item.value).toLocaleString('en-ZA')}
            </span>
            <span className="chart-tooltip-pct">
                {Math.round((item.value / total) * 100)}% of expenses
            </span>
        </div>
    )
}

export default function DonutChart({ segments }) {
    /* Filter out zero values */
    const data  = segments.filter(s => s.value > 0)
    const total = data.reduce((sum, s) => sum + s.value, 0)

    if (total === 0) {
        return <p className="chart-empty">No expenses entered yet.</p>
    }

    return (
        <div className="donut-chart">
                <div style={{ position: 'relative', width: 180, height: 180, flexShrink: 0 }}>
                <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={48}
                            outerRadius={68}
                            dataKey="value"
                            nameKey="label"
                            paddingAngle={1}
                            startAngle={90}
                            endAngle={-270}
                            strokeWidth={0}
                        >
                            {data.map((entry, i) => (
                                <Cell key={i} fill={entry.colour}/>
                            ))}
                        </Pie>
                        <Tooltip
                            content={<DonutTooltip total={total}/>}
                            cursor={false}
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    pointerEvents: 'none',
                }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--n-500)', lineHeight: 1.3 }}>
                        total expenses
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--n-900)', lineHeight: 1.3 }}>
                        R {Math.round(total).toLocaleString('en-ZA')}
                    </div>
                </div>
            </div>

            <ul className="donut-legend">
                {data.map((arc, i) => (
                    <li key={i} className="donut-legend-item">
                        <span className="donut-legend-dot" style={{ background: arc.colour }}/>
                        <span className="donut-legend-label">{arc.label}</span>
                        <span className="donut-legend-pct">
                            {Math.round((arc.value / total) * 100)}%
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
