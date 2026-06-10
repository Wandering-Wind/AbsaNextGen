import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useUserProfile } from '../context/UserProfileContext'
import {
    calcNetSurplus, calcDTI, calcEmergencyMonths, fmtZAR,
} from '../components/financialCalcs'
import Icon    from '../components/Icons'
import Tooltip  from '../components/Tooltip'
import '../styles/pages/TracksHub.css'

/* Compound future value of a regular monthly deposit */
function projectedValue(monthlyAmount, years, annualRate) {
    if (monthlyAmount <= 0) return 0
    const r = annualRate / 12
    const n = years * 12
    return Math.round(monthlyAmount * ((Math.pow(1 + r, n) - 1) / r))
}

/* Track definitions - might change to having static content with one of them being recommended
   Note: it's currently feeling like the numbers are more critisizing the user rather than inviting them in
*/
const TRACKS = [
    {
        id:          'property',
        path:        '/tracks/property',
        eyebrow:     '5-YEAR TRACK',
        title:       'First Property Path',
        description: 'A structured plan to buy your first home in Johannesburg. Covers emergency fund, deposit savings, bond pre-approval, transfer costs, and ownership - in that order.',
        stats: [
            { label: 'Horizon',   value: '5 years'    },
            { label: 'Min/month', value: 'R2 000+'    },
            { label: 'Risk',      value: 'Low-medium' },
        ],
        tableRow: {
            goal:    'Own first home',
            tool:    'RA + TFSA',
            suited:  'DTI under 36%',
        },
        color:       '#E2001A',
        colorBg:     '#FFF0F1',
        colorBorder: '#FCCDD1',
        iconName:    'bank',
        projYears:   5,
        projRate:    0.075,
        projLabel:   'Projected deposit saved',
        projNote:    'at 7.5% p.a. on 60% of your surplus',
        cta:         'Start Property Path',
    },
    {
        id:          'investing',
        path:        '/tracks/global-investing',
        eyebrow:     '5-YEAR TRACK',
        title:       'Global Investing',
        description: 'Build a dual portfolio across JSE equities and offshore exposure. TFSA-first, scaling into international markets as your balance grows.',
        stats: [
            { label: 'Horizon',   value: '5 years'     },
            { label: 'Min/month', value: 'R500+'        },
            { label: 'Risk',      value: 'Medium-high'  },
        ],
        tableRow: {
            goal:    'Build portfolio',
            tool:    'TFSA + RA',
            suited:  'Any profile',
        },
        color:       '#2563EB',
        colorBg:     '#EFF6FF',
        colorBorder: '#BFDBFE',
        iconName:    'tfsa',
        projYears:   5,
        projRate:    0.11,
        projLabel:   'Portfolio value estimate',
        projNote:    'at 11% p.a. on 50% of surplus + TFSA',
        cta:         'Start Investing Track',
    },
    {
        id:          'travel',
        path:        '/tracks/travel',
        eyebrow:     '1-3 YEAR TRACK',
        title:       'Travel Fund',
        description: 'Save toward a meaningful travel goal - regional or international. Short enough to feel achievable, structured enough to actually happen.',
        stats: [
            { label: 'Horizon',   value: '1-3 years' },
            { label: 'Min/month', value: 'R1 000+'   },
            { label: 'Risk',      value: 'Low'        },
        ],
        tableRow: {
            goal:    'Travel fund',
            tool:    'TFSA',
            suited:  'Any surplus',
        },
        color:       '#B45309',
        colorBg:     '#FFFBEB',
        colorBorder: '#FDE68A',
        iconName:    'target',
        projYears:   2,
        projRate:    0.075,
        projLabel:   '2-year savings target',
        projNote:    'at 7.5% p.a. on 40% of your surplus',
        cta:         'Start Travel Track',
    },
]

