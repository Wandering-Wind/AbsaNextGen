import { CheckSquare, Square } from 'lucide-react'

/* Creating 3 checkable micro-actions for every single year that's going to be tracked
   This won't be steps the system can auto-detect from numbers from the profile user created
   Completions are managed by the parent via the useTrackProgress hook */
export default function MicroActions({ year, actions, completed, onToggle }) {
    if (!actions || actions.length === 0) return null

    const doneCount = completed.length
    const total     = actions.length
    const allDone   = doneCount === total

    return (
        <div className="micro-actions">
            <div className="micro-actions-header">
                <p className="micro-actions-title">Actions for this year</p>
                <span className={`micro-actions-count ${allDone ? 'micro-actions-count--done' : ''}`}>
                    {doneCount}/{total} complete
                </span>
            </div>

            <div className="micro-actions-list">
                {actions.map((action, i) => {
                    const isDone = completed.includes(String(i))
                    return (
                        <button
                            key={i}
                            className={`micro-action-item ${isDone ? 'micro-action-item--done' : ''}`}
                            onClick={() => onToggle(year, i)}
                            aria-pressed={isDone}
                            aria-label={action}
                        >
                            <span className="micro-action-icon" aria-hidden="true">
                                {isDone
                                    ? <CheckSquare size={15} color="var(--success)"  strokeWidth={2} />
                                    : <Square      size={15} color="var(--n-300)"    strokeWidth={2} />
                                }
                            </span>
                            <span className="micro-action-text">{action}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
