import { useState, useMemo } from 'react'
import { TrendingDown, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react'
import { FormattedNumberInput } from '../components/FormattedInput'
import { useUserProfile } from '../context/UserProfileContext'
import {
    fmtZAR, SA, calcNetSurplus,
} from '../components/financialCalcs'
import "../styles/shared/TracksStudioShared.css"
import "../styles/pages/CarVsInvest.css"
import Icon from "../components/Icons"
import LearnCard from "../components/LearnCard"
import StudioVerdict from "../components/StudioVerdict"
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts'

/* Scenario presets */
const SCENARIOS = [
    {
        id: 'practical', label: 'Practical',
        carPrice: 220000, depositPct: 10, financeRate: 0.1125, termMonths: 60,
        balloonPct: 0, monthlyFuel: 1800, monthlyInsurance: 900, monthlyMaintenance: 400,
    },
    {
        id: 'ambitious', label: 'Ambitious',
        carPrice: 420000, depositPct: 10, financeRate: 0.1175, termMonths: 60,
        balloonPct: 20, monthlyFuel: 2800, monthlyInsurance: 1600, monthlyMaintenance: 700,
    },
    {
        id: 'luxury', label: 'Luxury',
        carPrice: 750000, depositPct: 15, financeRate: 0.1225, termMonths: 72,
        balloonPct: 30, monthlyFuel: 4000, monthlyInsurance: 3200, monthlyMaintenance: 1200,
    },
]

/* Depreciation model (SA market averages) */
const DEPR_RATES = [0.80, 0.85, 0.88, 0.90, 0.90, 0.92, 0.92, 0.92, 0.93, 0.93]

function getCarValue(originalPrice, year) {
    let value = originalPrice
    for (let y = 0; y < year; y++) {
        value *= y < DEPR_RATES.length ? DEPR_RATES[y] : 0.93
    }
    return Math.round(value)
}

/* Finance payment with balloon (PMT with future value) */
function calcFinancePayment(loanAmount, monthlyRate, termMonths, balloon) {
    if (monthlyRate === 0) return Math.round((loanAmount - balloon) / termMonths)
    return Math.round(
        (loanAmount - balloon * Math.pow(1 + monthlyRate, -termMonths)) *
        monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMonths))
    )
}

/* Simulation engine */
function runSimulation({
    carPrice, depositPct, financeRate, termMonths, balloonPct,
    monthlyFuel, monthlyInsurance, monthlyMaintenance, investmentReturn, years,
}) {
    const deposit        = Math.round(carPrice * depositPct / 100)
    const balloon        = Math.round(carPrice * balloonPct / 100)
    const loanAmount     = carPrice - deposit
    const monthlyRate    = financeRate / 12
    const monthlyPayment = calcFinancePayment(loanAmount, monthlyRate, termMonths, balloon)
    const monthlyRunning = monthlyFuel + monthlyInsurance + monthlyMaintenance

    let loanBalance      = loanAmount
    let investPortfolio  = 0
    let totalInterest    = 0
    const snapshots      = []

    for (let year = 1; year <= years; year++) {
        for (let month = 0; month < 12; month++) {
            const absMonth = (year - 1) * 12 + month + 1

            /* Loan repayment */
            if (absMonth <= termMonths && loanBalance > 0) {
                const interest   = loanBalance * monthlyRate
                const principal  = Math.min(monthlyPayment - interest, loanBalance)
                loanBalance      = Math.max(0, loanBalance - principal)
                totalInterest   += interest
            }

            /* Investor puts the finance payment amount into the market every month */
            investPortfolio = investPortfolio * (1 + investmentReturn / 12) + monthlyPayment
        }

        /* At the end of the finance term, balloon ting be coming due */
        const termYear     = Math.ceil(termMonths / 12)
        const balloonDue   = year === termYear && balloon > 0 ? balloon : 0
        const effectiveBal = loanBalance + balloonDue

        const carVal     = getCarValue(carPrice, year)
        const carNetWorth = carVal - effectiveBal

        snapshots.push({
            year,
            carValue:      carVal,
            loanBalance:   Math.round(effectiveBal),
            carNetWorth:   Math.round(carNetWorth),
            investPortfolio: Math.round(investPortfolio),
        })
    }

    /* First year depreciation loss */
    const yr1Loss = carPrice - getCarValue(carPrice, 1)

    return {
        snapshots, monthlyPayment, monthlyRunning, deposit, balloon, loanAmount,
        totalInterestPaid: Math.round(totalInterest),
        totalRunningCosts: Math.round(monthlyRunning * years * 12),
        yr1Loss,
    }
}

