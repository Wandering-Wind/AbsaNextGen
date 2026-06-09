import { useEffect, useRef } from 'react'
import { useNudges } from '../../context/NudgeContext'
import Icon from '../Icons'
import { TYPE_CONFIG } from './NudgeItem'

/* Single card in the history panel */
function HistoryCard({ nudge, dimmed }) {
    const config = TYPE_CONFIG[nudge.type] ?? TYPE_CONFIG.insight

    return (
        <div className={`nudge-history-card${dimmed ? ' nudge-history-card--dimmed' : ''}`}>
            <span
                className="nudge-type-badge"
                style={{
                    background:  config.bg,
                    color:       dimmed ? '#ADB5BD' : config.accent,
                    borderColor: dimmed ? '#DEE2E6' : config.border,
                }}
            >
                {config.label}
            </span>

            <div className="nudge-history-row">
                <span className="nudge-history-icon" aria-hidden="true">
                    <Icon
                        name={nudge.icon}
                        size={15}
                        colour={dimmed ? '#ADB5BD' : config.accent}
                    />
                </span>
                <div>
                    <p className="nudge-history-item-title">{nudge.title}</p>
                    <p className="nudge-history-item-text">{nudge.body}</p>
                </div>
            </div>
        </div>
    )
}

/* History panel */
export default function NudgeHistory({ onClose }) {
    const { activeNudges, dismissedNudges } = useNudges()
    const hasAny   = activeNudges.length > 0 || dismissedNudges.length > 0
    const panelRef = useRef(null)

    /* Close on Escape key */
    useEffect(() => {
        function handleKey(e) {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [onClose])

    /* Trap focus inside the panel when open */
    useEffect(() => {
        panelRef.current?.focus()
    }, [])

    return (
        <>
            {/* Transparent overlay - clicking outside closes the panel */}
            <div
                className="nudge-history-overlay"
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                className="nudge-history-panel"
                role="dialog"
                aria-label="Financial signal history"
                aria-modal="true"
                ref={panelRef}
                tabIndex={-1}
            >
                <div className="nudge-history-header">
                    <div>
                        <p className="nudge-history-eyebrow">Financial Signals</p>
                        <h3 className="nudge-history-heading">Your signal feed</h3>
                    </div>
                    <button
                        className="nudge-history-close"
                        onClick={onClose}
                        aria-label="Close signal history"
                    >
                        &times;
                    </button>
                </div>

                <div className="nudge-history-body">

                    {!hasAny && (
                        <p className="nudge-history-empty">
                            No signals yet. Enter your financial data in Money Snapshot
                            and signals will appear here automatically.
                        </p>
                    )}

                    {activeNudges.length > 0 && (
                        <section>
                            <p className="nudge-history-section-label">Active</p>
                            <div className="nudge-history-list">
                                {activeNudges.map(n => (
                                    <HistoryCard key={n.id} nudge={n} dimmed={false} />
                                ))}
                            </div>
                        </section>
                    )}

                    {dismissedNudges.length > 0 && (
                        <section>
                            <p className="nudge-history-section-label">Acknowledged</p>
                            <div className="nudge-history-list">
                                {dismissedNudges.map(n => (
                                    <HistoryCard key={n.id} nudge={n} dimmed={true} />
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            </div>
        </>
    )
}
