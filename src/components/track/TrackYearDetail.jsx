/* Shared year detail panel used by all three Strategy Track pages.

   Expected milestone shape:
   {
     year, label, sublabel,
     mainTarget, mainCurrent, mainLabel,
     progressPct, progressLabel,
     insight,
     focus: string[],
     avoid: string[],
     why,
     saContext,
     warning:   string | null  - contextual alert from profile data, null when not triggered
     tradeoffs: [{ type: 'prioritise' | 'avoid', heading: string, body: string }]
   }

   Optional props for micro-actions (from useTrackProgress):
     actions:   string[]  - the 3 action strings for this year
     completed: string[]  - completed action indices as strings
     onToggle:  (year, idx) => void
*/

import Icon         from '../Icons'
import MicroActions from './MicroActions'
import { fmtZAR }  from '../financialCalcs'

export default function TrackYearDetail({ milestone: m, actions, completed, onToggle }) {
    if (!m) return null
    const pct = m.progressPct ?? 0

    return (
        <div className="pp-detail">
            <div className="pp-detail-header">
                <div className="pp-detail-year-tag">Year {m.year}</div>
                <h2 className="pp-detail-title">{m.label}</h2>
                <p className="pp-detail-sublabel">{m.sublabel}</p>
            </div>

            {/* Financial progress card (auto-calculated from profile data) */}
            <div className="pp-detail-progress-card">
                <div className="pp-progress-top">
                    <div>
                        <p className="pp-progress-label">{m.mainLabel}</p>
                        <p className="pp-progress-target">{fmtZAR(m.mainTarget)}</p>
                    </div>
                    <div className="pp-progress-right">
                        <p className="pp-progress-label">{m.currentLabel ?? 'You have'}</p>
                        <p className="pp-progress-current">{fmtZAR(m.mainCurrent)}</p>
                    </div>
                </div>
                <div className="pp-progress-bar-track">
                    <div
                        className={`pp-progress-bar-fill ${pct >= 100 ? 'pp-progress-bar-fill--done' : ''}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="pp-progress-footer">
                    <span>{m.progressLabel}</span>
                    <span className="pp-progress-pct">{pct}%</span>
                </div>
            </div>

            {/* Contextual warning which will only be rendered when the user's profile triggers a specific risk */}
            {m.warning && (
                <div className="pp-inline-alert pp-inline-alert--warn">
                    <Icon name="warn" size={13}/>
                    {m.warning}
                </div>
            )}

            {/* Insight callout */}
            <div className="pp-insight">
                <Icon name="nudge" size={14} colour="var(--warning)"/>
                <p>{m.insight}</p>
            </div>

            {/* Focus and avoid grid */}
            <div className="pp-content-grid">
                <div className="pp-content-block">
                    <p className="pp-block-title">What to focus on</p>
                    <ul className="pp-focus-list">
                        {m.focus.map((item, i) => (
                            <li key={i}>
                                <span className="pp-focus-dot"/>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="pp-content-block">
                    <p className="pp-block-title">What to avoid</p>
                    <div className="pp-avoid-pills">
                        {m.avoid.map((item, i) => (
                            <span key={i} className="pp-avoid-pill">{item}</span>
                        ))}
                    </div>
                    <p className="pp-block-title" style={{ marginTop: '1rem' }}>Why this year matters</p>
                    <p className="pp-why-text">{m.why}</p>
                </div>
            </div>

            {/* Decision trade-offs on the tension between two valid choices */}
            {m.tradeoffs && m.tradeoffs.length > 0 && (
                <div className="pp-content-block">
                    <p className="pp-block-title">Decision trade-offs</p>
                    {m.tradeoffs.map((t, i) => (
                        <div key={i} className={`tradeoff-box tradeoff-box--${t.type}`}>
                            <strong>{t.heading}</strong>
                            <p>{t.body}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Micro-actions - behavioral checkboxes the system cannot auto-detect */}
            {actions && actions.length > 0 && (
                <MicroActions
                    year={m.year}
                    actions={actions}
                    completed={completed ?? []}
                    onToggle={onToggle}
                />
            )}

            {/* SA context */}
            <div className="pp-sa-context">
                <div className="pp-sa-context-label">
                    <Icon name="bank" size={13} colour="var(--absa-red)"/>
                    SA Context
                </div>
                <p>{m.saContext}</p>
            </div>
        </div>
    )
}