/* Find year car net worth turns positive */
function findEquityYear(snapshots) {
    return snapshots.find(s => s.carNetWorth >= 0)?.year ?? null
}

/* Chart */
function ComparisonChart({ snapshots, equityYear }) {
    if (!snapshots.length) return null

    const data = snapshots.map(s => ({
        name:        `Yr ${s.year}`,
        'Car equity':  s.carNetWorth,
        'Invest':      s.investPortfolio,
    }))

    const hasNegative = snapshots.some(s => s.carNetWorth < 0)

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
                {payload.find(p => p.name === 'Car equity')?.value < 0 && (
                    <p style={{ fontSize: '0.68rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                        Negative equity - you owe more than the car is worth
                    </p>
                )}
            </div>
        )
    }

    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--n-100)"/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--n-400)' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={formatY} tick={{ fontSize: 11, fill: 'var(--n-400)' }} width={64} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                {/* Zero line - makes negative equity visible */}
                <ReferenceLine y={0} stroke="var(--n-300)" strokeWidth={1.5}/>
                {/* Shade the negative equity zone */}
                {hasNegative && (
                    <ReferenceArea y1={snapshots.reduce((min, s) => Math.min(min, s.carNetWorth), 0) * 1.1} y2={0}
                        fill="var(--danger-bg)" fillOpacity={0.5}/>
                )}
                {equityYear && equityYear > 1 && (
                    <ReferenceLine
                        x={`Yr ${equityYear}`} stroke="var(--success)" strokeDasharray="4 3"
                        label={{ value: 'Equity+', position: 'top', fontSize: 10, fill: 'var(--success)' }}
                    />
                )}
                <Line type="monotone" dataKey="Car equity" stroke="var(--absa-red)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}/>
                <Line type="monotone" dataKey="Invest"     stroke="#374151"          strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} strokeDasharray="6 3"/>
            </LineChart>
        </ResponsiveContainer>
    )
}

/* Stat card */
function StatCard({ label, value, sub, accent }) {
    return (
        <div className={`cvi-stat-card ${accent ? `cvi-stat-card--${accent}` : ''}`}>
            <p className="cvi-stat-label">{label}</p>
            <p className="cvi-stat-value">{value}</p>
            {sub && <p className="cvi-stat-sub">{sub}</p>}
        </div>
    )
}

/* True monthly cost bar */
function TrueCostBar({ financePayment, monthlyFuel, monthlyInsurance, monthlyMaintenance }) {
    const total = financePayment + monthlyFuel + monthlyInsurance + monthlyMaintenance
    const segments = [
        { label: 'Finance',     value: financePayment,       colour: 'var(--absa-red)' },
        { label: 'Fuel',        value: monthlyFuel,          colour: '#b45309' },
        { label: 'Insurance',   value: monthlyInsurance,     colour: '#78350f' },
        { label: 'Maintenance', value: monthlyMaintenance,   colour: '#374151' },
    ]
    return (
        <div className="cvi-cost-bar-wrap">
            <div className="cvi-cost-bar">
                {segments.map(s => (
                    <div
                        key={s.label}
                        className="cvi-cost-segment"
                        style={{ width: `${(s.value / total) * 100}%`, background: s.colour }}
                        title={`${s.label}: ${fmtZAR(s.value)}`}
                    />
                ))}
            </div>
            <div className="cvi-cost-legend">
                {segments.map(s => (
                    <div key={s.label} className="cvi-cost-legend-item">
                        <span className="cvi-cost-dot" style={{ background: s.colour }}/>
                        <span className="cvi-cost-leg-label">{s.label}</span>
                        <strong>{fmtZAR(s.value)}</strong>
                    </div>
                ))}
                <div className="cvi-cost-legend-item cvi-cost-legend-total">
                    <span/>
                    <span className="cvi-cost-leg-label">True monthly cost</span>
                    <strong>{fmtZAR(total)}</strong>
                </div>
            </div>
        </div>
    )
}

