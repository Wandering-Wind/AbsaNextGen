import { useState, useMemo, useContext } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useUserProfile } from '../context/UserProfileContext'
import AuthContext from '../context/AuthContext'
import {
    calcTakeHome, calcNetSurplus, calcTotalExpenses, fmtZAR, SA,
} from '../components/financialCalcs'
import "../styles/shared/TracksStudioShared.css"
import "../styles/shared/Tracks.css"
import Icon from '../components/Icons'
import TrackTimeline   from '../components/track/TrackTimeline'
import TrackYearDetail from '../components/track/TrackYearDetail'

/* Portfolio projection calculator
   Simulates monthly compounding for both JSE and offshore allocations.
   Returns an array of yearly snapshots showing portfolio value growth. */
function buildProjection({ monthlyAmount, jseSplit, jseReturn, offshoreReturn, randWeakness }) {
    const monthlyJSE      = monthlyAmount * (jseSplit / 100)
    const monthlyOffshore = monthlyAmount * ((100 - jseSplit) / 100)

    /* Offshore return in ZAR terms includes rand depreciation.
       e.g. 10% USD return + 5% rand weakness = ~15% effective ZAR return */
    const effectiveOffshore = (offshoreReturn / 100) + (randWeakness / 100)
    const jseMonthlyRate    = (jseReturn / 100) / 12
    const offMonthlyRate    = effectiveOffshore / 12

    let jseVal = 0
    let offVal = 0
    const data = []

    for (let year = 1; year <= 5; year++) {
        for (let m = 0; m < 12; m++) {
            jseVal = jseVal * (1 + jseMonthlyRate) + monthlyJSE
            offVal = offVal * (1 + offMonthlyRate) + monthlyOffshore
        }
        const total         = Math.round(jseVal + offVal)
        const contributed   = monthlyAmount * year * 12
        const gains         = total - contributed
        data.push({
            year,
            label:       `Yr ${year}`,
            jse:         Math.round(jseVal),
            offshore:    Math.round(offVal),
            total,
            contributed: Math.round(contributed),
            gains:       Math.max(0, gains),
        })
    }
    return data
}

