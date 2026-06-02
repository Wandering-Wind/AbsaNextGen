/* Shared horizontal timeline used by all three Strategy Track pages.
   Pass milestones, the currently selected year, and an onSelect handler.

   Each milestone object needs:
     { year, label, sublabel, status: 'done' | 'active' | 'upcoming' } */

export default function TrackTimeline({ milestones, selectedYear, onSelect }) {
    return (
        <div className="pp-timeline-wrap">
            <div className="pp-timeline">
                {milestones.map((m, i) => (
                    <div key={m.year} className="pp-timeline-col">
                        {i < milestones.length - 1 && (
                            <div className={`pp-connector ${m.status === 'done' ? 'pp-connector--filled' : ''}`}/>
                        )}
                        <button
                            className={[
                                'pp-node',
                                m.status === 'done'    ? 'pp-node--done'   : '',
                                m.status === 'active'  ? 'pp-node--active' : '',
                                selectedYear === m.year ? 'pp-node--selected' : '',
                            ].join(' ')}
                            onClick={() => onSelect(m.year)}
                            aria-label={`Year ${m.year}: ${m.label}`}
                        >
                            {m.status === 'done' ? '✓' : m.year}
                            {/* Find icon for the placeholder correct tick above */}
                        </button>
                        <span className="pp-node-label">{m.label}</span>
                        <span className="pp-node-sublabel">{m.sublabel}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
