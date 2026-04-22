export default function ProgressBar({ value, colour = '#22c55e', markers = [] }) {
    const clamped = Math.min(100, Math.max(0, value))

    return (
        <div className="progress-bar-wrap">
            <div className="progress-bar-track">
                {/* Filled section ting */}
                <div
                    className="progress-bar-fill"
                    style={{
                        width: `${clamped}%`,
                        background: colour,
                        transition: 'width 0.5s ease',
                    }}
                />
                {/* Marker lines ( like 1, 3, 6 months) */}
                {markers.map((m, i) => (
                    <div
                        key={i}
                        className="progress-bar-marker"
                        style={{ left: `${m.pct}%` }}
                        title={m.label}
                    />
                ))}
            </div>
            {/* Marker labels below the bar legend ting*/}
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