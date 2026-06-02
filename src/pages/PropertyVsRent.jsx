import { useState, useMemo } from 'react'
import { useUserProfile } from '../context/UserProfileContext'
import { fmtZAR, SA, calcBondRepayment } from '../components/financialCalcs'
import "../styles/TracksStudioShared.css";
import Icon from "../components/Icons";
import LearnCard from "../components/LearnCard";
import {
    LineChart, Line, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
 

//Main section of simulation
//Returns the array things of yearly snapshots for both paths to compare
function runSimulation({
    propertyPrice,
    depositPct,
    bondRate,
    bondTerm,
    monthlyRent,
    rentIncreaseRate,
    investmentReturn,
    years,
}) {
    const deposit       = propertyPrice * (depositPct / 100)
    const bondPrincipal = propertyPrice - deposit
    const monthlyBond   = calcBondRepayment(bondPrincipal, bondRate, bondTerm)
    const monthlyBondRate = bondRate / 12

    let propertyValue   = propertyPrice
    let bondBalance     = bondPrincipal
    let rentPortfolio   = 0          
    let currentRent     = monthlyRent
    let buyerEquity     = deposit

    const snapshots = []

    for (let year = 1; year <= years; year++) {
        for (let month = 0; month < 12; month++) {
            const interestThisMonth = bondBalance * monthlyBondRate
            const principalThisMonth = monthlyBond - interestThisMonth
            bondBalance = Math.max(0, bondBalance - principalThisMonth)
        }

        propertyValue = propertyValue * (1 + SA.PROPERTY_GROWTH)
        const buyNetWorth = propertyValue - bondBalance

        const monthlyDifference = monthlyBond - currentRent
        const monthlyReturn = investmentReturn / 12

        for (let month = 0; month < 12; month++) { 
            rentPortfolio = rentPortfolio * (1 + monthlyReturn)
            if (monthlyDifference > 0) {
                rentPortfolio += monthlyDifference
            }
        }

        currentRent = currentRent * (1 + rentIncreaseRate)

        const rentNetWorth = rentPortfolio

        snapshots.push({
            year,
            buyNetWorth:    Math.round(buyNetWorth),
            rentNetWorth:   Math.round(rentNetWorth),
            propertyValue:  Math.round(propertyValue),
            bondBalance:    Math.round(bondBalance),
            portfolio:      Math.round(rentPortfolio),
            monthlyBond:    Math.round(monthlyBond),
            currentRent:    Math.round(currentRent),
        })
    }

    return { snapshots, monthlyBond: Math.round(monthlyBond), deposit }
}

/* Renamed from LineChart to NetWorthChart to avoid clashing with
   the LineChart component imported from recharts above. */
function NetWorthChart({ snapshots }) {
    if (!snapshots.length) return null

    /* Shape the data the way Recharts expects: an array of objects */
    const data = snapshots.map(s => ({
        name:     `Yr ${s.year}`,
        'Buy path': Math.round(s.buyNetWorth),
        'Rent + invest': Math.round(s.rentNetWorth),
    }))

    /* Format large rand values on the Y axis */
    function formatY(val) {
        if (Math.abs(val) >= 1000000) return `R${(val / 1000000).toFixed(1)}M`
        if (Math.abs(val) >= 1000)    return `R${(val / 1000).toFixed(0)}K`
        return `R${val}`
    }

    /* Custom tooltip - explains the flat line when rent > bond repayment.
       This directly fixes the feedback issue about the confusing chart. */
    function CustomTooltip({ active, payload, label }) {
        if (!active || !payload?.length) return null
        const rentVal = payload.find(p => p.dataKey === 'Rent + invest')?.value ?? 0
        return (
            <div className="chart-tooltip">
                <p className="chart-tooltip-title">{label}</p>
                {payload.map((p, i) => (
                    <div key={i} className="chart-tooltip-row">
                        <span style={{ color: p.color }}>{p.name}</span>
                        <strong>R {Math.abs(p.value).toLocaleString('en-ZA')}</strong>
                    </div>
                ))}
                {/* Contextual note when the rent+invest line reads zero */}
                {rentVal === 0 && (
                    <p className="chart-tooltip-note">
                        Rent currently costs more than the bond repayment,
                        so there is no surplus to invest. The line shows R0.
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--n-200)"/>
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: 'var(--n-400)' }}
                    />
                    <YAxis
                        tickFormatter={formatY}
                        tick={{ fontSize: 11, fill: 'var(--n-400)' }}
                        width={68}
                    />
                    <Tooltip content={<CustomTooltip/>}/>
                    <Legend
                        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                    />
                    <Line
                        type="monotone"
                        dataKey="Buy path"
                        stroke="var(--absa-red)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: 'var(--absa-red)' }}
                        activeDot={{ r: 5 }}
                    />
                    <Line
                        type="monotone"
                        dataKey="Rent + invest"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        strokeDasharray="6 3"
                        dot={{ r: 3, fill: '#6366f1' }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}

export default function PropertyVsRent() {
    const { profile } = useUserProfile()
    const [learnOpen, setLearnOpen] = useState(false)

    const [propertyPrice,    setPropertyPrice]    = useState(1500000)
    const [depositPct,       setDepositPct]       = useState(10)
    const [bondRate,         setBondRate]         = useState(SA.PRIME_RATE + SA.BOND_SPREAD)
    const [bondTerm,         setBondTerm]         = useState(20)
    const [monthlyRent,      setMonthlyRent]      = useState(20000)
    const [rentIncreaseRate, setRentIncreaseRate] = useState(0.06)   // 6% p.a.
    const [investmentReturn, setInvestmentReturn] = useState(0.08)   // 8% p.a.
    const [years,            setYears]            = useState(5)

    //Run section
    const { snapshots, monthlyBond, deposit } = useMemo(() => runSimulation({
        propertyPrice,
        depositPct,
        bondRate,
        bondTerm,
        monthlyRent,
        rentIncreaseRate,
        investmentReturn,
        years,
    }), [propertyPrice, depositPct, bondRate, bondTerm,
         monthlyRent, rentIncreaseRate, investmentReturn, years])

    const finalYear     = snapshots[snapshots.length - 1]
    const buyWins       = finalYear?.buyNetWorth > finalYear?.rentNetWorth
    const difference    = Math.abs((finalYear?.buyNetWorth ?? 0) - (finalYear?.rentNetWorth ?? 0))
    const monthlyDiff   = monthlyBond - monthlyRent

    //Narrative summary for my essay readers - check font size
    function buildNarrative() {
        const winner = buyWins ? 'buying' : 'renting and investing the difference'

        let narrative = `Over ${years} years, ${winner} comes out ahead by ${fmtZAR(difference)}. `

        if (buyWins) {
        narrative += `The property grows from ${fmtZAR(propertyPrice)} to ${fmtZAR(finalYear.propertyValue)} at 6% p.a. `
        narrative += `After paying down the bond, your equity reaches ${fmtZAR(finalYear.buyNetWorth)}. `

        if (monthlyDiff > 0) {
            narrative += `The renter's portfolio reaches only ${fmtZAR(finalYear.rentNetWorth)} because the bond repayment of ${fmtZAR(monthlyBond)} is ${fmtZAR(monthlyDiff)}/month higher than rent - leaving little to invest each month.`
        } else {
            narrative += `Even though rent of ${fmtZAR(monthlyRent)} exceeds the bond repayment of ${fmtZAR(monthlyBond)}, the renter has no surplus from the cost difference to invest, so the buyer's property equity compounds ahead.`
        }
    } else {
        if (monthlyDiff > 0) {
            narrative += `The bond repayment of ${fmtZAR(monthlyBond)} costs ${fmtZAR(monthlyDiff)}/month more than rent. The renter invests that difference into a portfolio returning ${(investmentReturn * 100).toFixed(0)}% p.a., which compounds to ${fmtZAR(finalYear.rentNetWorth)} - outpacing the buyer's equity of ${fmtZAR(finalYear.buyNetWorth)}.`
        } else {
            narrative += `Rent of ${fmtZAR(monthlyRent)} costs more than the bond repayment of ${fmtZAR(monthlyBond)}, so the renter has no cost advantage to invest. In this scenario buying is the stronger wealth-building path since the buyer gains equity while the renter pays more each month with nothing to show for it.`
        }
        narrative += ` This is the power of compounding: consistent monthly investments snowball significantly over time.`
    }

        return narrative
    }

    return (
        <>
            <div className="page-header">

                    <div>
                        <h1 className='page-title'>Property vs Renting in Johannesburg</h1>
                        <p className='page-subtitle'>
                            Should you buy a property or rent and invest the difference?
                            Adjust the inputs and watch the 5-year net worth comparison update instantly.
                        </p>
                    </div>
                    
                    <button className="reset-btn" onClick={() => {
                        setPropertyPrice(1500000)
                        setDepositPct(10)
                        setBondRate(SA.PRIME_RATE + SA.BOND_SPREAD)
                        setBondTerm(20)
                        setMonthlyRent(20000)
                        setRentIncreaseRate(0.06)
                        setInvestmentReturn(0.08)
                        setYears(5)
                    }}>
                        Reset inputs
                    </button>
            </div>
    
            

            <div className="split-body">

                <aside className="split-left">

                    <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--white)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.4rem' }}> 
                    {/* <h2>Buying scenario</h2> */} Buying Scenario
                    </h2>

                    <div className="input-field">
                        <label>Property price</label>
                        <div className="input-prefix-wrap">
                            <span className="input-prefix">R</span>
                            <input
                                type="number"
                                value={propertyPrice === 0 ? '' : propertyPrice}
                                placeholder="0"
                                min={300000}
                                step={50000}
                                onChange={e => setPropertyPrice(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div className="input-field">
                        <label>Deposit: {depositPct}%  ({fmtZAR(deposit)})</label>
                        <input
                            type="range"
                            min={5} max={40} step={1}
                            value={depositPct}
                            onChange={e => setDepositPct(Number(e.target.value))}
                        />
                    </div>

                    <div className="input-field">
                        <label>Bond interest rate: {(bondRate * 100).toFixed(2)}%</label>
                        <input
                            type="range"
                            min={0.08} max={0.15} step={0.0025}
                            value={bondRate}
                            onChange={e => setBondRate(Number(e.target.value))}
                        />
                        <span className="input-hint">Prime (10.25%) + spread</span>
                    </div>

                    <div className="input-field">
                        <label>Bond term: {bondTerm} years</label>
                        <input
                            type="range"
                            min={10} max={30} step={5}
                            value={bondTerm}
                            onChange={e => setBondTerm(Number(e.target.value))}
                        />
                    </div>

                    <div className="input-field">
                        <label>Monthly bond repayment</label>
                        <div className="calc-result">{fmtZAR(monthlyBond)}/month</div>
                    </div>

                    <h2 style={{ marginTop: '1.5rem' }}>Renting scenario</h2>

                    <div className="input-field">
                        <label>Monthly rent</label>
                        <div className="input-prefix-wrap">
                            <span className="input-prefix">R</span>
                            <input
                                type="number"
                                value={monthlyRent === 0 ? '' : monthlyRent}
                                placeholder="0"
                                min={1000}
                                step={500}
                                onChange={e => setMonthlyRent(Number(e.target.value))}
                            />
                        </div>
                        <span className="input-hint">
                            Sandton 1-bed: R15 000–R25 000/month
                        </span>
                    </div>

                    <div className="input-field">
                        <label>Annual rent increase: {(rentIncreaseRate * 100).toFixed(0)}%</label>
                        <input
                            type="range"
                            min={0.03} max={0.12} step={0.01}
                            value={rentIncreaseRate}
                            onChange={e => setRentIncreaseRate(Number(e.target.value))}
                        />
                        <span className="input-hint">SA average is 6–8% p.a.</span>
                    </div>

                    <div className="input-field">
                        <label>
                            Investment return: {(investmentReturn * 100).toFixed(0)}% p.a.
                        </label>
                        <input
                            type="range"
                            min={0.04} max={0.15} step={0.01}
                            value={investmentReturn}
                            onChange={e => setInvestmentReturn(Number(e.target.value))}
                        />
                        <span className="input-hint">
                            JSE average: 8–11% · Money market: 4–6%
                        </span>
                    </div>

                    <h2 style={{ marginTop: '1.5rem' }}>Timeframe</h2>

                    <div className="input-field">
                        <label>Simulation period: {years} years</label>
                        <input
                            type="range"
                            min={1} max={10} step={1}
                            value={years}
                            onChange={e => setYears(Number(e.target.value))}
                        />
                    </div>

                    <div className={`monthly-diff-box ${monthlyDiff > 0 ? 'monthly-diff-box--buy-higher' : 'monthly-diff-box--rent-higher'}`}>
                        {monthlyDiff > 0 ? (
                            <>
                                <strong>Bond costs {fmtZAR(monthlyDiff)}/month more than rent.</strong>
                                <p>The renter invests this difference each month into their portfolio.</p>
                            </>
                        ) : (
                            <>
                                <strong>Rent costs {fmtZAR(Math.abs(monthlyDiff))}/month more than the bond.</strong>
                                <p>The buyer has the monthly cost advantage here.</p>
                            </>
                        )}
                    </div>
                </aside>

                <div className="split-right">

                    {/* Row 1: Chart (left half) + Verdict & SA context (right half) */}
    <div className="studio-top-row">
        <div className="result-card studio-chart-card">
            <h3>Net Worth Over Time</h3>
            <NetWorthChart snapshots={snapshots} />
        </div>

        <div className="studio-side-col">
            {/* Verdict badge*/}
            <div className={`verdict-badge ${buyWins ? 'verdict-badge--buy' : 'verdict-badge--rent'}`}>
                <span className="verdict-icon">{buyWins ? <Icon name="buy-wins"  size={32} glow /> : <Icon name="rent-wins" size={32} glow />}</span>
                <div>
                    <strong>{buyWins ? 'Buying wins' : 'Rent & Invest wins'} by {fmtZAR(difference)}</strong>
                    <p>over {years} years based on your inputs</p>
                </div>
            </div>

            <div className="studio-context">
                <p>
                    <strong>SA context:</strong> Prime rate is 10.25%.
                    Johannesburg property grows at approximately 3–6% p.a.
                    The JSE has returned approximately 8–11% p.a. historically.
                </p>
                <p style={{ marginTop: '0.4rem', color: 'rgba(255, 255, 255, 0.86)', fontSize: 'var(--text-xs)' }}>
                    This model assumes the renter invests only the monthly cost difference
                    between the bond repayment and rent. If rent exceeds the bond, the renter
                    has no monthly surplus from this difference to invest.
                </p>
            </div>

            {/* Monthly diff callout also works here */}
            <div className={`monthly-diff-box ${monthlyDiff > 0 ? 'monthly-diff-box--buy-higher' : 'monthly-diff-box--rent-higher'}`}>
                {monthlyDiff > 0 ? (
                    <>
                        <strong>Bond costs {fmtZAR(monthlyDiff)}/month more than rent.</strong>
                        <p>The renter invests this difference each month.</p>
                    </>
                ) : (
                    <>
                        <strong>Rent costs {fmtZAR(Math.abs(monthlyDiff))}/month more than the bond.</strong>
                        <p>The buyer has the monthly cost advantage.</p>
                    </>
                )}
            </div>
        </div>
    </div>

    {/* Narrative */}
    <div className="result-card">
        <h3>Studio Verdict</h3>
        <p className="narrative-text">{buildNarrative()}</p>
    </div>

    <div className="result-card">
        <h3>Year-by-Year Breakdown</h3>
        <div className="table-wrap">
            <table className="breakdown-table">
                <thead>
                    <tr>
                        <th>Year</th>
                        <th>Property value</th>
                        <th>Bond balance</th>
                        <th>Buy net worth</th>
                        <th>Rent portfolio</th>
                        <th>Winner</th>
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
                                <td>{yearBuyWins ? <><Icon name="buy-wins"  size={17} glow /> Buy</> : <><Icon name="rent-wins" size={17} glow /> Rent</>}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    </div>

    <div className="learn-section">
        <button className="learn-toggle" onClick={() => setLearnOpen(prev => !prev)}>
            <Icon name="learn" size={19} glow />
            {learnOpen ? 'Hide' : 'Show'} concepts behind this simulation
        </button>
        {learnOpen && (
            <div className="learn-grid">
                <LearnCard term="Equity" explanation="The portion of the property you own - property value minus what you owe. Equity is illiquid - you cannot spend it without selling or refinancing." />
                <LearnCard term="Opportunity Cost" explanation="The return you give up by choosing one option. Your deposit locked in property could instead earn 8–11% p.a. in the JSE." />
                <LearnCard term="Compounding" explanation="Earning returns on your returns. R1 000 at 10% p.a. becomes R1 100 after year 1. Year 2 earns 10% on R1 100. The renter's portfolio compounds monthly." />
                <LearnCard term="Property Growth Rate" explanation="Johannesburg property has grown approximately 3–6% p.a. over the last decade. This simulation uses 6% for well-located properties." />
                <LearnCard term="Bond Amortisation" explanation="In early years, most of your payment goes toward interest - not principal. It takes 7–10 years before you meaningfully pay down the loan." />
                <LearnCard term="Rent Inflation" explanation="Rent increases 6–8%/year in SA. R15 000/month becomes R21 000/month after 6 years. Bond payments are fixed - owners are protected from this." />
            </div>
        )}
    </div>

            </div>
            
            </div>
        </>
    )
}

