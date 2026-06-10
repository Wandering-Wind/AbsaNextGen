import { useState, useMemo } from 'react'
import { useUserProfile } from '../context/UserProfileContext'
import { fmtZAR, SA, calcNetSurplus } from '../components/financialCalcs'
import "../styles/shared/TracksStudioShared.css"
import "../styles/pages/OffshoreStudio.css"
import Icon from "../components/Icons"
import LearnCard from "../components/LearnCard"
import StudioVerdict from "../components/StudioVerdict"
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

/* Constants */
const STARTING_FX_RATE = 18.50   // approximate USD/ZAR at time of writing
const SDA_LIMIT        = 2000000  // R2M Single Discretionary Allowance
const FIA_LIMIT        = 10000000 // R10M Foreign Investment Allowance

/* FX scenarios (annual rand change vs USD) */
const FX_SCENARIOS = [
    { id: 'weak',   label: 'Rand weakens',     rate: 0.07,  colour: '#ef4444', dash: false },
    { id: 'base',   label: 'Base case (5%)',   rate: 0.05,  colour: '#6366f1', dash: false },
    { id: 'strong', label: 'Rand strengthens', rate: -0.02, colour: '#22c55e', dash: '5 3' },
]

/* Asset allocation presets */
const ALLOCATION_PRESETS = [
    { id: 'conservative', label: 'Conservative', usEq: 40, bonds: 40, em: 20, usdReturn: 0.075 },
    { id: 'balanced',     label: 'Balanced',     usEq: 70, bonds: 20, em: 10, usdReturn: 0.095 },
    { id: 'aggressive',   label: 'Aggressive',   usEq: 90, bonds:  5, em:  5, usdReturn: 0.110 },
]

/* Offshore simulation (per FX scenario) */
function runOffshoreScenario({ monthlyZAR, annualUsdReturn, startFxRate, annualRandChange, years }) {
    const monthlyUsdReturn = annualUsdReturn / 12
    let usdPortfolio = 0
    const snapshots = []

    for (let year = 1; year <= years; year++) {
        for (let m = 0; m < 12; m++) {
            /* Exchange rate this month - as rand depreciates, ZAR buys fewer USD */
            const monthIdx = (year - 1) * 12 + m
            const fxRate   = startFxRate * Math.pow(1 + annualRandChange, monthIdx / 12)
            const monthlyUSD = monthlyZAR / fxRate
            usdPortfolio = usdPortfolio * (1 + monthlyUsdReturn) + monthlyUSD
        }
        const endFxRate = startFxRate * Math.pow(1 + annualRandChange, year)
        snapshots.push({
            year,
            usdValue: Math.round(usdPortfolio),
            zarValue: Math.round(usdPortfolio * endFxRate),
            fxRate:   Number(endFxRate.toFixed(2)),
        })
    }
    return snapshots
}

/* Local JSE benchmark (same ZAR invested locally) */
function runLocalBenchmark({ monthlyZAR, jseReturn, years }) {
    const monthlyRate = jseReturn / 12
    let value = 0
    const snapshots = []
    for (let year = 1; year <= years; year++) {
        for (let m = 0; m < 12; m++) {
            value = value * (1 + monthlyRate) + monthlyZAR
        }
        snapshots.push({ year, zarValue: Math.round(value) })
    }
    return snapshots
}

/* Effective ZAR return calculation */
function calcEffectiveReturn(usdReturn, randChange) {
    return Math.round(((1 + usdReturn) * (1 + randChange) - 1) * 100 * 10) / 10
}

