import { useState, useMemo } from 'react'
import { useUserProfile } from '../context/UserProfileContext'
import { fmtZAR, SA } from '../components/financialCalcs'
import "../styles/TracksStudioShared.css";
 
function calcBondRepayment(principal, annualRate, termYears) {
    const r = annualRate / 12
    const n = termYears * 12
    if (r === 0) return principal / n
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

//Main section of simulation
//Returns array of yearly snapshots for both paths to compare
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

    //Starting positions
    let propertyValue   = propertyPrice
    let bondBalance     = bondPrincipal
    let rentPortfolio   = 0          
    let currentRent     = monthlyRent
    let buyerEquity     = deposit

    const snapshots = []

    for (let year = 1; year <= years; year++) {
        //BUY PATH (Show 12 months )
        for (let month = 0; month < 12; month++) {
            const interestThisMonth = bondBalance * monthlyBondRate
            const principalThisMonth = monthlyBond - interestThisMonth
            bondBalance = Math.max(0, bondBalance - principalThisMonth)
        }
        //Property growing to see if it's worth it
        propertyValue = propertyValue * (1 + SA.PROPERTY_GROWTH)
        const buyNetWorth = propertyValue - bondBalance

        //RENT PATH (simulate 12 months as well to compare)
        //The renter can invest the difference between bond payment and rent
        const monthlyDifference = monthlyBond - currentRent
        const monthlyReturn     = investmentReturn / 12

        for (let month = 0; month < 12; month++) { 
            rentPortfolio = rentPortfolio * (1 + monthlyReturn)
            //If bond > rent, renter invests the difference
            if (monthlyDifference > 0) {
                rentPortfolio += monthlyDifference
            }
            //If rent > bond, renter is paying more, no investment possible from difference
        }
        //Rent increases annually so keep that in mind
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

//SVG line chart
function LineChart({ snapshots }) {
    if (!snapshots.length) return null

    const width  = 500
    const height = 260
    const padL   = 70
    const padB   = 40
    const padT   = 20
    const padR   = 20
    const chartW = width - padL - padR
    const chartH = height - padT - padB

    const allValues = snapshots.flatMap(s => [s.buyNetWorth, s.rentNetWorth])
    const minVal    = Math.min(0, ...allValues)
    const maxVal    = Math.max(...allValues)
    const range     = maxVal - minVal || 1

    function xPos(year) {
        return padL + ((year - 1) / (snapshots.length - 1)) * chartW
    }
    function yPos(val) {
        return padT + chartH - ((val - minVal) / range) * chartH
    }

    const buyPoints  = snapshots.map(s => `${xPos(s.year)},${yPos(s.buyNetWorth)}`).join(' ')
    const rentPoints = snapshots.map(s => `${xPos(s.year)},${yPos(s.rentNetWorth)}`).join(' ')

    //Y-axis labels, 5 evenly spaced
    const yLabels = Array.from({ length: 5 }, (_, i) => {
        const val = minVal + (range * i) / 4
        return { val, y: yPos(val) }
    })

    return (
        <div className="chart-wrap">
            <svg viewBox={`0 0 ${width} ${height}`} className="line-chart">

                {/*Grid lines*/}
                {yLabels.map((l, i) => (
                    <g key={i}>
                        <line
                            x1={padL} y1={l.y}
                            x2={width - padR} y2={l.y}
                            stroke="#e5e7eb" strokeWidth="1"
                        />
                        <text
                            x={padL - 6} y={l.y}
                            textAnchor="end"
                            fontSize="9"
                            fill="#9ca3af"
                            dominantBaseline="middle"
                        >
                            {l.val >= 1000000
                                ? `R${(l.val / 1000000).toFixed(1)}M`
                                : `R${(l.val / 1000).toFixed(0)}K`
                            }
                        </text>
                    </g>
                ))}

                {/*X-axis labels*/}
                {snapshots.map(s => (
                    <text
                        key={s.year}
                        x={xPos(s.year)} y={height - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#9ca3af"
                    >
                        Yr {s.year}
                    </text>
                ))}

                {/*Zero line if chart goes negative*/}
                {minVal < 0 && (
                    <line
                        x1={padL} y1={yPos(0)}
                        x2={width - padR} y2={yPos(0)}
                        stroke="#6b7280" strokeWidth="1"
                        strokeDasharray="4 2"
                    />
                )}

                {/*Buy line*/}
                <polyline
                    points={buyPoints}
                    fill="none"
                    stroke="#e8002d"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                />

                {/*Rent/invest line*/}
                <polyline
                    points={rentPoints}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeDasharray="6 3"
                />

                {/*Dots on buy line*/}
                {snapshots.map(s => (
                    <circle
                        key={s.year}
                        cx={xPos(s.year)} cy={yPos(s.buyNetWorth)}
                        r="4" fill="#e8002d"
                    />
                ))}

                {/*Dots on rent line*/}
                {snapshots.map(s => (
                    <circle
                        key={s.year}
                        cx={xPos(s.year)} cy={yPos(s.rentNetWorth)}
                        r="4" fill="#6366f1"
                    />
                ))}
            </svg>

            {/*Legend*/}
            <div className="chart-legend">
                <div className="legend-item">
                    <span className="legend-dot" style={{ background: '#e8002d' }} />
                    Buy path (property equity)
                </div>
                <div className="legend-item">
                    <span className="legend-dot legend-dot--dashed" style={{ background: '#6366f1' }} />
                    Rent + invest difference
                </div>
            </div>
        </div>
    )
}

//Main section 
export default function PropertyVsRent() {
    const { profile } = useUserProfile()
    const [learnOpen, setLearnOpen] = useState(false)

    //Inputs
    const [propertyPrice,    setPropertyPrice]    = useState(1500000)
    const [depositPct,       setDepositPct]       = useState(10)
    const [bondRate,         setBondRate]         = useState(SA.PRIME_RATE + SA.BOND_SPREAD)
    const [bondTerm,         setBondTerm]         = useState(20)
    const [monthlyRent,      setMonthlyRent]      = useState(15000)
    const [rentIncreaseRate, setRentIncreaseRate] = useState(0.06)   // 6% p.a.
    const [investmentReturn, setInvestmentReturn] = useState(0.08)   // 8% p.a.
    const [years,            setYears]            = useState(5)

    //Run simulation
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

    //Verdict, what should the user do
    const finalYear     = snapshots[snapshots.length - 1]
    const buyWins       = finalYear?.buyNetWorth > finalYear?.rentNetWorth
    const difference    = Math.abs((finalYear?.buyNetWorth ?? 0) - (finalYear?.rentNetWorth ?? 0))
    const monthlyDiff   = monthlyBond - monthlyRent

    //Narrative summary for my essay readers - check font size
    function buildNarrative() {
        const winner = buyWins ? 'buying' : 'renting and investing the difference'
        const loser  = buyWins ? 'renting' : 'buying'

        let narrative = `Over ${years} years, ${winner} comes out ahead by ${fmtZAR(difference)}. `

        if (buyWins) {
            narrative += `The property grows from ${fmtZAR(propertyPrice)} to ${fmtZAR(finalYear.propertyValue)} at 6% p.a. `
            narrative += `After paying down the bond, your equity reaches ${fmtZAR(finalYear.buyNetWorth)}. `
            narrative += `The renter's investment portfolio only reaches ${fmtZAR(finalYear.rentNetWorth)} `
            narrative += monthlyDiff > 0
                ? `because the bond payment of ${fmtZAR(monthlyBond)} is higher than rent of ${fmtZAR(monthlyRent)}, leaving only ${fmtZAR(monthlyDiff)} to invest each month.`
                : `even though rent exceeds the bond, because the property equity compounds faster here.`
        } else {
            narrative += `The renter invests ${fmtZAR(Math.abs(monthlyDiff > 0 ? monthlyDiff : 0))}/month `
            narrative += `— the difference between the bond payment and rent — into a portfolio returning ${(investmentReturn * 100).toFixed(0)}% p.a. `
            narrative += `This compounds to ${fmtZAR(finalYear.rentNetWorth)}, outpacing the buyer's equity of ${fmtZAR(finalYear.buyNetWorth)}. `
            narrative += `This is the power of compounding: small consistent investments snowball significantly over time.`
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
            </div>
    
            {/*Context banner*/}
            <div style={{ padding: '0 1.5rem', flexShrink: 0 }}>
                <div className="studio-context">
                    <p>
                        <strong>SA context:</strong> Prime rate is currently 10.25%.
                        Johannesburg property grows at approximately 3–6% p.a.
                        The JSE has returned approximately 8–11% p.a. historically.
                        This simulation uses your numbers — not generic assumptions.
                    </p>
                </div>
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
                                value={propertyPrice}
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
                                value={monthlyRent}
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

                    {/*Verdict badge*/}
                    <div className={`verdict-badge ${buyWins ? 'verdict-badge--buy' : 'verdict-badge--rent'}`}>
                        <span className="verdict-icon">{buyWins ? '🏠' : '📈'}</span>
                        <div>
                            <strong>
                                {buyWins ? 'Buying wins' : 'Rent & Invest wins'} by {fmtZAR(difference)}
                            </strong>
                            <p>over {years} years based on your inputs</p>
                        </div>
                    </div>

                    {/*Line chart*/}
                    <div className="result-card">
                        <h3>Net Worth Over Time</h3>
                        <LineChart snapshots={snapshots} />
                    </div>

                    {/*Narrative*/}
                    <div className="result-card narrative-card">
                        <h3>Studio Verdict</h3>
                        <p className="narrative-text">{buildNarrative()}</p>
                    </div>

                    {/*Year-by-year table - play with bento bpx structure*/}
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
                                                <td className={yearBuyWins ? 'cell--win' : ''}>
                                                    {fmtZAR(s.buyNetWorth)}
                                                </td>
                                                <td className={!yearBuyWins ? 'cell--win' : ''}>
                                                    {fmtZAR(s.rentNetWorth)}
                                                </td>
                                                <td>
                                                    {yearBuyWins ? '🏠 Buy' : '📈 Rent'}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>                 


            {/*Learn section*/}
            <div className="learn-section">
                <button
                    className="learn-toggle"
                    onClick={() => setLearnOpen(prev => !prev)}
                >
                    📚 {learnOpen ? 'Hide' : 'Show'} concepts behind this simulation
                </button>

                {learnOpen && (
                    <div className="learn-grid">
                        <LearnCard
                            term="Equity"
                            explanation="The portion of the property you actually own — property value minus what you still owe the bank. When you first buy, equity equals only your deposit. Over time, as you pay down the bond and the property grows in value, your equity builds. Equity is illiquid — you cannot spend it without selling or refinancing."
                        />
                        <LearnCard
                            term="Opportunity Cost"
                            explanation="The return you give up by choosing one option over another. When you buy, you lock your deposit into an illiquid asset. That deposit could instead have been invested in the JSE, earning 8–11% p.a. This simulation makes that trade-off visible."
                        />
                        <LearnCard
                            term="Compounding"
                            explanation="Earning returns on your returns. If you invest R1 000 at 10% p.a., after year 1 you have R1 100. In year 2, you earn 10% on R1 100 — not R1 000. Over 5–10 years, this snowball effect becomes significant. The renter's investment portfolio in this simulation compounds monthly."
                        />
                        <LearnCard
                            term="Property Growth Rate"
                            explanation="Johannesburg property has grown at approximately 3–6% p.a. over the last decade, depending on suburb. This simulation uses 6% as a reasonable assumption for well-located properties. Poorly located or oversupplied areas may grow at 2–3% or even decline."
                        />
                        <LearnCard
                            term="Bond Amortisation"
                            explanation="In the early years of a bond, most of your monthly payment goes toward interest — not paying off the principal. This is why buying and selling quickly is expensive. It takes roughly 7–10 years before the balance shifts and you are meaningfully paying down the loan."
                        />
                        <LearnCard
                            term="Rent Inflation"
                            explanation="Rent typically increases 6–8% per year in SA, in line with or above general inflation. This erodes the renter's cost advantage over time — what starts as R15 000/month becomes R21 000/month after 6 years at 6% annual increases. Owners with a fixed bond payment are protected from this."
                        />
                    </div>
                )}
            </div>
            

            </div>
        </>
    )
}

function LearnCard({ term, explanation }) {
    const [open, setOpen] = useState(false)
    return (
        <div className="learn-card">
            <button onClick={() => setOpen(prev => !prev)}>
                <span>{term}</span>
                <span>{open ? '▲' : '▼'}</span>
            </button>
            {open && <p>{explanation}</p>}
        </div>
    )
}