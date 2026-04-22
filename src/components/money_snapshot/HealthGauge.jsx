// src/components/charts/HealthGauge.jsx
// Circular SVG gauge — shows health score as a ring that fills from 0–100%
// Props: pct (number), label (string), status ('doing-well'|'coping'|'struggling')

export default function HealthGauge({ pct, label, status }) {
    const radius = 54
    const circumference = 2 * Math.PI * radius   // full circle length in px
    const filled = (pct / 100) * circumference    // how much of the ring to fill
    const gap    = circumference - filled         // the empty part

    const colour = {
        'doing-well':  '#22c55e',   // green
        'coping':      '#f59e0b',   // amber
        'struggling':  '#ef4444',   // red
    }[status] ?? '#aaa'

    return (
        <div className="health-gauge">
            <svg viewBox="0 0 120 120" width="120" height="120">
                {/* Background ring */}
                <circle
                    cx="60" cy="60" r={radius}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                />
                {/* Filled ring — starts at the top (rotate -90deg) */}
                <circle
                    cx="60" cy="60" r={radius}
                    fill="none"
                    stroke={colour}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${filled} ${gap}`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
                {/* Centre text */}
                <text
                    x="60" y="55"
                    textAnchor="middle"
                    fontSize="22"
                    fontWeight="700"
                    fill={colour}
                    dominantBaseline="middle"
                >
                    {pct}%
                </text>
                <text
                    x="60" y="74"
                    textAnchor="middle"
                    fontSize="10"
                    fill="#6b7280"
                >
                    health score
                </text>
            </svg>
            <p className={`health-gauge-label health-gauge-label--${status}`}>
                {label}
            </p>
        </div>
    )
}