/* Chart */
function ScenarioChart({ chartData, years }) {
    function formatY(val) {
        if (Math.abs(val) >= 1000000) return `R${(val / 1000000).toFixed(1)}M`
        if (Math.abs(val) >= 1000)    return `R${(val / 1000).toFixed(0)}K`
        return `R${val}`
    }

    function CustomTooltip({ active, payload, label }) {
        if (!active || !payload?.length) return null
        return (
            <div className="chart-tooltip">
                <p className="chart-tooltip-title">{label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="chart-tooltip-row">
                        <span style={{ color: p.color }}>{p.name}</span>
                        <strong>{fmtZAR(p.value)}</strong>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--n-100)"/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--n-400)' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={formatY} tick={{ fontSize: 11, fill: 'var(--n-400)' }} width={68} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Line type="monotone" dataKey="Rand weakens (7%)"     stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }}/>
                <Line type="monotone" dataKey="Base case (5%)"        stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}/>
                <Line type="monotone" dataKey="Rand strengthens (-2%)" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="5 3"/>
                <Line type="monotone" dataKey="Local JSE (11%)"        stroke="var(--absa-red)" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} strokeDasharray="3 2"/>
            </LineChart>
        </ResponsiveContainer>
    )
}

/* Stat card */
function StatCard({ label, value, sub, accent }) {
    return (
        <div className={`ops-stat-card ${accent ? `ops-stat-card--${accent}` : ''}`}>
            <p className="ops-stat-label">{label}</p>
            <p className="ops-stat-value">{value}</p>
            {sub && <p className="ops-stat-sub">{sub}</p>}
        </div>
    )
}

/* Allocation bar (3 segments) */
function AllocationBar({ usEq, bonds, em }) {
    const segments = [
        { label: 'US Equities', pct: usEq,  colour: '#6366f1' },
        { label: 'Global Bonds', pct: bonds, colour: '#06b6d4' },
        { label: 'Emerging Markets', pct: em, colour: '#f59e0b' },
    ]
    return (
        <div className="ops-alloc-wrap">
            <div className="ops-alloc-bar">
                {segments.map(s => (
                    <div key={s.label}
                        className="ops-alloc-seg"
                        style={{ width: `${s.pct}%`, background: s.colour }}
                    >
                        {s.pct >= 15 && <span>{s.pct}%</span>}
                    </div>
                ))}
            </div>
            <div className="ops-alloc-legend">
                {segments.map(s => (
                    <div key={s.label} className="ops-alloc-legend-item">
                        <span className="ops-alloc-dot" style={{ background: s.colour }}/>
                        <span>{s.label}</span>
                        <strong>{s.pct}%</strong>
                    </div>
                ))}
            </div>
        </div>
    )
}

/* Coaching callout */
function CoachCallout({ title, children, type = 'info' }) {
    return (
        <div className={`ops-coach ops-coach--${type}`}>
            <p className="ops-coach-title">{title}</p>
            <div className="ops-coach-body">{children}</div>
        </div>
    )
}

/* SDA progress bar (tie to nudge layer that talks about this) */
function SdaBar({ annualContrib }) {
    const sdaPct = Math.min(100, Math.round((annualContrib / SDA_LIMIT) * 100))
    const needsFia = annualContrib > SDA_LIMIT
    return (
        <div className="ops-sda">
            <div className="ops-sda-header">
                <span>Annual SDA usage</span>
                <span className={needsFia ? 'ops-sda-tag ops-sda-tag--warn' : 'ops-sda-tag ops-sda-tag--ok'}>
                    {needsFia ? 'Needs FIA clearance' : `${sdaPct}% of R2M`}
                </span>
            </div>
            <div className="pp-progress-bar-track">
                <div className="pp-progress-bar-fill"
                    style={{ width: `${sdaPct}%`, background: sdaPct > 90 ? 'var(--warning)' : 'var(--absa-red)' }}/>
            </div>
            <p className="ops-sda-hint">
                {needsFia
                    ? `${fmtZAR(annualContrib)}/year exceeds R2M SDA. You need a SARS tax clearance certificate (FIA) before transferring.`
                    : `${fmtZAR(annualContrib)}/year uses ${sdaPct}% of your R2M SDA. No tax clearance needed below R2M.`}
            </p>
        </div>
    )
}

