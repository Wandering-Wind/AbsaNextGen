import { useNudges } from '../../context/NudgeContext'
import NudgeItem from './NudgeItem'

/* Maximum number of cards visible at once in the floating stack thang */
const MAX_VISIBLE = 3

export default function NudgeStack() {
    const { activeNudges, dismissNudge } = useNudges()

    /* Show the highest-priority nudges first (since they are already sorted) */
    const visible  = activeNudges.slice(0, MAX_VISIBLE)
    const overflow = activeNudges.length - MAX_VISIBLE

    if (visible.length === 0) return null

    return (
        <div
            className="nudge-stack"
            aria-label="Financial signal stack"
            aria-live="polite"
        >
            {visible.map(nudge => (
                <NudgeItem
                    key={nudge.id}
                    nudge={nudge}
                    onDismiss={dismissNudge}
                />
            ))}

            {overflow > 0 && (
                <div className="nudge-overflow" aria-live="polite">
                    +{overflow} more signal{overflow > 1 ? 's' : ''}
                </div>
            )}
        </div>
    )
}
