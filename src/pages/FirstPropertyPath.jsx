import { useState } from 'react'
import { useUserProfile } from '../context/UserProfileContext'
import {
    calcTakeHome,
    calcNetSurplus,
    calcDTI,
    calcEmergencyMonths,
    fmtZAR,
    SA,
} from '../components/financialCalcs'
import "../styles/TracksStudioShared.css";
import Icon from "../components/Icons";

function calcBondRepayment(principal, annualRate, termYears) {
    const r = annualRate / 12
    const n = termYears * 12
    if (r === 0) return principal / n
    return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
}

function buildMilestones(targetDeposit, bondPayment, takeHome, surplus) {
    const depositMonths = surplus > 0
        ? Math.ceil(targetDeposit / (surplus * 0.5))
        : null

    return [
        {
            year: 1,
            title: 'Build Your Emergency Fund',
            target: 'R90 000 – R180 000',
            description: 'Before saving for a deposit, you need 3-6 months of expenses as a cash buffer. This protects you from being forced into debt by unexpected costs.',
            actions: [
                'Open a separate high-interest savings account - not your cheque account.',
                'Set up an automatic debit order on payday. Treat it like a fixed expense.',
                'Target R90 000 minimum (3 months). R180 000 is ideal (6 months).',
                'Do not invest in volatile assets until this buffer exists.',
            ],
            nudge: 'Without an emergency fund, one job loss or car repair forces you into expensive debt - wiping months of progress.',
        },
        {
            year: 2,
            title: 'Clear High-Interest Debt & Start Deposit Fund',
            target: `Start building toward ${fmtZAR(targetDeposit)} deposit`,
            description: 'Eliminate any debt above 15% interest rate first. Then redirect those payments directly into your deposit fund.',
            actions: [
                'Pay off car finance or personal loans above 15% p.a. first (avalanche method).',
                'Once cleared, redirect the full payment amount into a notice deposit or money market account.',
                surplus > 0
                    ? `Save aggressively - 25% of take-home (${fmtZAR(takeHome * 0.25)}/month) toward deposit.`
                    : 'Your current surplus is too low to save aggressively. Reduce expenses first.',
                'Keep RA contributions active - the tax saving subsidises your savings rate.',
            ],
            nudge: 'A R500 000 car at 12% p.a. over 5 years costs R666 000 total and will disqualify you from a bond. Delay luxury purchases.',
        },
        {
            year: 3,
            title: 'Bond Pre-Approval & Credit Score',
            target: 'Pre-approval letter from at least 2 banks',
            description: 'Get your financial profile bond-ready. Banks assess your credit score, DTI, and employment history before approving a home loan.',
            actions: [
                'Check your credit score on Experian or TransUnion - target 650 or higher.',
                'Ensure your debt-to-income ratio is below 36% (SA banks require this).',
                'Keep 6 months of payslips and 3 months of bank statements ready.',
                'Use a bond originator (like ooba or BetterBond) - it is free and shops multiple banks at once.',
                'Do NOT apply for any new credit in the 6 months before your bond application.',
            ],
            nudge: 'Bond originators are free and often secure better rates than going to your bank directly. Use one.',
        },
        {
            year: 4,
            title: 'Make Your Offer & Transfer Ownership',
            target: `Budget for ${fmtZAR(bondPayment)}/month bond repayment + transfer costs`,
            description: 'Making an offer is just the start. Budget carefully for transfer costs on top of your deposit - these are often forgotten.',
            actions: [
                'Budget for transfer costs: roughly 8–10% of property price (attorney fees, transfer duty, bond registration).',
                'Negotiate the purchase price - sellers often accept 5–8% below asking in the current market.',
                'A shorter bond term (15 years vs 20 years) saves hundreds of thousands in interest if your surplus allows.',
                'Set up bond repayments by debit order immediately on registration.',
            ],
            nudge: 'Transfer duty in SA: no duty on properties under R1.1M. Then 3% on R1.1M–R1.375M band, scaling up. Budget for this separately from your deposit.',
        },
        {
            year: 5,
            title: 'Build Equity & Reinvest Your Surplus',
            target: 'Extra bond payments + restart investment contributions',
            description: 'Now that the deposit phase is over, redirect surplus back into wealth-building. Every extra rand into the bond saves you years of interest.',
            actions: [
                'Pay extra into your bond whenever possible - even R500/month extra saves years.',
                'Do not access your access bond to fund lifestyle expenses.',
                'Restart TFSA and JSE ETF contributions now that the deposit phase is over.',
                'Reassess your RA - aim to max the 27.5% deduction as your income grows.',
                'Your property should have grown approximately 34% after 5 years at 6% p.a.',
            ],
            nudge: 'At 6% p.a. growth, a R1.5M property is worth approximately R2M after 5 years. But equity only benefits you when you sell or leverage it carefully.',
        },
    ]
}