/* Verdict logic */
function computeOffshoreVerdict({ surplus, monthlyZAR, annualContrib, offshoreAheadOfJse, effectiveBase, effectiveStrong, effectiveWeak, fxBonus, finalBase, finalJse, years, jseReturn, usdReturn }) {
    const needsFia = annualContrib > SDA_LIMIT
    const jseReturnPct = Math.round(jseReturn * 100)
    const offVsJse = effectiveBase - jseReturnPct

    if (offshoreAheadOfJse && offVsJse >= 2) {
        return {
            type:     'positive',
            headline: 'Offshore has the edge - rand depreciation does the heavy lifting',
            points: [
                `Base case delivers ${effectiveBase}% effective ZAR return vs JSE at ${jseReturnPct}% - a ${offVsJse} percentage point advantage from currency alone`,
                `${fmtZAR(Math.abs(fxBonus))} of your ${years}-year return comes purely from rand depreciation - this is structural, not speculative`,
                needsFia
                    ? `Your ${fmtZAR(annualContrib)}/year exceeds the R2M SDA - apply for FIA clearance via SARS eFiling before transferring`
                    : `Your ${fmtZAR(annualContrib)}/year sits within the R2M SDA - no tax clearance needed`,
            ],
        }
    }

    if (!offshoreAheadOfJse || effectiveStrong < jseReturnPct) {
        return {
            type:     'caution',
            headline: 'JSE competes closely - diversification is the real argument for offshore',
            points: [
                `If the rand holds or strengthens, your effective ZAR return drops to ${effectiveStrong}% - below the JSE at ${jseReturnPct}%`,
                `The base case at ${effectiveBase}% is competitive, but your outcome is materially rand-path-dependent`,
                'Offshore is not just about beating JSE - it is about holding assets outside the SA economy as a hedge',
            ],
        }
    }

    return {
        type:     'neutral',
        headline: 'Offshore and JSE are closely matched at these inputs',
        points: [
            `Base case puts offshore at ${effectiveBase}% vs JSE at ${jseReturnPct}% over ${years} years`,
            'The real benefit of offshore exposure is not beating JSE - it is currency and geographic diversification',
            needsFia
                ? `You need FIA clearance from SARS before transferring above R2M - apply via eFiling`
                : `Clean SDA position at ${fmtZAR(annualContrib)}/year - no clearance paperwork needed`,
        ],
    }
}