/* Milestone builder */
function buildMilestones({ profile, monthlyAmount, jseSplit, offSplit, projection, expenses, surplus, takeHome }) {
    const annualAmount    = monthlyAmount * 12
    const annualOffshore  = monthlyAmount * (offSplit / 100) * 12
    const sdaUsed         = Math.round(annualOffshore)
    const tfsaMonthly     = Math.min(monthlyAmount, SA.TFSA_ANNUAL_CAP / 12)
    const emergencyTarget = Math.round(expenses * 3)
    const bankBalance     = profile.bankBalance || 0
    const emergencyPct    = expenses > 0 ? Math.min(100, Math.round((bankBalance / emergencyTarget) * 100)) : 0
    const y1              = projection[0]
    const y2              = projection[1]
    const y3              = projection[2]
    const y4              = projection[3]
    const y5              = projection[4]

    const hasEmergency = bankBalance >= emergencyTarget
    const hasTFSA      = (profile.tfsaContribution || 0) > 0

    const y1Status = hasEmergency ? 'done' : emergencyPct > 30 ? 'active' : 'upcoming'
    const y2Status = y1Status === 'done' ? (hasTFSA ? 'done' : 'active') : 'upcoming'
    const y3Status = y2Status === 'done' ? 'active' : 'upcoming'
    const y4Status = 'upcoming'
    const y5Status = 'upcoming'

    return [
        {
            year:         1,
            label:        'Foundation',
            sublabel:     'TFSA + JSE start',
            status:       y1Status,
            mainTarget:   annualAmount,
            mainCurrent:  hasEmergency ? annualAmount : bankBalance,
            mainLabel:    'Year 1 investment target',
            currentLabel: hasEmergency ? 'On track' : 'Emergency fund first',
            progressPct:  hasEmergency ? 100 : emergencyPct,
            progressLabel: hasEmergency
                ? `${fmtZAR(annualAmount)} invested in Year 1`
                : `Build R${emergencyTarget.toLocaleString('en-ZA')} emergency fund before investing`,
            insight: hasEmergency
                ? `At ${fmtZAR(monthlyAmount)}/month, you could have ${fmtZAR(y1.total)} invested by end of Year 1.`
                : `You need ${fmtZAR(Math.max(0, emergencyTarget - bankBalance))} more in your emergency fund before committing to long-term investments.`,
            focus: [
                `Max your TFSA first: R${Math.round(tfsaMonthly).toLocaleString('en-ZA')}/month fills the R46 000/year cap. All growth inside is tax-free.`,
                `Invest via a low-fee JSE ETF - Satrix 40 or Satrix MSCI World on EasyEquities or ABSA Share Investing.`,
                `Start your offshore seed: ${fmtZAR(Math.round(monthlyAmount * (offSplit / 100)))}/month through EasyEquities USD or ABSA Global Investing.`,
            ],
            avoid:     ['Crypto', 'Individual stock picks', 'High-fee unit trusts (TER > 1%)', 'Investing without an emergency fund'],
            why:       'Compound interest only works if you stay invested. Starting with R500/month at age 28 vs 33 makes a bigger difference than doubling your contribution at 33.',
            saContext: `ABSA Share Investing and EasyEquities both offer TFSA accounts. EasyEquities charges a platform fee of 0.25% p.a. vs typical unit trust TERs of 1.5-2%. On ${fmtZAR(annualAmount)}, that difference is ${fmtZAR(Math.round(annualAmount * 0.015))} per year.`,
        },
        {
            year:         2,
            label:        'Offshore Exposure',
            sublabel:     `${offSplit}% offshore via SDA`,
            status:       y2Status,
            mainTarget:   y2.total,
            mainCurrent:  y1.total,
            mainLabel:    'Portfolio target by Year 2',
            currentLabel: 'Year 1 portfolio',
            progressPct:  Math.round((y1.total / y2.total) * 100),
            progressLabel: `${offSplit}% offshore = ${fmtZAR(sdaUsed)}/year of your R2M SDA`,
            insight: `Offshore allocation protects you against rand weakness. At 5% annual rand depreciation, ${fmtZAR(Math.round(monthlyAmount * (offSplit / 100)))}/month offshore grows to ${fmtZAR(y2.offshore)} after 2 years in ZAR terms.`,
            focus: [
                `Maintain ${offSplit}% offshore: ${fmtZAR(Math.round(monthlyAmount * (offSplit / 100)))}/month. You are using ${fmtZAR(sdaUsed)} of your R2M annual SDA - well within the limit.`,
                'Keep your TFSA maxed annually. This is the most tax-efficient vehicle available to SA investors.',
                'Rebalance quarterly - if JSE outperforms, sell some JSE and buy offshore to maintain your target split.',
            ],
            avoid:     ['Exceeding R2M SDA without tax clearance', 'Currency trading or forex speculation', 'Stopping contributions during market dips'],
            why:       `The rand has depreciated approximately 5% per year against USD over the past decade. An investment earning 10% in USD terms returns approximately 15% in ZAR terms. This is your hedge.`,
            saContext: `The Single Discretionary Allowance (SDA) allows R2M/year offshore without SARS tax clearance. You are using ${fmtZAR(sdaUsed)}/year - ${Math.round((sdaUsed / 2000000) * 100)}% of your annual allowance. Above R2M, you need a tax clearance certificate from SARS.`,
        },
        {
            year:         3,
            label:        'Compounding',
            sublabel:     'Growth accelerates',
            status:       y3Status,
            mainTarget:   y3.total,
            mainCurrent:  y2.total,
            mainLabel:    'Portfolio target by Year 3',
            currentLabel: 'Year 2 portfolio',
            progressPct:  Math.round((y2.total / y3.total) * 100),
            progressLabel: `${fmtZAR(y3.gains)} in investment gains so far`,
            insight: `You will have contributed ${fmtZAR(monthlyAmount * 36)} over 3 years. Your projected portfolio is ${fmtZAR(y3.total)}. The ${fmtZAR(y3.gains)} difference is compound growth working for you.`,
            focus: [
                `Stay the course during corrections. A 20-30% JSE dip is normal - do not sell. History shows every SA market correction has recovered.`,
                `Consider increasing RA contributions to 27.5% of gross income if not already there. At ${fmtZAR(profile.grossIncome || 0)}/month, that is ${fmtZAR(Math.round((profile.grossIncome || 0) * 0.275))}/month tax-deductible.`,
                'Dollar-cost averaging into market dips is your best strategy - automate contributions so emotion does not interfere.',
            ],
            avoid:     ['Panic selling', 'Checking your portfolio daily', 'Moving to cash after a correction', 'Chasing high-performing individual stocks'],
            why:       'Year 3 is when most investors make their biggest mistake - selling during volatility. The investors who stayed invested through every SA market correction in the past 20 years have outperformed those who tried to time the market.',
            saContext: 'The JSE All Share Index has returned approximately 11% p.a. over the past 20 years despite multiple crises (2008 GFC, 2020 Covid, load shedding, rand depreciation). Volatility is the price of those returns.',
        },
        {
            year:         4,
            label:        'Accelerate',
            sublabel:     'RA + offshore at 40%+',
            status:       y4Status,
            mainTarget:   y4.total,
            mainCurrent:  y3.total,
            mainLabel:    'Portfolio target by Year 4',
            currentLabel: 'Year 3 portfolio',
            progressPct:  Math.round((y3.total / y4.total) * 100),
            progressLabel: `${fmtZAR(y4.gains)} in projected investment gains`,
            insight: `By Year 4, your investment gains (${fmtZAR(y4.gains)}) will start to exceed your annual contributions (${fmtZAR(annualAmount)}). This is the point where your money starts working harder than you do.`,
            focus: [
                `Push offshore allocation toward 40-50% if comfortable with currency exposure. Use EasyEquities USD for low-fee access to S&P 500 and MSCI World ETFs.`,
                `Review RA contributions annually. Each additional R1 000/month into RA reduces your taxable income by R12 000/year.`,
                'Consider a fee review: as your portfolio grows, ensure your platform fees remain competitive.',
            ],
            avoid:     ['Increasing lifestyle spend (lifestyle creep)', 'Moving to lower-return "safe" assets too early', 'High advisor fees on a growing portfolio'],
            why:       `At Year 4, your portfolio is approaching a size where investment returns meaningfully contribute to your wealth growth. Protecting your contribution rate now has outsized long-term impact.`,
            saContext: `At ${fmtZAR(y4.total)}, a 1% difference in fees costs ${fmtZAR(Math.round(y4.total * 0.01))}/year. Satrix ETFs charge 0.1-0.2% TER vs 1.5-2% for actively managed funds. Over 20 years, the fee difference compounds to hundreds of thousands of rands.`,
        },
        {
            year:         5,
            label:        'Portfolio Maturity',
            sublabel:     `Projected: ${fmtZAR(y5.total)}`,
            status:       y5Status,
            mainTarget:   y5.total,
            mainCurrent:  y4.total,
            mainLabel:    '5-year portfolio target',
            currentLabel: 'Year 4 portfolio',
            progressPct:  Math.round((y4.total / y5.total) * 100),
            progressLabel: `${fmtZAR(y5.contributed)} contributed, ${fmtZAR(y5.gains)} in gains`,
            insight: `Over 5 years, you contributed ${fmtZAR(y5.contributed)} and your portfolio grew to ${fmtZAR(y5.total)}. Investment gains of ${fmtZAR(y5.gains)} represent ${Math.round((y5.gains / y5.total) * 100)}% of your total wealth - money your money made.`,
            focus: [
                'Review your tax position: Capital Gains Tax (CGT) applies when you sell. Plan withdrawals to use the R40 000 annual exclusion efficiently.',
                'Consider if your offshore allocation should increase further. Many SA financial advisors recommend 50-60% offshore for long-term SA investors.',
                'Revisit your goals: does the portfolio continue growing, or is it time to use it toward property, travel, or financial independence?',
            ],
            avoid:     ['Withdrawing gains without a clear plan', 'Over-concentrating in any single asset', 'Ignoring CGT implications on large disposals'],
            why:       'Year 5 is not the end - it is the proof of concept. A portfolio built over 5 years with consistent, low-fee, diversified investing is the foundation for financial independence. The next 5 years compound even faster.',
            saContext: `CGT annual exclusion: R40 000/year. Inclusion rate for individuals: 40% of the gain. Effective max CGT rate for SA individuals: approximately 18%. Structuring disposals across tax years minimises your liability.`,
        },
    ]
}

