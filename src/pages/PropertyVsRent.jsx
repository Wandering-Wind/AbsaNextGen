import { useState, useMemo } from 'react'
import { Lightbulb } from 'lucide-react'
import { FormattedNumberInput } from '../components/FormattedInput'
import { useUserProfile } from '../context/UserProfileContext'
import {
    fmtZAR, SA, calcBondRepayment,
    calcNetSurplus, calcTakeHome, calcTotalExpenses, calcDTI,
} from '../components/financialCalcs'
import "../styles/shared/TracksStudioShared.css"
import "../styles/pages/PropertyVsRent.css"
import Icon from "../components/Icons"
import LearnCard from "../components/LearnCard"
import StudioVerdict from "../components/StudioVerdict"
import {
    LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

/* Scenario presets */
const SCENARIOS = [
    { id: 'conservative', label: 'Conservative', propertyGrowth: 0.04, investReturn: 0.09 },
    { id: 'base',         label: 'Base case',    propertyGrowth: 0.06, investReturn: 0.08 },
    { id: 'optimistic',   label: 'Optimistic',   propertyGrowth: 0.08, investReturn: 0.07 },
]

/* Simulation engine */
function runSimulation({ propertyPrice, depositPct, bondRate, bondTerm, monthlyRent, rentIncreaseRate, investmentReturn, propertyGrowth, years }) {
    const deposit        = propertyPrice * (depositPct / 100)
    const bondPrincipal  = propertyPrice - deposit
    const monthlyBond    = calcBondRepayment(bondPrincipal, bondRate, bondTerm)
    const monthlyBondRate = bondRate / 12

    /* Year 1 interest ratio - teaches bond amortisation */
    const firstMonthInterest   = bondPrincipal * monthlyBondRate
    const firstMonthPrincipal  = monthlyBond - firstMonthInterest
    const yearOneInterestPct   = Math.round((firstMonthInterest / monthlyBond) * 100)

    /* Total interest over the full bond term */
    const totalInterestPaid = Math.round((monthlyBond * bondTerm * 12) - bondPrincipal)

    let propertyValue = propertyPrice
    let bondBalance   = bondPrincipal
    let rentPortfolio = 0
    let currentRent   = monthlyRent
    const snapshots   = []

    for (let year = 1; year <= years; year++) {
        for (let month = 0; month < 12; month++) {
            const interest  = bondBalance * monthlyBondRate
            bondBalance = Math.max(0, bondBalance - (monthlyBond - interest))
        }

        propertyValue = propertyValue * (1 + propertyGrowth)
        const buyNetWorth = propertyValue - bondBalance
        const monthlyDiff = monthlyBond - currentRent

        for (let month = 0; month < 12; month++) {
            rentPortfolio = rentPortfolio * (1 + investmentReturn / 12)
            if (monthlyDiff > 0) rentPortfolio += monthlyDiff
        }

        currentRent = currentRent * (1 + rentIncreaseRate)

        snapshots.push({
            year,
            buyNetWorth:   Math.round(buyNetWorth),
            rentNetWorth:  Math.round(rentPortfolio),
            propertyValue: Math.round(propertyValue),
            bondBalance:   Math.round(bondBalance),
            portfolio:     Math.round(rentPortfolio),
            monthlyBond:   Math.round(monthlyBond),
            currentRent:   Math.round(currentRent),
        })
    }

    return { snapshots, monthlyBond: Math.round(monthlyBond), deposit, yearOneInterestPct, totalInterestPaid }
}

/* Find crossover year */
function findCrossoverYear(snapshots) {
    if (!snapshots.length) return null
    const startLeader = snapshots[0].buyNetWorth >= snapshots[0].rentNetWorth ? 'buy' : 'rent'
    for (let i = 1; i < snapshots.length; i++) {
        const leader = snapshots[i].buyNetWorth >= snapshots[i].rentNetWorth ? 'buy' : 'rent'
        if (leader !== startLeader) return snapshots[i].year
    }
    return null
}

/* Net worth chart */
function NetWorthChart({ snapshots, crossoverYear }) {
    if (!snapshots.length) return null

    const data = snapshots.map(s => ({
        name:           `Yr ${s.year}`,
        'Buy path':     s.buyNetWorth,
        'Rent + invest': s.rentNetWorth,
    }))

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
        <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--n-100)"/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--n-400)' }} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={formatY} tick={{ fontSize: 11, fill: 'var(--n-400)' }} width={64} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip/>}/>
                {crossoverYear && (
                    <ReferenceLine
                        x={`Yr ${crossoverYear}`}
                        stroke="var(--n-400)"
                        strokeDasharray="4 3"
                        label={{ value: `Crossover`, position: 'top', fontSize: 10, fill: 'var(--n-500)' }}
                    />
                )}
                <Line type="monotone" dataKey="Buy path"      stroke="var(--absa-red)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }}/>
                <Line type="monotone" dataKey="Rent + invest" stroke="#6366f1"          strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} strokeDasharray="6 3"/>
            </LineChart>
        </ResponsiveContainer>
    )
}