/* Coaching callout */
function CoachCallout({ title, children, type = 'info' }) {
    return (
        <div className={`cvi-coach cvi-coach--${type}`}>
            <p className="cvi-coach-title">{title}</p>
            <div className="cvi-coach-body">{children}</div>
        </div>
    )
}

/* Verdict logic */
function computeCarVerdict({ hasProfile, surplus, trueMonthly, opportunityCost, finalCarValue, balloonPct, balloon, termMonths, years, investReturn }) {
    if (!hasProfile) {
        return {
            type:     'blocked',
            headline: 'Add your financial data to assess affordability',
            points: [
                'Enter your income in Money Snapshot to check if this car fits your budget',
                'The 15% rule: total transport costs should stay under 15% of take-home pay',
                'The opportunity cost calculation already works - see the chart above for the wealth trade-off',
            ],
        }
    }

    const transportPct = surplus > 0 ? Math.round((trueMonthly / surplus) * 100) : 999

    if (transportPct > 30) {
        return {
            type:     'caution',
            headline: 'This car is consuming too much of your income',
            points: [
                `True monthly cost of ${fmtZAR(trueMonthly)} is ${transportPct}% of your surplus - well above the 15% guideline`,
                `You would be ${fmtZAR(opportunityCost)} wealthier at Year ${years} if the payments were invested at ${(investReturn * 100).toFixed(0)}% instead`,
                balloonPct > 0
                    ? `The ${fmtZAR(balloon)} balloon at month ${termMonths} adds a lump-sum obligation on top of everything else`
                    : 'Consider a lower price point that keeps total transport under 15% of your surplus',
            ],
            nextStep: 'Review your budget',
            nextPath: '/dashboard',
        }
    }

    if (transportPct > 15) {
        return {
            type:     'neutral',
            headline: 'Affordable, but the opportunity cost is real',
            points: [
                `True monthly cost of ${fmtZAR(trueMonthly)} is ${transportPct}% of your surplus - slightly above the 15% guideline`,
                `Investing the payments instead would yield ${fmtZAR(opportunityCost)} more over ${years} years - that is the honest price of this choice`,
                balloonPct > 0
                    ? `The ${fmtZAR(balloon)} balloon at month ${termMonths} needs a savings plan now - it does not disappear`
                    : 'This is manageable if mobility genuinely justifies the cost in your situation',
            ],
        }
    }

    return {
        type:     'positive',
        headline: 'This car fits your budget',
        points: [
            `True monthly cost of ${fmtZAR(trueMonthly)} is ${transportPct}% of your surplus - within the 15% guideline`,
            `Opportunity cost over ${years} years is ${fmtZAR(opportunityCost)} - you should know this number before signing`,
            balloonPct > 0
                ? `The ${fmtZAR(balloon)} balloon at month ${termMonths} is the one outstanding risk - plan to pay it, not refinance it`
                : 'No balloon, clean deal structure. This is how a car purchase should look.',
        ],
    }
}