/* Track based on real profile data */
function getTrackFit(trackId, dti, emergencyMonths, surplus) {
    if (trackId === 'property') {
        if (emergencyMonths < 1 || surplus < 0)
            return { level: 'foundations', reason: 'Build a 1-month emergency buffer and reach a positive surplus before committing to a deposit plan.' }
        if (dti > 50)
            return { level: 'foundations', reason: `DTI at ${dti}% needs to come down before a bond application is viable. Target under 36%.` }
        if (dti > 36)
            return { level: 'good', reason: `DTI at ${dti}% - bring it under 36% and you hit the bond-ready threshold. You are close.` }
        return { level: 'strong', reason: `DTI at ${dti}% is bond-ready and your monthly surplus gives you an active deposit runway.` }
    }

    if (trackId === 'investing') {
        if (emergencyMonths < 1)
            return { level: 'foundations', reason: 'Build an emergency fund first. Investing without one means you will likely liquidate at the worst time.' }
        if (surplus > 3000)
            return { level: 'strong', reason: `${fmtZAR(surplus)} surplus per month gives you meaningful capital to deploy consistently.` }
        if (surplus > 500)
            return { level: 'good', reason: 'Enough surplus to start building. Consistency matters more than the initial amount at this stage.' }
        return { level: 'good', reason: 'Even small regular contributions compound significantly across a 5-year horizon.' }
    }

    if (trackId === 'travel') {
        if (surplus < 0)
            return { level: 'foundations', reason: 'Address the monthly deficit first. A travel fund needs consistent contributions to work.' }
        if (surplus > 2000)
            return { level: 'strong', reason: `${fmtZAR(surplus)} surplus per month makes this goal very achievable within the timeline.` }
        return { level: 'good', reason: 'A positive surplus means this goal is buildable with the right savings structure.' }
    }

    return { level: 'good', reason: 'This track is suitable for your profile.' }
}

