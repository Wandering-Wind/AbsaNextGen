import { useState, useEffect, useRef } from 'react'
import Icon from '../Icons'

/* Each nudge type gets an accent colour and badge tint */
export const TYPE_CONFIG = {
    alert: {
        label:  'ALERT',
        accent: '#ef4444',
        bg:     'rgba(153,27,27,0.18)',
        border: 'rgba(239,68,68,0.28)',
    },
    win: {
        label:  'MILESTONE',
        accent: '#16a34a',
        bg:     'rgba(22,101,52,0.18)',
        border: 'rgba(22,163,74,0.28)',
    },
    insight: {
        label:  'INSIGHT',
        accent: '#94a3b8',
        bg:     'rgba(55,65,81,0.35)',
        border: 'rgba(100,116,139,0.3)',
    },
    reminder: {
        label:  'REMINDER',
        accent: '#b45309',
        bg:     'rgba(146,64,14,0.18)',
        border: 'rgba(180,83,9,0.28)',
    },
}

const AUTO_DISMISS_MS = 8000

export default function NudgeItem({ nudge, onHide }) {
    const [exiting, setExiting] = useState(false)
    const timerRef = useRef(null)

    const config = TYPE_CONFIG[nudge.type] ?? TYPE_CONFIG.insight

    /* Hides from stack only - does not mark as read in the panel */
    function triggerExit() {
        if (exiting) return
        clearTimeout(timerRef.current)
        setExiting(true)
        setTimeout(() => onHide(nudge.id), 320)
    }

    useEffect(() => {
        timerRef.current = setTimeout(triggerExit, AUTO_DISMISS_MS)
        return () => clearTimeout(timerRef.current)
    }, [])

    return (
        <div
            className={`nudge-item nudge-item--${nudge.type}${exiting ? ' nudge-item--exiting' : ''}`}
            role="alert"
            aria-live="polite"
            aria-label={`${config.label}: ${nudge.title}`}
        >
            <div className="nudge-item-inner">

                <div className="nudge-header">
                    <span
                        className="nudge-type-badge"
                        style={{
                            background:  config.bg,
                            color:       config.accent,
                            borderColor: config.border,
                        }}
                    >
                        {config.label}
                    </span>

                    <button
                        className="nudge-dismiss"
                        onClick={triggerExit}
                        aria-label="Dismiss this signal"
                    >
                        &times;
                    </button>
                </div>

                <div className="nudge-body">
                    <span className="nudge-icon" aria-hidden="true">
                        <Icon name={nudge.icon} size={18} colour={config.accent} />
                    </span>
                    <div className="nudge-content">
                        <p className="nudge-title">{nudge.title}</p>
                        <p className="nudge-text">{nudge.body}</p>
                    </div>
                </div>

            </div>

            {/* Depleting timer bar along the bottom */}
            <div
                className="nudge-progress"
                style={{
                    background:        config.accent,
                    animationDuration: `${AUTO_DISMISS_MS}ms`,
                }}
                aria-hidden="true"
            />
        </div>
    )
}
