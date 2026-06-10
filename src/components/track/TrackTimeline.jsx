/* Shared horizontal timeline used by all three Strategy Track pages
   Each milestone object needs: { year, label, sublabel, status: 'done' | 'active' | 'upcoming' }
    progressMap is optional. When provided, shape is:
     { 1: { done: 2, total: 3 }, 2: { done: 0, total: 3 }, ... }
   Using to show the X/3 action counter beneath each node */

export default function TrackTimeline({ milestones, selectedYear, onSelect, progressMap }) {
    return (
        <div className="pp-timeline-wrap">
            <div className="pp-timeline">
                {milestones.map((m, i) => {
                    const prog    = progressMap?.[m.year]
                    const allDone = prog && prog.done === prog.total && prog.total > 0

                    return (
                        <div key={m.year} className="pp-timeline-col">
                            {i < milestones.length - 1 && (
                                <div className={`pp-connector ${m.status === 'done' ? 'pp-connector--filled' : ''}`}/>
                            )}

                            <button
                                className={[
                                    'pp-node',
                                    m.status === 'done'     ? 'pp-node--done'     : '',
                                    m.status === 'active'   ? 'pp-node--active'   : '',
                                    selectedYear === m.year ? 'pp-node--selected' : '',
                                ].join(' ')}
                                onClick={() => onSelect(m.year)}
                                aria-label={`Year ${m.year}: ${m.label}`}
                                aria-pressed={selectedYear === m.year}
                            >
                                {m.status === 'done' ? '✓' : m.year}
                            </button>

                            <span className="pp-node-label">{m.label}</span>
                            <span className="pp-node-sublabel">{m.sublabel}</span>

                            {/* Action counter - only shown when progressMap is provided */}
                            {prog && (
                                <span className={`pp-node-actions ${allDone ? 'pp-node-actions--done' : ''}`}>
                                    {prog.done}/{prog.total}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