const FIT_CONFIG = {
    strong:      { label: 'Strong fit',             color: '#15803D', bg: '#F0FDF4', border: '#BBF7D0' },
    good:        { label: 'Good fit',               color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
    foundations: { label: 'Build foundations first', color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
    unknown:     { label: 'Add your Snapshot data', color: '#6C757D', bg: '#F5F6F8', border: '#DEE2E6' },
}

export default function TracksHub() {
    const { profile } = useUserProfile()
    const hasData       = profile.grossIncome > 0
    const surplus       = calcNetSurplus(profile)
    const dti           = calcDTI(profile)
    const emergMonths   = parseFloat(calcEmergencyMonths(profile))

    /* Pre-projection for each track */
    const tracksWithData = useMemo(() => TRACKS.map(track => {
        const fit = hasData
            ? getTrackFit(track.id, dti, emergMonths, surplus)
            : { level: 'unknown', reason: 'Complete your Money Snapshot to see your personalised fit for this track.' }

        /* Projection amount based on the track */
        let projAmount = 0
        if (hasData && surplus > 0) {
            if (track.id === 'property')  projAmount = projectedValue(surplus * 0.6, track.projYears, track.projRate)
            if (track.id === 'investing') projAmount = projectedValue(surplus * 0.5 + (profile.tfsaContribution || 0), track.projYears, track.projRate)
            if (track.id === 'travel')    projAmount = projectedValue(surplus * 0.4, track.projYears, track.projRate)
        }

        return { ...track, fit, projAmount }
    }), [profile, hasData, surplus, dti, emergMonths])

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Strategy Tracks</h1>
                    <p className="page-subtitle">
                        Choose a financial path that fits where you are now.
                        Each track is a 5-year plan built around your actual numbers.
                    </p>
                </div>
            </div>

            <div className="tracks-hub-body">

                {/* Current position strip */}
                <div className="tracks-position-strip">
                    {hasData ? (
                        <>
                            <div className="tracks-position-items">
                                <PositionStat
                                    label="Debt-to-income"
                                    value={`${dti}%`}
                                    status={dti === 0 ? 'ok' : dti <= 36 ? 'ok' : dti <= 50 ? 'warn' : 'danger'}
                                    tooltip="Total monthly debt payments divided by gross income. Banks require below 36% before approving a home loan."
                                />
                                <PositionStat
                                    label="Emergency fund"
                                    value={`${emergMonths}m`}
                                    status={emergMonths >= 3 ? 'ok' : emergMonths >= 1 ? 'warn' : 'danger'}
                                    tooltip="Months of total expenses covered by your current savings. 3 months minimum, 6 months ideal before investing aggressively."
                                />
                                <PositionStat
                                    label="Monthly surplus"
                                    value={fmtZAR(surplus)}
                                    status={surplus > 500 ? 'ok' : surplus >= -500 ? 'warn' : 'danger'}
                                    tooltip="Take-home pay minus all monthly expenses. The capital available for savings and wealth-building each month."
                                />
                            </div>
                            <p className="tracks-position-note">
                                Based on your Snapshot - fit signals below update as you adjust your data.
                            </p>
                        </>
                    ) : (
                        <div className="tracks-position-empty">
                            <Icon name="snapshot" size={16} colour="var(--n-400)" />
                            <p>
                                Fill in your <Link to="/dashboard">Money Snapshot</Link> to
                                see personalised fit signals for each track.
                            </p>
                        </div>
                    )}
                </div>

                {/* Track cards */}
                <div className="tracks-grid">
                    {tracksWithData.map(track => (
                        <TrackCard key={track.id} track={track} hasData={hasData} />
                    ))}
                </div>

                {/* Comparison table */}
                <div className="tracks-compare">
                    <p className="tracks-compare-eyebrow">Side by side</p>
                    <div className="tracks-compare-table-wrap">
                        <table className="tracks-compare-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    {TRACKS.map(t => (
                                        <th key={t.id} style={{ color: t.color }}>
                                            {t.title}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="compare-row-label">Time horizon</td>
                                    {TRACKS.map(t => <td key={t.id}>{t.stats[0].value}</td>)}
                                </tr>
                                <tr>
                                    <td className="compare-row-label">Monthly minimum</td>
                                    {TRACKS.map(t => <td key={t.id}>{t.stats[1].value}</td>)}
                                </tr>
                                <tr>
                                    <td className="compare-row-label">Primary goal</td>
                                    {TRACKS.map(t => <td key={t.id}>{t.tableRow.goal}</td>)}
                                </tr>
                                <tr>
                                    <td className="compare-row-label">Risk level</td>
                                    {TRACKS.map(t => <td key={t.id}>{t.stats[2].value}</td>)}
                                </tr>
                                <tr>
                                    <td className="compare-row-label">Key SA tool</td>
                                    {TRACKS.map(t => <td key={t.id}>{t.tableRow.tool}</td>)}
                                </tr>
                                <tr>
                                    <td className="compare-row-label">Best suited for</td>
                                    {TRACKS.map(t => <td key={t.id}>{t.tableRow.suited}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </>
    )
}

/* Individual track card */
function TrackCard({ track, hasData }) {
    const fitCfg = FIT_CONFIG[track.fit.level]

    return (
        <div className={`track-hub-card track-hub-card--${track.id}`}>
            <div className="track-hub-band" style={{ background: track.color }} />

            <div className="track-hub-card-body">

                <div className="track-hub-top">
                    <div className="track-hub-icon" style={{ background: track.colorBg, borderColor: track.colorBorder }}>
                        <Icon name={track.iconName} size={22} colour={track.color} />
                    </div>
                    <span
                        className="track-hub-fit-badge"
                        style={{ background: fitCfg.bg, color: fitCfg.color, borderColor: fitCfg.border }}
                    >
                        {fitCfg.label}
                    </span>
                </div>

                <div>
                    <p className="track-hub-eyebrow" style={{ color: track.color }}>
                        {track.eyebrow}
                    </p>
                    <h2 className="track-hub-title">{track.title}</h2>
                    <p className="track-hub-description">{track.description}</p>
                </div>

                <div className="track-hub-stats">
                    {track.stats.map(s => (
                        <div key={s.label} className="track-hub-stat">
                            <span className="track-hub-stat-value">{s.value}</span>
                            <span className="track-hub-stat-label">{s.label}</span>
                        </div>
                    ))}
                </div>

                {/* Year projection both personal and customized calculated */}
                <div className="track-hub-projection" style={{ borderColor: track.colorBorder, background: track.colorBg }}>
                    <span className="track-hub-proj-label">{track.projLabel}</span>
                    {hasData && track.projAmount > 0 ? (
                        <>
                            <span className="track-hub-proj-value" style={{ color: track.color }}>
                                {fmtZAR(track.projAmount)}
                            </span>
                            <span className="track-hub-proj-note">{track.projNote}</span>
                        </>
                    ) : (
                        <span className="track-hub-proj-empty">
                            {hasData ? 'Increase your surplus to see a projection' : 'Add your Snapshot data'}
                        </span>
                    )}
                </div>

                {/* Fit from real profile data */}
                <p className="track-hub-fit-reason">{track.fit.reason}</p>

                <Link to={track.path} className="track-hub-cta" style={{ background: track.color }}>
                    {track.cta}
                </Link>

            </div>
        </div>
    )
}

function PositionStat({ label, value, status, tooltip }) {
    const colour = status === 'ok' ? 'var(--success)' : status === 'warn' ? 'var(--warning)' : 'var(--danger)'
    return (
        <div className="position-stat">
            <span className="position-stat-value" style={{ color: colour }}>{value}</span>
            <span className="position-stat-label">
                {label}
                {tooltip && <Tooltip text={tooltip} />}
            </span>
        </div>
    )
}