/* Custom chart tooltip */
function PortfolioTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const jse     = payload.find(p => p.dataKey === 'jse')?.value ?? 0
    const offshore = payload.find(p => p.dataKey === 'offshore')?.value ?? 0
    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip-title">{label}</p>
            <div className="chart-tooltip-row">
                <span style={{ color: 'var(--absa-red)' }}>JSE</span>
                <strong>{fmtZAR(jse)}</strong>
            </div>
            <div className="chart-tooltip-row">
                <span style={{ color: '#6366f1' }}>Offshore</span>
                <strong>{fmtZAR(offshore)}</strong>
            </div>
            <div className="chart-tooltip-row" style={{ borderTop: '1px solid var(--n-200)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                <span>Total</span>
                <strong>{fmtZAR(jse + offshore)}</strong>
            </div>
        </div>
    )
}

/* Strategy presets */
const PRESETS = [
    { id: 'conservative', label: 'Conservative', jse: 70, jseReturn: 10, offReturn: 8,  randWeakness: 4 },
    { id: 'balanced',     label: 'Balanced',     jse: 60, jseReturn: 11, offReturn: 10, randWeakness: 5 },
    { id: 'aggressive',   label: 'Aggressive',   jse: 40, jseReturn: 12, offReturn: 12, randWeakness: 6 },
]

