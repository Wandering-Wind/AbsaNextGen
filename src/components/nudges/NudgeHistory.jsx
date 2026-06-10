import { useEffect, useRef } from 'react'
import { useNudges } from '../../context/NudgeContext'
import Icon from '../Icons'
import { TYPE_CONFIG } from './NudgeItem'

function HistoryCard({ nudge, onMarkRead, isRead }) {
    const config = TYPE_CONFIG[nudge.type] ?? TYPE_CONFIG.insight

    return (
        <div className={`nudge-history-card${isRead ? ' nudge-history-card--read' : ''}`}>
            <div className="nudge-history-card-top">
                <span
                    className="nudge-type-badge"
                    style={{
                        background:  isRead ? 'rgba(255,255,255,0.04)' : config.bg,
                        color:       isRead ? '#4b5563' : config.accent,
                        borderColor: isRead ? '#374151' : config.border,
                    }}
                >
                    {config.label}
                </span>

                {!isRead && (
                    <button
                        className="nudge-mark-read"
                        onClick={() => onMarkRead(nudge.id)}
                        aria-label="Mark as read"
                    >
                        Mark read
                    </button>
                )}
            </div>

            <div className="nudge-history-row">
                <span className="nudge-history-icon" aria-hidden="true">
                    <Icon
                        name={nudge.icon}
                        size={15}
                        colour={isRead ? '#4b5563' : config.accent}
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

export default function NudgeHistory({ onClose }) {
    const { activeNudges, readNudges, markAsRead } = useNudges()
    const hasAny   = activeNudges.length > 0 || readNudges.length > 0
    const panelRef = useRef(null)

    useEffect(() => {
        function handleKey(e) {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [onClose])

    useEffect(() => {
        panelRef.current?.focus()
    }, [])

    return (
        <>
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
                                    <HistoryCard
                                        key={n.id}
                                        nudge={n}
                                        onMarkRead={markAsRead}
                                        isRead={false}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {readNudges.length > 0 && (
                        <section>
                            <p className="nudge-history-section-label">Acknowledged</p>
                            <div className="nudge-history-list">
                                {readNudges.map(n => (
                                    <HistoryCard
                                        key={n.id}
                                        nudge={n}
                                        onMarkRead={markAsRead}
                                        isRead={true}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            </div>
        </>
    )
}