/* Stat card */
function StatCard({ label, value, sub, highlight }) {
    return (
        <div className={`pvr-stat-card ${highlight ? 'pvr-stat-card--highlight' : ''}`}>
            <p className="pvr-stat-label">{label}</p>
            <p className="pvr-stat-value">{value}</p>
            {sub && <p className="pvr-stat-sub">{sub}</p>}
        </div>
    )
}

/* Coaching callout */
function CoachCallout({ title, children, type = 'info' }) {
    return (
        <div className={`pvr-coach pvr-coach--${type}`}>
            <p className="pvr-coach-title">{title}</p>
            <div className="pvr-coach-body">{children}</div>
        </div>
    )
}

/* Interest ratio bar */
function InterestBar({ interestPct }) {
    const principalPct = 100 - interestPct
    return (
        <div className="pvr-interest-bar">
            <div className="pvr-interest-segment pvr-interest-segment--interest" style={{ width: `${interestPct}%` }}>
                {interestPct > 20 && <span>{interestPct}% interest</span>}
            </div>
            <div className="pvr-interest-segment pvr-interest-segment--equity" style={{ width: `${principalPct}%` }}>
                {principalPct > 10 && <span>{principalPct}% equity</span>}
            </div>
        </div>
    )
}

/* Verdict logic - synthesises simulation result with user profile */
function computePropertyVerdict({ hasProfile, canAffordBond, buyWins, difference, crossoverYear, monthlyDiff, monthlyBond, surplus, depositVsSavings, deposit, dti, years }) {
    if (!hasProfile) {
        return {
            type:     'blocked',
            headline: 'Add your financial data for a personalised recommendation',
            points: [
                'Enter your income and expenses in Money Snapshot',
                'The simulation will then check whether you can afford this bond right now',
                'Your DTI and monthly surplus are the two numbers that matter most here',
            ],
        }
    }

    if (!canAffordBond) {
        return {
            type:     'caution',
            headline: 'Renting is the realistic path right now',
            points: [
                `Your surplus of ${fmtZAR(surplus)}/month cannot cover the ${fmtZAR(monthlyBond)}/month bond repayment`,
                'Renting preserves your options while you build toward bond-readiness',
                dti > 36
                    ? `Your DTI of ${dti}% is above the 36% approval threshold - clearing debt comes first`
                    : `Your savings currently cover ${depositVsSavings}% of the required ${fmtZAR(deposit)} deposit`,
            ],
            nextStep: 'Go to Property Path',
            nextPath: '/tracks/property',
        }
    }

    if (buyWins && (!crossoverYear || crossoverYear <= Math.ceil(years * 0.5))) {
        return {
            type:     'positive',
            headline: `Buying has a clear advantage over ${years} years`,
            points: [
                crossoverYear
                    ? `The buy path leads from Year ${crossoverYear} - in the first half of your simulation window`
                    : 'Buying leads throughout the entire simulation period',
                `You are ahead by ${fmtZAR(difference)} at Year ${years} under these assumptions`,
                monthlyDiff > 0
                    ? `Your bond costs ${fmtZAR(monthlyDiff)}/month more than rent - the equity you build compensates for this`
                    : `Your bond is ${fmtZAR(Math.abs(monthlyDiff))}/month cheaper than rent here - a structural advantage`,
            ],
            nextStep: 'Start Property Path',
            nextPath: '/tracks/property',
        }
    }

    if (!buyWins) {
        return {
            type:     'neutral',
            headline: `Renting and investing wins over ${years} years`,
            points: [
                monthlyDiff > 0
                    ? `This only works if you actually invest the ${fmtZAR(monthlyDiff)}/month difference - spending it means buying wins by default`
                    : 'Rent exceeds the bond here, so the buyer also has a monthly cost advantage',
                `Your surplus of ${fmtZAR(surplus)}/month ${surplus >= monthlyDiff ? 'supports this investment discipline' : 'is tight for this strategy'}`,
                `Try extending the simulation horizon - buying tends to win over longer periods as rent inflation compounds`,
            ],
        }
    }

    return {
        type:     'neutral',
        headline: 'The outcome is close - your time horizon decides it',
        points: [
            `Buying leads by ${fmtZAR(difference)} at Year ${years}, but the gap is narrow`,
            'Extend the simulation to see where the advantage becomes significant',
            'Both paths are financially viable at your income level - the choice is also personal',
        ],
    }
}

