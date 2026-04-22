// src/components/charts/ProgressBar.jsx
// Reusable progress bar — used for TFSA and emergency fund
// Props: value (number 0–100), colour, markers (optional array of { pct, label })

export default function ProgressBar({ value, colour = '#22c55e', markers = [] }) {
    const clamped = Math.min(100, Math.max(0, value))

    return (
        <div className="progress-bar-wrap">
            <div className="progress-bar-track">
                {/* Filled portion */}
                <div
                    className="progress-bar-fill"
                    style={{
                        width: `${clamped}%`,
                        background: colour,
                        transition: 'width 0.5s ease',
                    }}
                />
                {/* Marker lines (e.g. at 1 month, 3 months, 6 months) */}
                {markers.map((m, i) => (
                    <div
                        key={i}
                        className="progress-bar-marker"
                        style={{ left: `${m.pct}%` }}
                        title={m.label}
                    />
                ))}
            </div>
            {/* Marker labels below the bar */}
            {markers.length > 0 && (
                <div className="progress-bar-marker-labels">
                    {markers.map((m, i) => (
                        <span
                            key={i}
                            className="progress-bar-marker-label"
                            style={{ left: `${m.pct}%` }}
                        >
                            {m.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}