//Status Reporting thing
const STATUS_ORDER  = ['not-started', 'in-progress', 'done']
const STATUS_LABELS = {
    'not-started': 'Not Started',
    'in-progress': 'In Progress',
    'done':        'Done ✓',
}

export default function FirstPropertyPath() {
    const { profile } = useUserProfile()

    //Tracking the property onluy inputs
    const [targetPrice, setTargetPrice] = useState(1500000)
    const [depositPct,  setDepositPct]  = useState(10)
    const [bondTerm,    setBondTerm]    = useState(20)
    const [bondRate,    setBondRate]    = useState(SA.PRIME_RATE + SA.BOND_SPREAD)

    //Milestone progress
    const [statuses, setStatuses] = useState(
        Array(5).fill('not-started')
    )

    //Learn section terms. Do I need to make it's own page or si this fine?
    const [learnOpen, setLearnOpen] = useState(false)

    const takeHome      = calcTakeHome(profile.grossIncome, profile.raPercent)
    const surplus       = calcNetSurplus(profile)
    const dti           = calcDTI(profile)
    const emergMonths   = Number(calcEmergencyMonths(profile))
    const targetDeposit = targetPrice * (depositPct / 100)
    const bondPrincipal = targetPrice - targetDeposit
    const bondPayment   = calcBondRepayment(bondPrincipal, bondRate, bondTerm)
    const bondPct       = Math.round((bondPayment / takeHome) * 100)
    const canAfford     = bondPct <= 30

    //How many months does the user need to save for the deposit (assuming 50% of surplus goes to it)
    const monthsToDeposit = surplus > 0
        ? Math.ceil(targetDeposit / (surplus * 0.5))
        : null

    const milestones = buildMilestones(targetDeposit, bondPayment, takeHome, surplus)

    const completedCount = statuses.filter(s => s === 'done').length
    const progressPct    = Math.round((completedCount / 5) * 100)

    //Status toggle NEED TO FIXXXX
    function cycleStatus(idx) {
        setStatuses(prev => {
            const next    = [...prev]
            const current = STATUS_ORDER.indexOf(prev[idx])
            next[idx]     = STATUS_ORDER[(current + 1) % STATUS_ORDER.length]
            return next
        })
    }

    return (
        <>
        <div className="page-header">
            <div>
                <h1 className="page-title">First Property Path</h1>
                <p className="page-subtitle">
                    A 5-year roadmap from renter to homeowner - built around SA bond
                    rates, SARS deductions, and Johannesburg property realities.
                </p>
            </div>

            

             <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                <div className="track-progress">
                    <svg viewBox="0 0 100 100" width="80" height="80">
                        <circle cx="50" cy="50" r="42" fill="none"
                            stroke="rgba(255,255,255,0.1)" strokeWidth="10"/>
                        <circle
                            cx="50" cy="50" r="42"
                            fill="none"
                            stroke={progressPct === 100 ? '#4ade80' : '#A084E8'}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={`${(progressPct / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                            transform="rotate(-90 50 50)"
                            style={{ transition: 'stroke-dasharray 0.5s ease' }}
                        />
                        <text x="50" y="46" textAnchor="middle" fontSize="18"
                            fontWeight="700" fill="white" dominantBaseline="middle">
                            {progressPct}%
                        </text>
                        <text x="50" y="63" textAnchor="middle" fontSize="9"
                            fill="rgba(255,255,255,0.5)">
                            complete
                        </text>
                    </svg>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.45)', textAlign: 'center', marginTop: '0.25rem' }}>
                        {completedCount} of 5 done
                    </p>
                </div>

                <button className="reset-btn" onClick={() => {
                    setTargetPrice(1500000)
                    setDepositPct(10)
                    setBondTerm(20)
                    setBondRate(SA.PRIME_RATE + SA.BOND_SPREAD)
                    setStatuses(Array(5).fill('not-started'))
                }}>
                    Reset inputs
                </button>
            </div>
        </div>

        

        <div className="split-body">

            <aside className="split-left">

                <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--white)', borderBottom: '1px solid rgba(205,180,255,0.2)', paddingBottom: '0.5rem' }}>
                    Your Property Goal
                </h2>

                <div className="input-field">
                    <label>Target property price</label>
                    <div className="input-prefix-wrap">
                        <span className="input-prefix">R</span>
                        <input
                            type="number"
                            value={targetPrice === 0 ? '' : targetPrice}
                            placeholder="0"
                            min={500000}
                            step={50000}
                            onChange={e => setTargetPrice(Number(e.target.value))}
                        />
                    </div>
                    <span className="input-hint">Fourways 2-bed: ~R1.3M–R1.8M · Bryanston: ~R2M–R3M</span>
                </div>

                <div className="input-field">
                    <label>Deposit: {depositPct}%</label>
                    <input type="range" min={5} max={30} step={1} value={depositPct}
                        onChange={e => setDepositPct(Number(e.target.value))} />
                    <span className="input-hint">SA banks typically require 10% minimum</span>
                </div>

                <div className="input-field">
                    <label>Bond term: {bondTerm} years</label>
                    <input type="range" min={10} max={30} step={5} value={bondTerm}
                        onChange={e => setBondTerm(Number(e.target.value))} />
                </div>

                <div className="input-field">
                    <label>Interest rate: {(bondRate * 100).toFixed(2)}%</label>
                    <input type="range" min={0.08} max={0.15} step={0.0025} value={bondRate}
                        onChange={e => setBondRate(Number(e.target.value))} />
                    <span className="input-hint">SA prime is 10.25%. First-time buyers: prime +0.5% to +1.5%</span>
                </div>

                <div className="calc-summary">
                    <div className="calc-row">
                        <span>Deposit needed</span>
                        <strong>{fmtZAR(targetDeposit)}</strong>
                    </div>
                    <div className="calc-row">
                        <span>Bond amount</span>
                        <strong>{fmtZAR(bondPrincipal)}</strong>
                    </div>
                    <div className="calc-row">
                        <span>Monthly bond payment</span>
                        <strong>{fmtZAR(bondPayment)}</strong>
                    </div>
                    <div className="calc-row">
                        <span>% of take-home</span>
                        <strong className={bondPct > 30 ? 'text-warn' : 'text-ok'}>{bondPct}%</strong>
                    </div>
                    {monthsToDeposit && (
                        <div className="calc-row">
                            <span>Est. months to deposit</span>
                            <strong>~{monthsToDeposit}</strong>
                        </div>
                    )}
                </div>

                <div className="recommendations">
                    <h3 style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.55)' }}>
                        Personalised Recommendations
                    </h3>
                    <p className="recommendations-sub">Based on your Money Snapshot inputs</p>

                    <div className={`recommendation ${canAfford ? 'recommendation--ok' : 'recommendation--warn'}`}>
                        {canAfford
                            ? <><Icon name="ok" size={17} glow /> Bond payment is {bondPct}% of take-home — within the 30% rule.</>
                            : <><Icon name="warn" size={17} glow /> Bond payment is {bondPct}% of take-home — above 30%.</>
                        }
                    </div>
                    {dti > 36 && (
                        <div className="recommendation recommendation--warn">
                            <Icon name="warn"   size={17} glow /> Your DTI is {dti}% - above 36%. Pay down debt before applying.
                        </div>
                    )}
                    {emergMonths < 1 && (
                        <div className="recommendation recommendation--danger">
                            <Icon name="danger" size={17} glow /> Less than 1 month emergency savings. Complete Year 1 first.
                        </div>
                    )}
                    {surplus <= 0 && (
                        <div className="recommendation recommendation--danger">
                            <Icon name="danger" size={17} glow /> Expenses exceed income by {fmtZAR(Math.abs(surplus))}. Fix surplus first.
                        </div>
                    )}
                    {surplus > 0 && surplus < 3000 && (
                        <div className="recommendation recommendation--warn">
                            <Icon name="warn"   size={17} glow /> Surplus of {fmtZAR(surplus)} is thin. This track will take longer than 5 years.
                        </div>
                    )}
                    {surplus > 5000 && dti <= 36 && emergMonths >= 1 && canAfford && (
                        <div className="recommendation recommendation--ok">
                            <Icon name="ok" size={17} glow /> Your profile looks solid. {fmtZAR(surplus)}/month surplus gives real momentum.
                        </div>
                    )}
                </div>

            </aside>


            <div className="split-right">


        <div style={{ padding: '0 1.5rem', flexShrink: 0 }}>
            <div className="philosophy-banner">
                <div>
                    <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--p-100)', marginBottom: '0.5rem' }}>
                        Who this track is for
                    </h3>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.75)', lineHeight: 1.65 }}>
                        You are renting for R15 000–R25 000/month and feel the money
                        disappearing. You want to own property but are not sure when you
                        will be ready. This track prioritises aggressive savings, RA
                        top-ups for tax breaks, and low-volatility JSE investing while
                        you build your deposit.
                    </p>
                </div>
                <div>
                    <div className="tradeoff-box tradeoff-box--avoid">
                        <strong> <Icon name="danger" size={17} glow colour="#fca5a5" /> Avoid during this track</strong>
                        <p>Luxury car finance · aggressive offshore speculation · lifestyle creep · new credit applications</p>
                    </div>
                    <div className="tradeoff-box tradeoff-box--prioritise">
                        <strong> <Icon name="ok"     size={17} glow colour="#86efac" /> Prioritise</strong>
                        <p>Emergency fund first · then deposit savings · then bond pre-approval · keep RA active</p>
                    </div>
                </div>
            </div>
        </div>

                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--white)' }}>
                    5-Year Milestone Timeline
                </h2>
                <p style={{ fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.55)', marginTop: '-0.5rem' }}>
                    Click any status badge to track your progress. Each milestone is personalised to your income and goals.
                </p>

                {milestones.map((m, idx) => {
                    const status = statuses[idx]
                    const statusColour = {
                        'not-started': '#9ca3af',
                        'in-progress': '#f59e0b',
                        'done':        '#22c55e',
                    }[status]

                    return (
                        <div key={idx} className={`milestone milestone--${status}`}>
                            <div className="milestone-header">
                                <div className="milestone-year-wrap">
                                    <div className="milestone-dot" style={{ background: statusColour }} />
                                    <span className="milestone-year">Year {m.year}</span>
                                </div>
                                <h3 className="milestone-title">{m.title}</h3>
                                <button
                                    className="milestone-status-btn"
                                    style={{ borderColor: statusColour, color: statusColour }}
                                    onClick={() => cycleStatus(idx)}
                                >
                                    {STATUS_LABELS[status]}
                                </button>
                            </div>
                            <div className="milestone-target"> <Icon name="target" size={17} glow /> {m.target}</div>
                            <p className="milestone-description">{m.description}</p>
                            <ul className="milestone-actions">
                                {m.actions.map((action, i) => <li key={i}>{action}</li>)}
                            </ul>
                            <div className="milestone-nudge"><Icon name="nudge" size={17} glow /> {m.nudge}</div>
                        </div>
                    )
                })}

                <div className="learn-section">
                    <button className="learn-toggle" onClick={() => setLearnOpen(prev => !prev)}>
                        <Icon name="learn" size={19} glow />
                        {learnOpen ? 'Hide' : 'Show'} key property concepts
                    </button>
                    {learnOpen && (
                        <div className="learn-grid">
                            <LearnCard term="Bond (Home Loan)" explanation="A loan from a bank secured against your property. SA bonds are typically at prime rate + a margin. Missing payments can lead to repossession." />
                            <LearnCard term="Transfer Duty" explanation="A government tax on property purchases. No duty under R1.1M. Then 3% on R1.1M–R1.375M. On a R1.5M home, budget ~R30 000 in transfer duty." />
                            <LearnCard term="Bond Originator" explanation="A free service (ooba, BetterBond) that submits your application to multiple banks simultaneously. Costs you nothing." />
                            <LearnCard term="Access Bond" explanation="Most SA bonds are access bonds - pay in extra and redraw later. Reduces balance and interest while keeping funds accessible." />
                            <LearnCard term="DTI for Bond Approval" explanation="Banks require total debt payments below 36% of gross income. This includes your future bond payment. Get DTI down before applying." />
                            <LearnCard term="Transfer Costs" explanation="Beyond transfer duty: attorney fees, bond registration, deeds office levies. Budget 8–10% of property price total." />
                        </div>
                    )}
                </div>

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