/* Main component */

export default function GlobalInvesting() {
    const { profile } = useUserProfile()
    const { user }    = useContext(AuthContext)
    const hasData     = profile.grossIncome > 0

    const surplus   = calcNetSurplus(profile)
    const takeHome  = calcTakeHome(profile.grossIncome, profile.raPercent, profile.otherIncome)
    const expenses  = calcTotalExpenses(profile)

    /* Sidebar inputs */
    const [monthlyAmount, setMonthlyAmount] = useState(() => Math.max(500, Math.round(surplus * 0.7)))
    const [jseSplit,      setJseSplit]      = useState(60)
    const [jseReturn,     setJseReturn]     = useState(11)
    const [offReturn,     setOffReturn]     = useState(10)
    const [randWeakness,  setRandWeakness]  = useState(5)
    const [selectedYear,  setSelectedYear]  = useState(1)
    const [activePreset,  setActivePreset]  = useState('balanced')

    const offSplit = 100 - jseSplit

    function applyPreset(preset) {
        setJseSplit(preset.jse)
        setJseReturn(preset.jseReturn)
        setOffReturn(preset.offReturn)
        setRandWeakness(preset.randWeakness)
        setActivePreset(preset.id)
    }

    /* Blended effective annual return */
    const effectiveReturn = Math.round(
        (jseSplit / 100) * jseReturn +
        ((100 - jseSplit) / 100) * (offReturn + randWeakness)
    )

    /* TFSA tings */
    const tfsaMonthly    = Math.min(monthlyAmount, SA.TFSA_ANNUAL_CAP / 12)
    const tfsaAnnual     = tfsaMonthly * 12
    const tfsaUtilPct    = Math.round((tfsaAnnual / SA.TFSA_ANNUAL_CAP) * 100)

    const projection = useMemo(() => buildProjection({
        monthlyAmount,
        jseSplit,
        jseReturn,
        offshoreReturn: offReturn,
        randWeakness,
    }), [monthlyAmount, jseSplit, jseReturn, offReturn, randWeakness])

    const milestones = useMemo(() => buildMilestones({
        profile, monthlyAmount, jseSplit, offSplit, projection, expenses, surplus, takeHome,
    }), [profile, monthlyAmount, jseSplit, offSplit, projection, expenses, surplus, takeHome])

    const activeMilestone = milestones[selectedYear - 1]
    const y5 = projection[4]

    /* SDA usage */
    const annualOffshore = monthlyAmount * (offSplit / 100) * 12
    const sdaPct = Math.round((annualOffshore / 2000000) * 100)

    /* Verdict */
    const verdictStatus = surplus <= 0 ? 'deficit'
        : monthlyAmount >= surplus * 0.5 ? 'on-track'
        : 'at-risk'

    /* Empty state */
    if (!hasData) {
        return (
            <div className="pp-empty">
                <div className="pp-empty-inner">
                    <Icon name="snapshot" size={40} colour="var(--n-300)"/>
                    <h2>Set up your Money Snapshot first</h2>
                    <p>Your Global Investing projections are built from your actual surplus. Enter your income and expenses to see personalised portfolio projections.</p>
                    <Link to="/dashboard" className="btn-primary">Go to Money Snapshot</Link>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Page header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">{user?.name ? `${user.name}'s Investment Track` : 'Global Investing Track'}</h1>
                    <p className="page-subtitle">Build a JSE and offshore portfolio over 5 years, using compound growth and rand-hedge strategy.</p>
                </div>
                <div className={`pp-verdict ${verdictStatus === 'on-track' ? 'pp-verdict--ok' : verdictStatus === 'at-risk' ? 'pp-verdict--warn' : 'pp-verdict--risk'}`}>
                    <Icon name={verdictStatus === 'on-track' ? 'ok' : verdictStatus === 'at-risk' ? 'warn' : 'danger'} size={14}/>
                    <div>
                        <strong>
                            {verdictStatus === 'on-track'
                                ? `5-year target: ${fmtZAR(y5.total)}`
                                : verdictStatus === 'at-risk'
                                    ? 'Increase contribution rate'
                                    : 'No investable surplus'}
                        </strong>
                        <span>
                            {verdictStatus !== 'deficit'
                                ? `${fmtZAR(y5.gains)} in projected investment gains`
                                : 'Reduce expenses before investing'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="split-body">
                {/* LEFT - Inputs + projection chart */}
                <div className="split-left">

                    {/* Strategy presets */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="tracks" size={13}/> Strategy</p>
                        <div className="gi-presets">
                            {PRESETS.map(p => (
                                <button
                                    key={p.id}
                                    className={`gi-preset-btn ${activePreset === p.id ? 'gi-preset-btn--active' : ''}`}
                                    onClick={() => applyPreset(p)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="input-section">
                        <p className="input-section-title"><Icon name="tfsa" size={13}/> Monthly investment</p>

                        <div className="input-field">
                            <label>Amount per month</label>
                            <div className="input-prefix-wrap">
                                <span className="input-prefix">R</span>
                                <input
                                    type="number"
                                    value={monthlyAmount}
                                    onChange={e => { setMonthlyAmount(Math.max(0, Number(e.target.value))); setActivePreset(null) }}
                                    min="0"
                                    step="500"
                                />
                            </div>
                            <p className="input-hint">Your surplus is {fmtZAR(surplus)}/month. Aim for 60-80% directed to investments.</p>
                        </div>

                        {/* Visual allocation bar */}
                        <div className="input-field">
                            <label>Allocation: JSE {jseSplit}% / Offshore {offSplit}%</label>
                            <div className="gi-alloc-bar">
                                <div className="gi-alloc-jse" style={{ width: `${jseSplit}%` }}>
                                    {jseSplit >= 30 && <span>JSE {jseSplit}%</span>}
                                </div>
                                <div className="gi-alloc-off" style={{ width: `${offSplit}%` }}>
                                    {offSplit >= 20 && <span>Offshore {offSplit}%</span>}
                                </div>
                            </div>
                            <input
                                type="range"
                                min="40" max="90" step="10"
                                value={jseSplit}
                                onChange={e => { setJseSplit(Number(e.target.value)); setActivePreset(null) }}
                            />
                            <p className="input-hint">60/40 is balanced. Move toward 50/50 as your portfolio grows.</p>
                        </div>
                    </div>

                    {/* Assumptions */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="learn" size={13}/> Assumptions</p>

                        <div className="input-field">
                            <label>JSE return: {jseReturn}% p.a.</label>
                            <input type="range" min="7" max="14" step="1" value={jseReturn} onChange={e => { setJseReturn(Number(e.target.value)); setActivePreset(null) }}/>
                        </div>

                        <div className="input-field">
                            <label>Offshore return (USD): {offReturn}% p.a.</label>
                            <input type="range" min="6" max="14" step="1" value={offReturn} onChange={e => { setOffReturn(Number(e.target.value)); setActivePreset(null) }}/>
                        </div>

                        <div className="input-field">
                            <label>Rand weakness: {randWeakness}% p.a.</label>
                            <input type="range" min="2" max="10" step="1" value={randWeakness} onChange={e => { setRandWeakness(Number(e.target.value)); setActivePreset(null) }}/>
                            <p className="input-hint">Historical rand depreciation vs USD: ~5% p.a. Adds to your effective offshore return.</p>
                        </div>

                        {/* Blended return summary */}
                        <div className="gi-return-summary">
                            <span>Blended effective return</span>
                            <strong>{effectiveReturn}% p.a.</strong>
                        </div>
                    </div>

                    {/* Key numbers */}
                    <div className="pp-key-numbers">
                        <p className="pp-key-numbers-title">Your projections</p>
                        {projection.map(yr => (
                            <div key={yr.year} className="pp-key-row">
                                <span>Year {yr.year}</span>
                                <strong>{fmtZAR(yr.total)}</strong>
                            </div>
                        ))}
                        <div className="pp-key-divider"/>
                        <div className="pp-key-row pp-key-row--total">
                            <span>Investment gains</span>
                            <strong className="pp-ok">{fmtZAR(y5.gains)}</strong>
                        </div>
                    </div>

                    {/* TFSA tings */}
                    <div className="gi-tax-cards">
                        <div className="gi-tax-card">
                            <div className="gi-tax-card-header">
                                <span>TFSA utilisation</span>
                                <span className={tfsaUtilPct >= 100 ? 'gi-tag gi-tag--ok' : 'gi-tag gi-tag--warn'}>
                                    {tfsaUtilPct >= 100 ? 'Maxed' : `${tfsaUtilPct}%`}
                                </span>
                            </div>
                            <div className="pp-progress-bar-track">
                                <div
                                    className="pp-progress-bar-fill"
                                    style={{ width: `${Math.min(100, tfsaUtilPct)}%`, background: tfsaUtilPct >= 100 ? 'var(--success)' : 'var(--absa-red)' }}
                                />
                            </div>
                            <p className="gi-sda-hint">
                                {tfsaUtilPct >= 100
                                    ? `You're maxing your R46 000/year TFSA cap. All growth is tax-free.`
                                    : `${fmtZAR(Math.round(tfsaAnnual))}/year of R46 000 cap. Consider maxing for tax-free growth.`}
                            </p>
                        </div>

                        {/* SDA usage bar */}
                        {offSplit > 0 && (
                            <div className="gi-tax-card">
                                <div className="gi-tax-card-header">
                                    <span>Annual SDA usage</span>
                                    <span>{fmtZAR(Math.round(annualOffshore))} of R2M</span>
                                </div>
                                <div className="pp-progress-bar-track">
                                    <div
                                        className="pp-progress-bar-fill"
                                        style={{ width: `${Math.min(100, sdaPct)}%`, background: sdaPct > 80 ? 'var(--warning)' : 'var(--absa-red)' }}
                                    />
                                </div>
                                <p className="gi-sda-hint">{sdaPct}% of R2M SDA - no tax clearance needed below this limit.</p>
                            </div>
                        )}
                    </div>

                    {/* Portfolio growth mini chart */}
                    <div className="gi-chart-card">
                        <p className="pp-key-numbers-title">Portfolio growth</p>
                        <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={projection} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barSize={18}>
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--n-400)' }} axisLine={false} tickLine={false}/>
                                <YAxis hide/>
                                <Tooltip content={<PortfolioTooltip/>} cursor={{ fill: 'var(--n-100)' }}/>
                                <Bar dataKey="jse"     stackId="a" fill="var(--absa-red)" radius={[0,0,0,0]}/>
                                <Bar dataKey="offshore" stackId="a" fill="#6366f1"        radius={[3,3,0,0]}/>
                            </BarChart>
                        </ResponsiveContainer>
                        <div className="gi-chart-legend">
                            <span><span className="gi-legend-dot" style={{ background: 'var(--absa-red)' }}/>JSE</span>
                            <span><span className="gi-legend-dot" style={{ background: '#6366f1' }}/>Offshore</span>
                        </div>
                    </div>
                </div>

                {/* RIGHT - Timeline + year detail */}
                <div className="split-right">
                    <TrackTimeline
                        milestones={milestones}
                        selectedYear={selectedYear}
                        onSelect={setSelectedYear}
                    />
                    <TrackYearDetail
                        key={selectedYear}
                        milestone={activeMilestone}
                    />
                </div>
            </div>
        </>
    )
}