/* Main component */
export default function OffshoreStudio() {
    const { profile } = useUserProfile()

    const [learnOpen,     setLearnOpen]     = useState(false)
    const [activeAlloc,   setActiveAlloc]   = useState('balanced')
    const [monthlyZAR,    setMonthlyZAR]    = useState(5000)
    const [usEq,          setUsEq]          = useState(70)
    const [bonds,         setBonds]         = useState(20)
    const [usdReturn,     setUsdReturn]     = useState(0.095)
    const [jseReturn,     setJseReturn]     = useState(0.11)
    const [years,         setYears]         = useState(7)

    const em = Math.max(0, 100 - usEq - bonds)

    function applyAlloc(preset) {
        setActiveAlloc(preset.id)
        setUsEq(preset.usEq)
        setBonds(preset.bonds)
        setUsdReturn(preset.usdReturn)
    }

    const annualContrib = monthlyZAR * 12
    const surplus       = profile.grossIncome > 0 ? calcNetSurplus(profile) : null

    /* Run all three FX scenarios */
    const weakData   = useMemo(() => runOffshoreScenario({ monthlyZAR, annualUsdReturn: usdReturn, startFxRate: STARTING_FX_RATE, annualRandChange: 0.07,  years }), [monthlyZAR, usdReturn, years])
    const baseData   = useMemo(() => runOffshoreScenario({ monthlyZAR, annualUsdReturn: usdReturn, startFxRate: STARTING_FX_RATE, annualRandChange: 0.05,  years }), [monthlyZAR, usdReturn, years])
    const strongData = useMemo(() => runOffshoreScenario({ monthlyZAR, annualUsdReturn: usdReturn, startFxRate: STARTING_FX_RATE, annualRandChange: -0.02, years }), [monthlyZAR, usdReturn, years])
    const jseData    = useMemo(() => runLocalBenchmark({ monthlyZAR, jseReturn, years }), [monthlyZAR, jseReturn, years])

    const chartData = useMemo(() => Array.from({ length: years }, (_, i) => ({
        name:                      `Yr ${i + 1}`,
        'Rand weakens (7%)':       weakData[i]?.zarValue,
        'Base case (5%)':          baseData[i]?.zarValue,
        'Rand strengthens (-2%)':  strongData[i]?.zarValue,
        'Local JSE (11%)':         jseData[i]?.zarValue,
    })), [weakData, baseData, strongData, jseData, years])

    const finalBase   = baseData[years - 1]
    const finalWeak   = weakData[years - 1]
    const finalStrong = strongData[years - 1]
    const finalJse    = jseData[years - 1]

    /* Effective ZAR returns */
    const effectiveBase   = calcEffectiveReturn(usdReturn, 0.05)
    const effectiveWeak   = calcEffectiveReturn(usdReturn, 0.07)
    const effectiveStrong = calcEffectiveReturn(usdReturn, -0.02)

    /* FX bonus: difference between base ZAR value and value with no FX change */
    const noFxBase = runOffshoreScenario({ monthlyZAR, annualUsdReturn: usdReturn, startFxRate: STARTING_FX_RATE, annualRandChange: 0, years })
    const fxBonus  = (finalBase?.zarValue ?? 0) - (noFxBase[years - 1]?.zarValue ?? 0)

    /* Offshore ahead of JSE? */
    const offshoreAheadOfJse = (finalBase?.zarValue ?? 0) > (finalJse?.zarValue ?? 0)

    const verdict = computeOffshoreVerdict({
        surplus, monthlyZAR, annualContrib, offshoreAheadOfJse,
        effectiveBase, effectiveStrong, effectiveWeak,
        fxBonus, finalBase, finalJse, years, jseReturn, usdReturn,
    })

    function handleReset() {
        applyAlloc(ALLOCATION_PRESETS[1])
        setMonthlyZAR(5000); setJseReturn(0.11); setYears(7)
    }

    /* USD display format */
    const fmtUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Offshore Portfolio Studio</h1>
                    <p className="page-subtitle">
                        See how offshore investing works in two currencies - and why rand depreciation
                        is your ally, not your enemy, when your money is in dollars.
                    </p>
                </div>
                <button className="reset-btn" onClick={handleReset}>Reset</button>
            </div>

            <div className="split-body">

                {/* LEFT: Inputs */}
                <aside className="split-left">

                    {/* Allocation presets */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="tfsa" size={13}/> Allocation</p>
                        <div className="ops-presets">
                            {ALLOCATION_PRESETS.map(p => (
                                <button key={p.id}
                                    className={`ops-preset-btn ${activeAlloc === p.id ? 'ops-preset-btn--active' : ''}`}
                                    onClick={() => applyAlloc(p)}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                        <AllocationBar usEq={usEq} bonds={bonds} em={em}/>
                    </div>

                    {/* Monthly contribution */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="savings" size={13}/> Contribution</p>

                        <div className="input-field">
                            <label>Monthly offshore amount</label>
                            <div className="input-prefix-wrap">
                                <span className="input-prefix">R</span>
                                <input type="number" value={monthlyZAR || ''} placeholder="0" min={500} step={500}
                                    onChange={e => { setMonthlyZAR(Number(e.target.value)); setActiveAlloc(null) }}/>
                            </div>
                            {surplus !== null && (
                                <p className="input-hint">
                                    Your surplus is {fmtZAR(surplus)}/month. At {fmtZAR(monthlyZAR)}, that's {Math.round((monthlyZAR / surplus) * 100)}% directed offshore.
                                </p>
                            )}
                        </div>

                        {/* Live FX conversion */}
                        <div className="ops-fx-pill">
                            <span>{fmtZAR(monthlyZAR)}/month</span>
                            <span className="ops-fx-arrow">→</span>
                            <strong>{fmtUSD(monthlyZAR / STARTING_FX_RATE)}/month</strong>
                            <span className="ops-fx-rate">@ R{STARTING_FX_RATE} / $1</span>
                        </div>

                        <SdaBar annualContrib={annualContrib}/>
                    </div>

                    {/* Assumptions */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="learn" size={13}/> Assumptions</p>

                        <div className="input-field">
                            <label>USD portfolio return: {(usdReturn * 100).toFixed(1)}% p.a.</label>
                            <input type="range" min={0.05} max={0.14} step={0.005} value={usdReturn}
                                onChange={e => { setUsdReturn(Number(e.target.value)); setActiveAlloc(null) }}/>
                            <p className="input-hint">S&P 500 historical: ~10-12% USD. Blended with bonds reduces this.</p>
                        </div>

                        <div className="input-field">
                            <label>JSE benchmark: {(jseReturn * 100).toFixed(0)}% p.a.</label>
                            <input type="range" min={0.07} max={0.14} step={0.01} value={jseReturn}
                                onChange={e => setJseReturn(Number(e.target.value))}/>
                            <p className="input-hint">For comparison - what the same rands earn locally.</p>
                        </div>

                        <div className="input-field">
                            <label>Horizon: {years} years</label>
                            <input type="range" min={1} max={15} step={1} value={years}
                                onChange={e => setYears(Number(e.target.value))}/>
                        </div>

                        {/* Effective ZAR return summary */}
                        <div className="ops-return-table">
                            <p className="ops-return-table-title">Effective ZAR return by scenario</p>
                            <div className="ops-return-row">
                                <span style={{ color: '#ef4444' }}>Rand weakens 7%</span>
                                <strong>{effectiveWeak}% p.a.</strong>
                            </div>
                            <div className="ops-return-row ops-return-row--base">
                                <span style={{ color: '#6366f1' }}>Base case 5%</span>
                                <strong>{effectiveBase}% p.a.</strong>
                            </div>
                            <div className="ops-return-row">
                                <span style={{ color: '#22c55e' }}>Rand strengthens 2%</span>
                                <strong>{effectiveStrong}% p.a.</strong>
                            </div>
                            <div className="ops-return-row ops-return-row--jse">
                                <span style={{ color: 'var(--absa-red)' }}>Local JSE</span>
                                <strong>{(jseReturn * 100).toFixed(0)}% p.a.</strong>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* RIGHT: Results */}
                <div className="split-right">

                    {/* Verdict */}
                    <div className="ops-verdict">
                        <div className="ops-verdict-main">
                            <p className="ops-verdict-tag">{years}-year portfolio in rand terms - base scenario</p>
                            <h2 className="ops-verdict-title">{fmtZAR(finalBase?.zarValue ?? 0)}</h2>
                            <p className="ops-verdict-usd">= {fmtUSD(finalBase?.usdValue ?? 0)} at end-of-period rate of R{finalBase?.fxRate ?? STARTING_FX_RATE}/$</p>
                        </div>
                        <div className="ops-verdict-range">
                            <div className="ops-verdict-range-item">
                                <span style={{ color: '#ef4444' }}>▲ Rand weakens</span>
                                <strong>{fmtZAR(finalWeak?.zarValue ?? 0)}</strong>
                            </div>
                            <div className="ops-verdict-range-divider"/>
                            <div className="ops-verdict-range-item">
                                <span style={{ color: '#22c55e' }}>▼ Rand strengthens</span>
                                <strong>{fmtZAR(finalStrong?.zarValue ?? 0)}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div className="ops-stats">
                        <StatCard
                            label="USD portfolio (base)"
                            value={fmtUSD(finalBase?.usdValue ?? 0)}
                            sub={`at ${(usdReturn * 100).toFixed(1)}% USD p.a. over ${years} years`}
                            accent="usd"
                        />
                        <StatCard
                            label="Effective ZAR return"
                            value={`${effectiveBase}% p.a.`}
                            sub={`${(usdReturn * 100).toFixed(1)}% USD + 5% rand depreciation`}
                            accent="fx"
                        />
                        <StatCard
                            label={fxBonus >= 0 ? 'Currency gain (base)' : 'Currency drag (base)'}
                            value={fmtZAR(Math.abs(fxBonus))}
                            sub={fxBonus >= 0
                                ? 'extra ZAR value from rand depreciation'
                                : 'ZAR value lost if rand stays flat'}
                            accent={fxBonus >= 0 ? 'gain' : 'loss'}
                        />
                        <StatCard
                            label={offshoreAheadOfJse ? 'Offshore beats JSE by' : 'JSE beats offshore by'}
                            value={fmtZAR(Math.abs((finalBase?.zarValue ?? 0) - (finalJse?.zarValue ?? 0)))}
                            sub={`vs local JSE at ${(jseReturn * 100).toFixed(0)}% p.a. (base scenario)`}
                            accent={offshoreAheadOfJse ? 'gain' : undefined}
                        />
                    </div>

                    {/* Scenario chart */}
                    <div className="result-card">
                        <h3>ZAR portfolio value across rand scenarios - {years} years</h3>
                        <p className="ops-chart-subtitle">
                            The shaded band between the red and green lines is your currency risk range.
                            The wider the band, the more the rand's path determines your outcome.
                        </p>
                        <ScenarioChart chartData={chartData} years={years}/>
                        <div className="ops-chart-legend">
                            <span><span className="ops-legend-dot" style={{ background: '#ef4444' }}/>Rand weakens 7%</span>
                            <span><span className="ops-legend-dot" style={{ background: '#6366f1' }}/>Base case 5%</span>
                            <span><span className="ops-legend-dot" style={{ background: '#22c55e' }}/>Rand strengthens −2%</span>
                            <span><span className="ops-legend-dot ops-legend-dot--red"/>Local JSE 11%</span>
                        </div>
                    </div>

                    {/* Coaching callouts */}
                    <div className="ops-coaching">

                        <CoachCallout title="💱 The currency multiplier - how rand depreciation stacks on investment returns" type="info">
                            <p>
                                Your portfolio earns <strong>{(usdReturn * 100).toFixed(1)}% p.a. in USD</strong>.
                                When the rand depreciates 5% per year against the dollar, your <strong>effective ZAR return becomes {effectiveBase}% p.a.</strong> -
                                because every dollar you own is worth more rands next year.
                                The formula: (1 + {(usdReturn * 100).toFixed(1)}%) × (1 + 5%) − 1 = {effectiveBase}%.
                                This is not magic - it only works while your money stays in USD.
                                The moment you convert back to rands, the FX benefit crystallises.
                            </p>
                        </CoachCallout>

                        <CoachCallout
                            title={annualContrib <= SDA_LIMIT
                                ? `✅ Your allowance - ${fmtZAR(annualContrib)}/year within the R2M SDA`
                                : `⚠️ You've exceeded the SDA - FIA clearance required`}
                            type={annualContrib <= SDA_LIMIT ? 'nudge' : 'warn'}
                        >
                            <p>
                                {annualContrib <= SDA_LIMIT ? (
                                    <>
                                        South Africa allows every taxpayer to transfer up to <strong>R2M offshore per year</strong> without
                                        needing SARS approval - this is the Single Discretionary Allowance (SDA).
                                        Your {fmtZAR(annualContrib)}/year uses <strong>{Math.round((annualContrib / SDA_LIMIT) * 100)}%</strong> of that limit.
                                        If you want to invest more than R2M per year, you apply for a Foreign Investment Allowance (FIA)
                                        which allows up to R10M - but you need a SARS tax clearance certificate first.
                                    </>
                                ) : (
                                    <>
                                        Your {fmtZAR(annualContrib)}/year offshore exceeds the <strong>R2M Single Discretionary Allowance</strong>.
                                        You need a <strong>Foreign Investment Allowance (FIA)</strong> from SARS, which permits up to R10M per year.
                                        Apply via eFiling - it typically takes 3-5 business days. Do not transfer above R2M without this clearance.
                                    </>
                                )}
                            </p>
                        </CoachCallout>

                        <CoachCallout title="🧾 The tax reality - what SARS wants when you invest offshore" type="warn">
                            <p>
                                As a South African tax resident, your <strong>worldwide income is taxable in SA</strong>.
                                Dividends from foreign companies (e.g. US ETFs) attract a <strong>15% withholding tax</strong> at source under the SA-US tax treaty.
                                When you eventually sell your offshore investments, <strong>Capital Gains Tax (CGT) applies</strong>:
                                the first R40 000 in gains per year is excluded, then 40% of remaining gains are included in your taxable income.
                                At a 36% marginal rate, your effective CGT rate is approximately 14.4%.
                                Spread large disposals across tax years to manage your CGT exposure.
                            </p>
                        </CoachCallout>
                    </div>

                    {/* Studio verdict */}
                    <StudioVerdict
                        type={verdict.type}
                        headline={verdict.headline}
                        points={verdict.points}
                        nextStep={verdict.nextStep}
                        nextPath={verdict.nextPath}
                    />

                    {/* Learn section */}
                    <div className="learn-section">
                        <button className="learn-toggle" onClick={() => setLearnOpen(p => !p)}>
                            <Icon name="learn" size={17}/>
                            {learnOpen ? 'Hide' : 'Understand'} the concepts in this simulation
                        </button>
                        {learnOpen && (
                            <div className="learn-grid">
                                <LearnCard term="Single Discretionary Allowance (SDA)" explanation="R2M per year that every SA taxpayer can send offshore without SARS approval. No paperwork, no tax clearance. This is the amount most retail investors use for offshore ETFs and platform accounts."/>
                                <LearnCard term="Foreign Investment Allowance (FIA)" explanation="Allows up to R10M offshore per year after obtaining a SARS tax clearance certificate via eFiling. Required if your annual offshore transfers exceed R2M. Typically takes 3-5 business days to process."/>
                                <LearnCard term="Currency risk vs opportunity" explanation="If the rand strengthens against the dollar, your offshore investment is worth fewer rands than expected - currency drag. If the rand weakens (its historical pattern), your offshore investment is worth more rands - currency bonus. The chart shows both outcomes."/>
                                <LearnCard term="Effective ZAR return" explanation="The real return you earn in rand terms from an offshore investment. Formula: (1 + USD return) × (1 + rand depreciation) − 1. At 9.5% USD and 5% rand depreciation, your effective ZAR return is approximately 15%."/>
                                <LearnCard term="Dividends withholding tax" explanation="US companies withhold 30% tax on dividends by default. SA investors benefit from the SA-US tax treaty, which reduces this to 15%. Reinvesting dividends inside a USD ETF (accumulating fund) avoids this entirely - the ETF handles it internally."/>
                                <LearnCard term="CGT on offshore investments" explanation="Capital Gains Tax applies when you sell offshore assets. Your annual exclusion is R40 000. Above that, 40% of the gain is included in your taxable income. At a 36% marginal rate, your effective CGT rate is ~14.4%. Spreading sales across tax years reduces liability."/>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}
