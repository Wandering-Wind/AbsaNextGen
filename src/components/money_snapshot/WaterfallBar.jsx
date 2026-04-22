import { fmtZAR } from '../financialCalcs'

export default function WaterfallBar({ gross, raAmount, payeAmount, expenses, surplus }) {
    if (gross === 0) return null

    const segments = [
        { label: 'RA',       value: raAmount,   colour: '#818cf8' },
        { label: 'PAYE',     value: payeAmount,  colour: '#f87171' },
        { label: 'Expenses', value: expenses,    colour: '#fb923c' },
        { label: 'Surplus',  value: Math.max(0, surplus), colour: '#4ade80' },
    ]

    const total = segments.reduce((s, seg) => s + seg.value, 0)
    const scale = gross > 0 ? gross : total

    return (
        <div className="waterfall">
            <p className="waterfall-title">
                Where does {fmtZAR(gross)}/month go?
            </p>

            {/* Stacked bar thing */}
            <div className="waterfall-bar">
                {segments.map((seg, i) => {
                    const widthPct = Math.min(100, (seg.value / scale) * 100)
                    if (widthPct === 0) return null
                    return (
                        <div
                            key={i}
                            className="waterfall-segment"
                            style={{
                                width: `${widthPct}%`,
                                background: seg.colour,
                            }}
                            title={`${seg.label}: ${fmtZAR(seg.value)}`}
                        />
                    )
                })}
            </div>

            <div className="waterfall-legend">
                {segments.map((seg, i) => (
                    <div key={i} className="waterfall-legend-item">
                        <span
                            className="waterfall-dot"
                            style={{ background: seg.colour }}
                        />
                        <span className="waterfall-legend-label">{seg.label}</span>
                        <span className="waterfall-legend-value">{fmtZAR(seg.value)}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}