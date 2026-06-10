import { useNudges } from '../../context/NudgeContext'
import NudgeItem from './NudgeItem'

const MAX_VISIBLE = 3

export default function NudgeStack() {
    const { stackNudges, hideFromStack } = useNudges()

    const visible  = stackNudges.slice(0, MAX_VISIBLE)
    const overflow = stackNudges.length - MAX_VISIBLE

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
                    onHide={hideFromStack}
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