/* Main component */
export default function PropertyVsRent() {
    const { profile } = useUserProfile()
    const [learnOpen, setLearnOpen] = useState(false)
    const [tableOpen, setTableOpen] = useState(false)
    const [activeScenario, setActiveScenario] = useState('base')

    /* Inputs */
    const [propertyPrice,    setPropertyPrice]    = useState(1500000)
    const [depositPct,       setDepositPct]       = useState(10)
    const [bondRate,         setBondRate]         = useState(SA.PRIME_RATE + SA.BOND_SPREAD)
    const [bondTerm,         setBondTerm]         = useState(20)
    const [monthlyRent,      setMonthlyRent]      = useState(20000)
    const [rentIncreaseRate, setRentIncreaseRate] = useState(0.06)
    const [investmentReturn, setInvestmentReturn] = useState(0.08)
    const [propertyGrowth,   setPropertyGrowth]   = useState(SA.PROPERTY_GROWTH)
    const [years,            setYears]            = useState(7)

    function applyScenario(s) {
        setActiveScenario(s.id)
        setPropertyGrowth(s.propertyGrowth)
        setInvestmentReturn(s.investReturn)
    }

    /* Profile context */
    const surplus      = profile.grossIncome > 0 ? calcNetSurplus(profile) : null
    const bankBalance  = profile.bankBalance || 0
    const hasProfile   = profile.grossIncome > 0

    const { snapshots, monthlyBond, deposit, yearOneInterestPct, totalInterestPaid } = useMemo(
        () => runSimulation({ propertyPrice, depositPct, bondRate, bondTerm, monthlyRent, rentIncreaseRate, investmentReturn, propertyGrowth, years }),
        [propertyPrice, depositPct, bondRate, bondTerm, monthlyRent, rentIncreaseRate, investmentReturn, propertyGrowth, years]
    )

    const finalYear     = snapshots[snapshots.length - 1]
    const buyWins       = (finalYear?.buyNetWorth ?? 0) > (finalYear?.rentNetWorth ?? 0)
    const difference    = Math.abs((finalYear?.buyNetWorth ?? 0) - (finalYear?.rentNetWorth ?? 0))
    const monthlyDiff   = monthlyBond - monthlyRent
    const crossoverYear = useMemo(() => findCrossoverYear(snapshots), [snapshots])

    /* Affordability from profile */
    const canAffordBond    = surplus !== null && surplus >= monthlyBond
    const depositVsSavings = bankBalance > 0 ? Math.round((bankBalance / deposit) * 100) : 0
    const dti              = hasProfile ? calcDTI(profile) : 0

    const verdict = computePropertyVerdict({
        hasProfile, canAffordBond, buyWins, difference, crossoverYear,
        monthlyDiff, monthlyBond, surplus, depositVsSavings, deposit, dti, years,
    })

    function handleReset() {
        setPropertyPrice(1500000); setDepositPct(10)
        setBondRate(SA.PRIME_RATE + SA.BOND_SPREAD); setBondTerm(20)
        setMonthlyRent(20000); setRentIncreaseRate(0.06)
        setInvestmentReturn(0.08); setPropertyGrowth(SA.PROPERTY_GROWTH)
        setYears(7); setActiveScenario('base')
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Rent vs Buy Studio</h1>
                    <p className="page-subtitle">
                        Should you buy property or rent and invest the difference?
                        Adjust the inputs and see the real numbers - including what banks don't tell you about Year 1.
                    </p>
                </div>
                <button className="reset-btn" onClick={handleReset}>Reset</button>
            </div>

            <div className="split-body">

                {/* LEFT: Inputs */}
                <aside className="split-left">

                    {/* Scenario presets */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="tracks" size={13}/> Scenario</p>
                        <div className="pvr-presets">
                            {SCENARIOS.map(s => (
                                <button
                                    key={s.id}
                                    className={`pvr-preset-btn ${activeScenario === s.id ? 'pvr-preset-btn--active' : ''}`}
                                    onClick={() => applyScenario(s)}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                        <p className="input-hint">Sets property growth + investment return together.</p>
                    </div>

                    {/* Buying inputs */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="tracks" size={13}/> Buying</p>

                        <div className="input-field">
                            <label>Property price</label>
                            <FormattedNumberInput
                                value={propertyPrice}
                                onChange={v => { setPropertyPrice(v); setActiveScenario(null) }}
                            />
                            <p className="input-hint">JHB 2-bed northern suburbs: R1.2M-R2M</p>
                        </div>

                        <div className="input-field">
                            <label>Deposit: {depositPct}% - {fmtZAR(deposit)}</label>
                            <input type="range" min={5} max={40} step={1} value={depositPct}
                                onChange={e => setDepositPct(Number(e.target.value))}/>
                            <p className="input-hint">10% minimum. 20% eliminates transfer duty on most properties.</p>
                        </div>

                        <div className="input-field">
                            <label>Bond rate: {(bondRate * 100).toFixed(2)}% p.a.</label>
                            <input type="range" min={0.08} max={0.15} step={0.0025} value={bondRate}
                                onChange={e => { setBondRate(Number(e.target.value)); setActiveScenario(null) }}/>
                            <p className="input-hint">Current prime: 10.25%. Most bonds price at prime + 0.5-1%.</p>
                        </div>

                        <div className="input-field">
                            <label>Bond term: {bondTerm} years</label>
                            <input type="range" min={10} max={30} step={5} value={bondTerm}
                                onChange={e => setBondTerm(Number(e.target.value))}/>
                        </div>

                        <div className="input-field">
                            <label>Property growth: {(propertyGrowth * 100).toFixed(0)}% p.a.</label>
                            <input type="range" min={0.02} max={0.10} step={0.01} value={propertyGrowth}
                                onChange={e => { setPropertyGrowth(Number(e.target.value)); setActiveScenario(null) }}/>
                            <p className="input-hint">JHB average: 3-6% p.a. Well-located suburbs: up to 8%.</p>
                        </div>

                        {/* Monthly repayment callout */}
                        <div className="pvr-repayment">
                            <span>Monthly bond repayment</span>
                            <strong>{fmtZAR(monthlyBond)}</strong>
                        </div>
                    </div>

                    {/* Renting inputs */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="studio" size={13}/> Renting</p>

                        <div className="input-field">
                            <label>Monthly rent</label>
                            <FormattedNumberInput
                                value={monthlyRent}
                                onChange={v => setMonthlyRent(v)}
                            />
                            <p className="input-hint">Sandton 1-bed: R15 000-R25 000/month</p>
                        </div>

                        <div className="input-field">
                            <label>Annual rent increase: {(rentIncreaseRate * 100).toFixed(0)}%</label>
                            <input type="range" min={0.03} max={0.12} step={0.01} value={rentIncreaseRate}
                                onChange={e => setRentIncreaseRate(Number(e.target.value))}/>
                            <p className="input-hint">SA average is 6-8% p.a. Bond repayments are fixed.</p>
                        </div>

                        <div className="input-field">
                            <label>Investment return: {(investmentReturn * 100).toFixed(0)}% p.a.</label>
                            <input type="range" min={0.04} max={0.15} step={0.01} value={investmentReturn}
                                onChange={e => { setInvestmentReturn(Number(e.target.value)); setActiveScenario(null) }}/>
                            <p className="input-hint">JSE average: 8-11% · Money market: 4-6%</p>
                        </div>
                    </div>

                    {/* Timeframe */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="target" size={13}/> Timeframe</p>
                        <div className="input-field">
                            <label>Simulation: {years} years</label>
                            <input type="range" min={1} max={20} step={1} value={years}
                                onChange={e => setYears(Number(e.target.value))}/>
                        </div>
                    </div>

                    {/* Profile affordability (only if profile data exists) */}
                    {hasProfile && (
                        <div className={`pvr-afford ${canAffordBond ? 'pvr-afford--ok' : 'pvr-afford--warn'}`}>
                            <div className="pvr-afford-header">
                                <Icon name={canAffordBond ? 'ok' : 'warn'} size={13}/>
                                <strong>{canAffordBond ? 'You can afford this bond' : 'Bond exceeds your surplus'}</strong>
                            </div>
                            <p>Your surplus: <strong>{fmtZAR(surplus)}/month</strong> vs bond: <strong>{fmtZAR(monthlyBond)}/month</strong></p>
                            {bankBalance > 0 && (
                                <p>Your savings cover <strong>{depositVsSavings}%</strong> of the {depositPct}% deposit ({fmtZAR(deposit)})</p>
                            )}
                        </div>
                    )}
                </aside>

                {/* RIGHT: Results */}
                <div className="split-right">

                    {/* Verdict */}
                    <div className={`pvr-verdict ${buyWins ? 'pvr-verdict--buy' : 'pvr-verdict--rent'}`}>
                        <div className="pvr-verdict-left">
                            <p className="pvr-verdict-tag">{years}-year verdict</p>
                            <h2 className="pvr-verdict-title">
                                {buyWins ? 'Buying wins' : 'Renting + investing wins'}
                            </h2>
                            <p className="pvr-verdict-margin">ahead by <strong>{fmtZAR(difference)}</strong> after {years} years</p>
                        </div>
                        <div className="pvr-verdict-right">
                            {crossoverYear ? (
                                <>
                                    <p className="pvr-verdict-cross-label">Lead changes in</p>
                                    <p className="pvr-verdict-cross-year">Year {crossoverYear}</p>
                                </>
                            ) : (
                                <>
                                    <p className="pvr-verdict-cross-label">No crossover</p>
                                    <p className="pvr-verdict-cross-year">{buyWins ? 'Buy' : 'Rent'} leads throughout</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Stat cards */}
                    <div className="pvr-stats">
                        <StatCard
                            label="Property value"
                            value={fmtZAR(finalYear?.propertyValue ?? 0)}
                            sub={`at Year ${years} · ${(propertyGrowth * 100).toFixed(0)}% p.a. growth`}
                        />
                        <StatCard
                            label="Buyer equity"
                            value={fmtZAR(finalYear?.buyNetWorth ?? 0)}
                            sub={`bond balance: ${fmtZAR(finalYear?.bondBalance ?? 0)}`}
                            highlight={buyWins}
                        />
                        <StatCard
                            label="Renter portfolio"
                            value={fmtZAR(finalYear?.rentNetWorth ?? 0)}
                            sub={`investing ${monthlyDiff > 0 ? fmtZAR(monthlyDiff) : 'R0'}/month cost difference`}
                            highlight={!buyWins}
                        />
                        <StatCard
                            label="Monthly gap"
                            value={monthlyDiff > 0 ? `+${fmtZAR(monthlyDiff)}` : `-${fmtZAR(Math.abs(monthlyDiff))}`}
                            sub={monthlyDiff > 0 ? 'bond costs more → renter invests this' : 'rent costs more → buyer saves here'}
                        />
                    </div>

                    {/* Chart */}
                    <div className="result-card">
                        <h3>Net worth over {years} years</h3>
                        <div className="pvr-chart-legend">
                            <span><span className="pvr-legend-dot" style={{ background: 'var(--absa-red)' }}/>Buy path</span>
                            <span><span className="pvr-legend-dot pvr-legend-dot--dashed" style={{ background: '#6366f1' }}/>Rent + invest</span>
                        </div>
                        <NetWorthChart snapshots={snapshots} crossoverYear={crossoverYear}/>
                    </div>

                    {/* Coaching callouts */}
                    <div className="pvr-coaching">

                        <CoachCallout
                            title={<><Lightbulb size={13} strokeWidth={1.75}/> The Year 1 reality - what your bond payment actually buys</>}
                            type="warn"
                        >
                            <InterestBar interestPct={yearOneInterestPct}/>
                            <p>
                                In Year 1, <strong>{yearOneInterestPct}% of your {fmtZAR(monthlyBond)} bond payment goes to the bank as interest</strong> - only {100 - yearOneInterestPct}% reduces what you owe.
                                It takes 7-10 years before you meaningfully chip away at the principal.
                                Over the full {bondTerm}-year term, you will pay <strong>{fmtZAR(totalInterestPaid)} in interest</strong> on top of the purchase price.
                            </p>
                        </CoachCallout>

                        <CoachCallout
                            title={monthlyDiff > 0
                                ? <><Lightbulb size={13} strokeWidth={1.75}/> The renter's edge - {fmtZAR(monthlyDiff)}/month invested</>
                                : <><Lightbulb size={13} strokeWidth={1.75}/> The buyer's edge - bond costs less than rent here</>}
                            type="info"
                        >
                            {monthlyDiff > 0 ? (
                                <p>
                                    Your bond ({fmtZAR(monthlyBond)}) costs <strong>{fmtZAR(monthlyDiff)}/month more than rent</strong> ({fmtZAR(monthlyRent)}).
                                    This model assumes the renter invests that difference every month at {(investmentReturn * 100).toFixed(0)}% p.a.
                                    If the renter spends it instead, <strong>buying wins by default</strong> - regardless of what the chart shows.
                                    The renting path only works if the discipline is there.
                                </p>
                            ) : (
                                <p>
                                    Rent ({fmtZAR(monthlyRent)}) costs <strong>{fmtZAR(Math.abs(monthlyDiff))}/month more than the bond</strong> ({fmtZAR(monthlyBond)}).
                                    The renter has no cost surplus to invest here - which is why buying tends to win in this scenario.
                                    The buyer is simultaneously building equity <em>and</em> paying less per month.
                                </p>
                            )}
                        </CoachCallout>

                        <CoachCallout
                            title={crossoverYear
                                ? <><Lightbulb size={13} strokeWidth={1.75}/> The crossover - the lead changes in Year {crossoverYear}</>
                                : <><Lightbulb size={13} strokeWidth={1.75}/> No crossover - {buyWins ? 'buying' : 'renting'} leads from start to finish</>}
                            type="nudge"
                        >
                            {crossoverYear ? (
                                <p>
                                    Before Year {crossoverYear}, {snapshots[0].buyNetWorth > snapshots[0].rentNetWorth ? 'buying' : 'renting'} is ahead.
                                    In Year {crossoverYear} the paths cross and <strong>{buyWins ? 'buying' : 'renting'} takes the lead for good</strong> (within this {years}-year window).
                                    Extend the simulation to see if the outcome changes over a longer horizon - time is the most powerful input in this model.
                                </p>
                            ) : (
                                <p>
                                    With these inputs, <strong>{buyWins ? 'buying leads throughout the entire {years}-year period' : 'renting leads throughout the entire {years}-year period'}</strong>.
                                    Try changing the property growth rate, investment return, or timeframe to see where the crossover appears.
                                    Most scenarios do cross over - the question is when.
                                </p>
                            )}
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
                                                <th>Property value</th>
                                                <th>Bond balance</th>
                                                <th>Buy equity</th>
                                                <th>Rent portfolio</th>
                                                <th>Ahead</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {snapshots.map(s => {
                                                const yearBuyWins = s.buyNetWorth > s.rentNetWorth
                                                return (
                                                    <tr key={s.year}>
                                                        <td>Year {s.year}</td>
                                                        <td>{fmtZAR(s.propertyValue)}</td>
                                                        <td>{fmtZAR(s.bondBalance)}</td>
                                                        <td className={yearBuyWins ? 'cell--win' : ''}>{fmtZAR(s.buyNetWorth)}</td>
                                                        <td className={!yearBuyWins ? 'cell--win' : ''}>{fmtZAR(s.rentNetWorth)}</td>
                                                        <td>{yearBuyWins ? 'Buy' : 'Rent'}</td>
                                                    </tr>
                                                )
                                            })}
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
                            {learnOpen ? 'Hide' : 'Understand'} the concepts behind this simulation
                        </button>
                        {learnOpen && (
                            <div className="learn-grid">
                                <LearnCard term="Bond amortisation" explanation="In a 20-year bond, most of your early payments go to interest - not equity. The bank charges interest on the full outstanding balance, which only shrinks slowly. By Year 10, the split starts to improve meaningfully."/>
                                <LearnCard term="Opportunity cost" explanation="Your deposit is capital locked in property. That same money invested in the JSE at 11% p.a. grows significantly. The question is not just 'does property grow?' but 'does it grow faster than the alternative?'"/>
                                <LearnCard term="Compounding" explanation="The renter's portfolio earns returns on returns. R1 000/month invested at 9% p.a. becomes R75 000 after 5 years - not R60 000. That extra R15 000 is compounding at work."/>
                                <LearnCard term="Rent inflation" explanation="Rent increases 6-8% per year in SA. R15 000/month becomes R22 000 after 6 years. Your bond repayment is fixed - which is why buying gets relatively cheaper over time."/>
                                <LearnCard term="The crossover point" explanation="The year where buying's net worth overtakes renting's (or vice versa). This is the most important number in the simulation - it tells you how long you need to hold the property for buying to pay off."/>
                                <LearnCard term="Total interest paid" explanation="On a R1.35M bond at 10.75% over 20 years, you pay approximately R2.1M in total - R1.35M principal + R750K interest. That's the true cost of property ownership that no estate agent mentions."/>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </>
    )
}