/* Main component */
export default function CarVsInvest() {
    const { profile } = useUserProfile()

    const [learnOpen,      setLearnOpen]      = useState(false)
    const [tableOpen,      setTableOpen]      = useState(false)
    const [activeScenario, setActiveScenario] = useState('ambitious')

    const [carPrice,        setCarPrice]        = useState(420000)
    const [depositPct,      setDepositPct]      = useState(10)
    const [financeRate,     setFinanceRate]      = useState(0.1175)
    const [termMonths,      setTermMonths]       = useState(60)
    const [balloonPct,      setBalloonPct]       = useState(20)
    const [monthlyFuel,     setMonthlyFuel]      = useState(2800)
    const [monthlyInsurance,setMonthlyInsurance] = useState(1600)
    const [monthlyMaint,    setMonthlyMaint]     = useState(700)
    const [investReturn,    setInvestReturn]     = useState(0.11)
    const [years,           setYears]            = useState(5)

    function applyScenario(s) {
        setActiveScenario(s.id)
        setCarPrice(s.carPrice); setDepositPct(s.depositPct)
        setFinanceRate(s.financeRate); setTermMonths(s.termMonths)
        setBalloonPct(s.balloonPct); setMonthlyFuel(s.monthlyFuel)
        setMonthlyInsurance(s.monthlyInsurance); setMonthlyMaint(s.monthlyMaintenance)
    }

    const surplus   = profile.grossIncome > 0 ? calcNetSurplus(profile) : null
    const hasProfile = profile.grossIncome > 0

    const result = useMemo(() => runSimulation({
        carPrice, depositPct, financeRate, termMonths, balloonPct,
        monthlyFuel, monthlyInsurance, monthlyMaintenance: monthlyMaint,
        investmentReturn: investReturn, years,
    }), [carPrice, depositPct, financeRate, termMonths, balloonPct,
         monthlyFuel, monthlyInsurance, monthlyMaint, investReturn, years])

    const { snapshots, monthlyPayment, monthlyRunning, deposit, balloon,
            totalInterestPaid, totalRunningCosts, yr1Loss } = result

    const finalYear      = snapshots[snapshots.length - 1]
    const equityYear     = useMemo(() => findEquityYear(snapshots), [snapshots])
    const opportunityCost = (finalYear?.investPortfolio ?? 0) - Math.max(0, finalYear?.carNetWorth ?? 0)
    const totalTrueCost  = totalInterestPaid + deposit + totalRunningCosts
    const trueMonthly    = monthlyPayment + monthlyRunning

    const canAfford = surplus !== null && surplus >= trueMonthly

    const verdict = computeCarVerdict({
        hasProfile, surplus, trueMonthly, opportunityCost,
        finalCarValue: finalYear?.carValue ?? 0,
        balloonPct, balloon, termMonths, years, investReturn,
    })

    function handleReset() {
        setCarPrice(0); setDepositPct(0); setBalloonPct(0)
        setMonthlyFuel(0); setMonthlyInsurance(0); setMonthlyMaint(0)
        setActiveScenario(null)
        setInvestReturn(0.11); setYears(5)
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Car vs Invest Studio</h1>
                    <p className="page-subtitle">
                        What does a car upgrade actually cost you in wealth? See the real numbers -
                        including the depreciation hit, the balloon trap, and what those payments would be worth invested.
                    </p>
                </div>
                <button className="reset-btn" onClick={handleReset}>Reset</button>
            </div>

            <div className="split-body">

                {/* LEFT: Inputs */}
                <aside className="split-left">

                    {/* Presets */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="tracks" size={13}/> Scenario</p>
                        <div className="cvi-presets">
                            {SCENARIOS.map(s => (
                                <button key={s.id}
                                    className={`cvi-preset-btn ${activeScenario === s.id ? 'cvi-preset-btn--active' : ''}`}
                                    onClick={() => applyScenario(s)}>
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Car details */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="target" size={13}/> Vehicle</p>

                        <div className="input-field">
                            <label>Car price</label>
                            <FormattedNumberInput
                                value={carPrice}
                                onChange={v => { setCarPrice(v); setActiveScenario(null) }}
                            />
                        </div>

                        <div className="input-field">
                            <label>Deposit: {depositPct}% - {fmtZAR(deposit)}</label>
                            <input type="range" min={0} max={30} step={5} value={depositPct}
                                onChange={e => { setDepositPct(Number(e.target.value)); setActiveScenario(null) }}/>
                        </div>

                        <div className="input-field">
                            <label>Finance rate: {(financeRate * 100).toFixed(2)}% p.a.</label>
                            <input type="range" min={0.09} max={0.18} step={0.0025} value={financeRate}
                                onChange={e => { setFinanceRate(Number(e.target.value)); setActiveScenario(null) }}/>
                            <p className="input-hint">Typical SA vehicle finance: prime + 1-3% ({((SA.PRIME_RATE + 0.01) * 100).toFixed(2)}%-{((SA.PRIME_RATE + 0.03) * 100).toFixed(2)}%)</p>
                        </div>

                        <div className="input-field">
                            <label>Finance term: {termMonths} months</label>
                            <input type="range" min={24} max={96} step={12} value={termMonths}
                                onChange={e => { setTermMonths(Number(e.target.value)); setActiveScenario(null) }}/>
                            <p className="input-hint">Longer term = lower monthly, more interest paid total.</p>
                        </div>

                        <div className="input-field">
                            <label>Balloon payment: {balloonPct}%{balloon > 0 ? ` - ${fmtZAR(balloon)}` : ' (none)'}</label>
                            <input type="range" min={0} max={40} step={5} value={balloonPct}
                                onChange={e => { setBalloonPct(Number(e.target.value)); setActiveScenario(null) }}/>
                            {balloonPct > 0 && (
                                <p className="input-hint" style={{ color: 'var(--warning)' }}>
                                    <AlertTriangle size={13} strokeWidth={1.75} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3rem' }}/>{fmtZAR(balloon)} due as a lump sum at month {termMonths}. Monthly payment looks smaller but this is not free money.
                                </p>
                            )}
                        </div>

                        <div className="cvi-repayment">
                            <span>Monthly finance payment</span>
                            <strong>{fmtZAR(monthlyPayment)}</strong>
                        </div>
                    </div>

                    {/* Running costs */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="debt" size={13}/> Running costs</p>

                        <div className="input-field">
                            <label>Fuel / month</label>
                            <FormattedNumberInput
                                value={monthlyFuel}
                                onChange={v => { setMonthlyFuel(v); setActiveScenario(null) }}
                            />
                        </div>

                        <div className="input-field">
                            <label>Insurance / month</label>
                            <FormattedNumberInput
                                value={monthlyInsurance}
                                onChange={v => { setMonthlyInsurance(v); setActiveScenario(null) }}
                            />
                            <p className="input-hint">Comprehensive cover on a R420k car: R1 200-R2 500/month.</p>
                        </div>

                        <div className="input-field">
                            <label>Maintenance / month</label>
                            <FormattedNumberInput
                                value={monthlyMaint}
                                onChange={v => { setMonthlyMaint(v); setActiveScenario(null) }}
                            />
                            <p className="input-hint">Service plan, tyres, wear items. Budget R500-R1 500/month.</p>
                        </div>
                    </div>

                    {/* Investment assumption */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="tfsa" size={13}/> Alternative</p>
                        <div className="input-field">
                            <label>If invested instead: {(investReturn * 100).toFixed(0)}% p.a.</label>
                            <input type="range" min={0.06} max={0.15} step={0.01} value={investReturn}
                                onChange={e => { setInvestReturn(Number(e.target.value)); setActiveScenario(null) }}/>
                            <p className="input-hint">JSE ETF: 9-12% · Money market: 7-8%</p>
                        </div>
                        <div className="input-field">
                            <label>Simulation: {years} years</label>
                            <input type="range" min={1} max={10} step={1} value={years}
                                onChange={e => setYears(Number(e.target.value))}/>
                        </div>
                    </div>

                    {/* Profile affordability */}
                    {hasProfile && (
                        <div className={`cvi-afford ${canAfford ? 'cvi-afford--ok' : 'cvi-afford--warn'}`}>
                            <div className="cvi-afford-header">
                                <Icon name={canAfford ? 'ok' : 'warn'} size={13}/>
                                <strong>{canAfford ? 'Within your means' : 'Exceeds your surplus'}</strong>
                            </div>
                            <p>True monthly cost {fmtZAR(trueMonthly)} vs your surplus {fmtZAR(surplus)}</p>
                        </div>
                    )}
                </aside>

                {/* RIGHT: Results */}
                <div className="split-right">

                    {carPrice === 0 ? (
                        <div className="studio-empty-state">
                            <p className="studio-empty-title">Enter a car price to see your results</p>
                            <p className="studio-empty-sub">Set the car price on the left to run the simulation.</p>
                        </div>
                    ) : (<>

                    {/* Verdict */}
                    <div className="cvi-verdict">
                        <div className="cvi-verdict-left">
                            <p className="cvi-verdict-tag">Opportunity cost over {years} years</p>
                            <h2 className="cvi-verdict-title">Investing wins by {fmtZAR(opportunityCost)}</h2>
                            <p className="cvi-verdict-sub">
                                That is what the finance payments would be worth if invested at {(investReturn * 100).toFixed(0)}% p.a. instead.
                                This is the price of the car beyond the sticker.
                            </p>
                        </div>
                        <div className="cvi-verdict-right">
                            {equityYear ? (
                                <>
                                    <p className="cvi-verdict-cross-label">Positive equity in</p>
                                    <p className="cvi-verdict-cross-year">Year {equityYear}</p>
                                    <p className="cvi-verdict-cross-sub">car value &gt; what you owe</p>
                                </>
                            ) : (
                                <>
                                    <p className="cvi-verdict-cross-label">Still underwater</p>
                                    <p className="cvi-verdict-cross-year">at Year {years}</p>
                                    <p className="cvi-verdict-cross-sub">owe more than car is worth</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div className="cvi-stats">
                        <StatCard
                            label="Invest portfolio"
                            value={fmtZAR(finalYear?.investPortfolio ?? 0)}
                            sub={`if finance payment invested at ${(investReturn * 100).toFixed(0)}% p.a.`}
                            accent="invest"
                        />
                        <StatCard
                            label={`Car value at Yr ${years}`}
                            value={fmtZAR(finalYear?.carValue ?? 0)}
                            sub={`from ${fmtZAR(carPrice)} · depreciation`}
                        />
                        <StatCard
                            label="Total interest paid"
                            value={fmtZAR(totalInterestPaid)}
                            sub={`over ${termMonths}-month term · cost of borrowing`}
                            accent="danger"
                        />
                        <StatCard
                            label="Year 1 value drop"
                            value={fmtZAR(yr1Loss)}
                            sub={`${Math.round((yr1Loss / carPrice) * 100)}% lost in the first 12 months`}
                            accent="danger"
                        />
                    </div>

                    {/* True monthly cost breakdown */}
                    <div className="result-card">
                        <h3>True monthly cost: {fmtZAR(trueMonthly)}</h3>
                        <TrueCostBar
                            financePayment={monthlyPayment}
                            monthlyFuel={monthlyFuel}
                            monthlyInsurance={monthlyInsurance}
                            monthlyMaintenance={monthlyMaint}
                        />
                        {surplus !== null && (
                            <p className="cvi-surplus-note">
                                This is <strong>{Math.round((trueMonthly / (surplus + trueMonthly)) * 100)}%</strong> of your gross cash flow available for this expense. Financial advisors recommend keeping total transport costs below <strong>15%</strong> of take-home pay.
                            </p>
                        )}
                    </div>

                    {/* Chart */}
                    <div className="result-card">
                        <h3>Car equity vs investment portfolio over {years} years</h3>
                        <div className="cvi-chart-legend">
                            <span><span className="cvi-legend-line" style={{ background: 'var(--absa-red)' }}/>Car equity (value − balance)</span>
                            <span><span className="cvi-legend-line cvi-legend-dashed" style={{ background: '#374151' }}/>Invest portfolio</span>
                            {snapshots.some(s => s.carNetWorth < 0) && (
                                <span><span className="cvi-legend-zone"/>Negative equity zone</span>
                            )}
                        </div>
                        <ComparisonChart snapshots={snapshots} equityYear={equityYear}/>
                    </div>

                    {/* Coaching callouts */}
                    <div className="cvi-coaching">

                        <CoachCallout title={<><TrendingDown size={13} strokeWidth={1.75}/> The depreciation shock - what Year 1 actually does to your car</>} type="warn">
                            <p>
                                Your {fmtZAR(carPrice)} car is worth approximately <strong>{fmtZAR(getCarValue(carPrice, 1))}</strong> after 12 months -
                                a <strong>{fmtZAR(yr1Loss)} loss</strong> the moment you drive off the lot.
                                You still owe approximately {fmtZAR(Math.max(0, snapshots[0]?.loanBalance ?? 0))} on the finance.
                                {(snapshots[0]?.carNetWorth ?? 0) < 0
                                    ? ` That means you are ${fmtZAR(Math.abs(snapshots[0]?.carNetWorth ?? 0))} underwater - you owe more than the car is worth. If you had to sell it in Year 1, you would still owe the bank money after the sale.`
                                    : ` You are above water, but your equity is thin.`}
                            </p>
                        </CoachCallout>

                        {balloonPct > 0 ? (
                            <CoachCallout title={<><AlertTriangle size={13} strokeWidth={1.75}/> The balloon trap - {fmtZAR(balloon)} due at month {termMonths}</>} type="danger">
                                <p>
                                    The balloon payment makes your <strong>monthly payment look {fmtZAR(Math.round(monthlyPayment * 0.15))} lower</strong> than it would be without it.
                                    But it is not free - {fmtZAR(balloon)} is due as a lump sum at the end of the {termMonths}-month term.
                                    Most people cannot pay it and roll it into a new finance deal, starting the depreciation cycle over again.
                                    <strong> Avoid balloon payments unless you have a specific plan to pay the lump sum.</strong>
                                </p>
                            </CoachCallout>
                        ) : (
                            <CoachCallout title={<><CheckCircle size={13} strokeWidth={1.75}/> No balloon - clean deal structure</>} type="info">
                                <p>
                                    Your deal has no balloon payment. Every rand of your monthly payment reduces what you owe.
                                    This is the cleanest structure - you build equity consistently and won't face a lump-sum surprise at the end of the term.
                                    If a dealer offers you a lower monthly payment with a balloon option, now you know the trade-off.
                                </p>
                            </CoachCallout>
                        )}

                        <CoachCallout title={<><Lightbulb size={13} strokeWidth={1.75}/> The opportunity cost - {fmtZAR(monthlyPayment)}/month for {years} years</>} type="nudge">
                            <p>
                                If you invested your <strong>{fmtZAR(monthlyPayment)}/month finance payment</strong> instead of paying it to the bank,
                                it would grow to <strong>{fmtZAR(finalYear?.investPortfolio ?? 0)}</strong> over {years} years at {(investReturn * 100).toFixed(0)}% p.a.
                                Your car will be worth <strong>{fmtZAR(finalYear?.carValue ?? 0)}</strong> by then.
                                The difference - <strong>{fmtZAR(opportunityCost)}</strong> - is the true cost of choosing the car over investing.
                                That is not an argument against buying a car. It is the number you should know before you sign.
                            </p>
                        </CoachCallout>
                    </div>

                    {/* Year-by-year table (collapsible) */}
                    <div className="learn-section">
                        <button className="learn-toggle" onClick={() => setTableOpen(p => !p)}>
                            <Icon name="learn" size={17}/>
                            {tableOpen ? 'Hide' : 'Show'} year-by-year breakdown
                        </button>
                        {tableOpen && (
                            <div style={{ padding: '0 1.1rem 1.1rem' }}>
                                <div className="table-wrap">
                                    <table className="breakdown-table">
                                        <thead>
                                            <tr>
                                                <th>Year</th>
                                                <th>Car value</th>
                                                <th>Loan balance</th>
                                                <th>Car equity</th>
                                                <th>Invest portfolio</th>
                                                <th>Gap</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {snapshots.map(s => (
                                                <tr key={s.year}>
                                                    <td>Year {s.year}</td>
                                                    <td>{fmtZAR(s.carValue)}</td>
                                                    <td>{fmtZAR(s.loanBalance)}</td>
                                                    <td style={{ color: s.carNetWorth < 0 ? 'var(--danger)' : 'inherit' }}>
                                                        {fmtZAR(s.carNetWorth)}
                                                    </td>
                                                    <td className="cell--win">{fmtZAR(s.investPortfolio)}</td>
                                                    <td>{fmtZAR(s.investPortfolio - Math.max(0, s.carNetWorth))}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
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
                                <LearnCard term="Vehicle depreciation" explanation="New cars lose 15-25% of their value in Year 1 alone. Unlike property, cars are a depreciating asset - they become worth less over time, not more. A car is a cost, not an investment."/>
                                <LearnCard term="Negative equity" explanation="When your outstanding loan balance exceeds the car's market value, you are 'underwater' or in negative equity. If you sell the car in this period, you still owe the difference to the bank."/>
                                <LearnCard term="Balloon payment" explanation="A balloon (or residual value) payment reduces your monthly payment but leaves a large lump sum due at end of term. Dealers use it to make expensive cars seem affordable. The balloon has to be paid, refinanced, or built into a new deal - there is no free lunch."/>
                                <LearnCard term="Total cost of ownership" explanation="Finance payment is only part of the cost. Insurance, fuel, tyres, servicing, and maintenance can add 30-50% to your effective monthly outlay. Always budget the true monthly number, not just the finance payment."/>
                                <LearnCard term="Opportunity cost" explanation="Every rand you spend on car finance is a rand not invested. At 11% p.a. compounded, R5 000/month grows to R393 000 in 5 years. That's what the car truly costs - the wealth you didn't build."/>
                                <LearnCard term="The 15% rule" explanation="A widely used guideline: total vehicle costs (finance, insurance, fuel, maintenance) should not exceed 15% of your take-home pay. Exceeding this means your car is driving your financial decisions instead of the other way around."/>
                            </div>
                        )}
                    </div>

                    </>)}
                </div>
            </div>
        </>
    )
}
