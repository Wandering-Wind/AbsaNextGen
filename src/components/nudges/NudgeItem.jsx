import { useState, useEffect, useRef } from 'react'
import Icon from '../Icons'

/* Each typa nudge gets its own accent colour, background tint,
   border colour, and label text */
export const TYPE_CONFIG = {
    alert: {
        label:    'ALERT',
        accent:   '#DC2626',
        bg:       '#FEF2F2',
        border:   '#FECACA',
    },
    win: {
        label:    'MILESTONE',
        accent:   '#15803D',
        bg:       '#F0FDF4',
        border:   '#BBF7D0',
    },
    insight: {
        label:    'INSIGHT',
        accent:   '#2563EB',
        bg:       '#EFF6FF',
        border:   '#BFDBFE',
    },
    reminder: {
        label:    'REMINDER',
        accent:   '#B45309',
        bg:       '#FFFBEB',
        border:   '#FDE68A',
    },
}

/* Automatic dismissing timer in milliseconds */
const AUTO_DISMISS_MS = 8000

export default function NudgeItem({ nudge, onDismiss }) {
    const [exiting, setExiting] = useState(false)
    const timerRef = useRef(null)

    const config = TYPE_CONFIG[nudge.type] ?? TYPE_CONFIG.insight

    /* Trigger the slide-out animation, then call onDismiss after it finishes */
    function triggerExit() {
        if (exiting) return
        clearTimeout(timerRef.current)
        setExiting(true)
        /* 320ms matches the CSS slide-out animation duration */
        setTimeout(() => onDismiss(nudge.id), 320)
    }

    /* Start the auto-dismiss countdown on mount */
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
                            background:   config.bg,
                            color:        config.accent,
                            borderColor:  config.border,
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

            {/* Depleting progress bar - visual countdown to auto-dismiss */}
            <div
                className="nudge-progress"
                style={{
                    background:         config.accent,
                    animationDuration:  `${AUTO_DISMISS_MS}ms`,
                }}
                aria-hidden="true"
            />
        </div>
    )
}
