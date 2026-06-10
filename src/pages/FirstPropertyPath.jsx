import { useState, useMemo, useContext, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useUserProfile } from '../context/UserProfileContext'
import AuthContext from '../context/AuthContext'
import {
    calcTakeHome, calcNetSurplus, calcTotalExpenses,
    calcDTI, calcBondRepayment, calcTransferDuty, fmtZAR, SA,
} from '../components/financialCalcs'
import "../styles/shared/TracksStudioShared.css"
import "../styles/shared/Tracks.css"
import Icon from '../components/Icons'
import TrackTimeline   from '../components/track/TrackTimeline'
import TrackYearDetail  from '../components/track/TrackYearDetail'
import { useTrackProgress }  from '../hooks/useTrackProgress'
import { PROPERTY_ACTIONS }  from '../data/trackActions'

/* Building all 5 milestone objects with personalized numbers from the user's profile. (Make more personalized rather than info dump)
   Every number here is calculated from real profile data so trynna feel like a personal coach */
function buildMilestones({ profile, targetPrice, depositPct, takeHome, surplus, expenses }) {
    const deposit         = Math.round(targetPrice * (depositPct / 100))
    const transferDuty    = calcTransferDuty(targetPrice)
    const conveyancing    = Math.round(targetPrice * 0.02)
    const totalCashNeeded = deposit + transferDuty + conveyancing
    const bondRate        = SA.PRIME_RATE + SA.BOND_SPREAD
    const bondPayment     = calcBondRepayment(targetPrice - deposit, bondRate, 20)
    const bondAsPctTH     = takeHome > 0 ? Math.round((bondPayment / takeHome) * 100) : 0
    const dti             = profile.grossIncome > 0
        ? Math.round(((profile.carPayment || 0) + (profile.loanPayment || 0)) / profile.grossIncome * 100)
        : 0
    const emergencyTarget = Math.round(expenses * 3)
    const bankBalance     = profile.bankBalance || 0
    const emergencyPct    = expenses > 0 ? Math.min(100, Math.round((bankBalance / emergencyTarget) * 100)) : 0
    const savingsToDeposit = Math.max(0, surplus * 0.6) /* assume 60% of surplus goes to deposit savings */
    const depositProgress  = Math.min(100, Math.round((bankBalance / totalCashNeeded) * 100))
    const monthsToDeposit  = savingsToDeposit > 0
        ? Math.ceil((totalCashNeeded - bankBalance) / savingsToDeposit)
        : null

    /* Status logic: done = target met, active = currently working on, upcoming = future */
    const y1Status = emergencyPct >= 100 ? 'done' : emergencyPct > 30 ? 'active' : 'upcoming'
    const y2Status = y1Status === 'done' ? (dti < 36 ? 'done' : 'active') : 'upcoming'
    const y3Status = y2Status === 'done' ? 'active' : 'upcoming'
    const y4Status = y3Status === 'done' ? 'active' : 'upcoming'
    const y5Status = depositProgress >= 100 ? 'active' : 'upcoming'

    return [
        {
            year:     1,
            label:    'Foundation',
            sublabel: 'Emergency fund',
            status:   y1Status,
            mainTarget:   emergencyTarget,
            mainCurrent:  bankBalance,
            mainLabel:    '3-month emergency fund',
            progressPct:  emergencyPct,
            progressLabel: `${(bankBalance / Math.max(1, expenses)).toFixed(1)} months coverage`,
            insight: emergencyPct >= 100
                ? `You have ${fmtZAR(bankBalance)}, covering ${(bankBalance / Math.max(1, expenses)).toFixed(1)} months. Emergency fund complete.`
                : surplus > 0
                    ? `Putting ${fmtZAR(Math.round(surplus * 0.4))}/month toward your fund, you could reach 3 months in ${Math.ceil((emergencyTarget - bankBalance) / Math.max(1, surplus * 0.4))} months.`
                    : 'Reduce expenses to free up surplus before building your emergency fund.',
            focus: [
                'Open a 32-day notice account, separate from your cheque account. Automate a monthly transfer on payday.',
                `Your 3-month target is ${fmtZAR(emergencyTarget)}. Do not invest in volatile assets until this exists.`,
                'If you have a TFSA, keep 3 months there for now - but do not withdraw for non-emergencies.',
            ],
            avoid:     ['Car upgrades', 'Increasing rent', 'Skipping RA', 'Taking on new debt'],
            why:       'Without a buffer, one unexpected expense forces you into expensive credit that delays your deposit target by months. This is Year 1 for a reason.',
            saContext: 'ABSA, Nedbank, and FNB currently offer 7-8% p.a. on 32-day notice accounts, vs 2-3% on a current account. On R90 000, that difference is R4 500/year.',
            warning:   emergencyPct < 20
                ? `You have ${(bankBalance / Math.max(1, expenses)).toFixed(1)} months covered. Every available rand goes to this fund before anything else.`
                : null,
            tradeoffs: [
                {
                    type:    'prioritise',
                    heading: 'Emergency fund before TFSA',
                    body:    'The temptation is to open a TFSA first. A 3-month buffer is what prevents you from liquidating investments when life disrupts the plan. Build the floor before everything else.',
                },
                {
                    type:    'avoid',
                    heading: 'Keeping savings in your main account',
                    body:    'Money in a cheque account earns 1-2% and disappears into daily spend. A separate 32-day notice account earns 7-8% p.a. and creates friction that protects the goal.',
                },
            ],
        },
        {
            year:     2,
            label:    'Clear Debt',
            sublabel: 'Reduce DTI + start deposit',
            status:   y2Status,
            mainTarget:   deposit,
            mainCurrent:  Math.max(0, bankBalance - emergencyTarget),
            mainLabel:    `Deposit target (${depositPct}% of ${fmtZAR(targetPrice)})`,
            progressPct:  Math.min(100, Math.round((Math.max(0, bankBalance - emergencyTarget) / deposit) * 100)),
            progressLabel: `${fmtZAR(Math.max(0, bankBalance - emergencyTarget))} saved toward deposit`,
            insight: dti >= 36
                ? `Your DTI is ${dti}%. Banks require below 36% for bond approval. Clearing ${fmtZAR((profile.carPayment || 0) + (profile.loanPayment || 0))}/month in debt is the priority.`
                : `Your DTI is ${dti}% - already within the 36% threshold. Focus on growing your deposit savings to ${fmtZAR(deposit)}.`,
            focus: [
                dti >= 36
                    ? `Pay off your highest-rate debt first (avalanche method). Your car payment of ${fmtZAR(profile.carPayment || 0)}/month is the biggest obstacle.`
                    : `DTI is healthy at ${dti}%. Redirect ${fmtZAR(Math.round(surplus * 0.6))}/month to a dedicated deposit savings account.`,
                'Once debt is cleared, redirect the full payment amount to your deposit fund immediately.',
                `Target saving ${fmtZAR(Math.round(takeHome * 0.25))}/month (25% of take-home) toward your deposit.`,
            ],
            avoid:     ['New vehicle finance', 'Hire purchase', 'Credit card debt', 'Increasing lifestyle spend'],
            why:       'Banks calculate your bond affordability against your gross income. Every R1 000/month in existing debt reduces the bond amount they will approve.',
            saContext: `SA banks use a DTI threshold of 36% of gross income. At ${fmtZAR(profile.grossIncome || 0)}/month gross, your maximum total monthly debt (including your future bond) should not exceed ${fmtZAR(Math.round((profile.grossIncome || 0) * 0.36))}.`,
            warning:   dti > 36
                ? `Your DTI of ${dti}% is above the 36% bond approval threshold. This year is non-negotiable - clearing debt is the entire Year 2 mission.`
                : null,
            tradeoffs: [
                {
                    type:    'prioritise',
                    heading: 'Highest-rate debt first (avalanche method)',
                    body:    'Personal loans and credit cards at 18-24% cost twice as much as vehicle finance at 11-12%. Every extra rand against your highest-rate debt saves more than splitting payments equally across all accounts.',
                },
                {
                    type:    'avoid',
                    heading: 'Equal minimum payments across all debts',
                    body:    'Paying the minimum on everything while attacking the highest-rate account is more mathematically efficient than equal splits. Emotional comfort is not the same as financial efficiency here.',
                },
            ],
        },
        {
            year:     3,
            label:    'Pre-approval',
            sublabel: 'Get bond-ready',
            status:   y3Status,
            mainTarget:   Math.round(totalCashNeeded * 0.6),
            mainCurrent:  Math.max(0, bankBalance - emergencyTarget),
            mainLabel:    '60% of total cash target',
            progressPct:  Math.min(100, depositProgress),
            progressLabel: `${fmtZAR(Math.max(0, bankBalance - emergencyTarget))} of ${fmtZAR(totalCashNeeded)} needed`,
            insight: `Your bond payment on this property would be ${fmtZAR(bondPayment)}/month - ${bondAsPctTH}% of your take-home. Banks prefer this below 30%.`,
            focus: [
                'Compile pre-approval documents: 3 months payslips, 6 months bank statements, proof of ID and residence.',
                'Avoid any new credit applications or missed payments for at least 12 months before applying.',
                'Use a bond originator (ooba or BetterBond) - free service, submits to all major banks simultaneously.',
            ],
            avoid:     ['Job changes', 'New credit cards', 'Hire purchase', 'Missing payments'],
            why:       'Pre-approval tells you exactly what you can afford before you make an offer. It also signals to sellers that you are a serious buyer - critical in competitive SA suburbs.',
            saContext: `ooba and BetterBond are free bond originators that submit your application to ABSA, Standard Bank, FNB, and Nedbank simultaneously. You get competing offers, which gives you negotiating power on the interest rate.`,
            warning:   dti > 36
                ? `Your DTI is at ${dti}%. Bond pre-approval requires under 36%. A declined application also leaves a mark on your credit record - do not apply until this is resolved.`
                : null,
            tradeoffs: [
                {
                    type:    'prioritise',
                    heading: 'Bond originator over a direct bank application',
                    body:    'ooba and BetterBond submit to all major banks simultaneously at no cost to you. You get competing offers and leverage to negotiate your rate down. The bank pays the originator - not you.',
                },
                {
                    type:    'avoid',
                    heading: 'Applying to multiple banks independently',
                    body:    'Each direct bank credit enquiry shows on your credit record. Multiple enquiries in a short period reduce your score. A bond originator counts as a single enquiry regardless of how many banks respond.',
                },
            ],
        },
        {
            year:     4,
            label:    'Final Stretch',
            sublabel: 'Complete deposit + transfer costs',
            status:   y4Status,
            mainTarget:   totalCashNeeded,
            mainCurrent:  Math.max(0, bankBalance - emergencyTarget),
            mainLabel:    'Total cash needed at purchase',
            progressPct:  Math.min(100, depositProgress),
            progressLabel: `Deposit + transfer duty + conveyancing`,
            insight: monthsToDeposit !== null && monthsToDeposit > 0
                ? `At ${fmtZAR(savingsToDeposit)}/month in dedicated savings, you could reach your full ${fmtZAR(totalCashNeeded)} target in ${monthsToDeposit} months.`
                : 'You are on track. Keep your savings rate consistent through the final stretch.',
            focus: [
                `Full cash breakdown: ${fmtZAR(deposit)} deposit + ${fmtZAR(transferDuty)} transfer duty + ${fmtZAR(conveyancing)} conveyancing = ${fmtZAR(totalCashNeeded)} total.`,
                'Keep your credit record spotless. Do not apply for any new accounts.',
                `Your future bond payment is ${fmtZAR(bondPayment)}/month. Make sure your budget already reflects this.`,
            ],
            avoid:     ['Large purchases', 'Changing banks', 'Taking on new debt', 'Withdrawing savings'],
            why:       'Transfer costs catch many first-time buyers off guard. Transfer duty, conveyancing fees, and bond registration can add R50 000 - R120 000 on top of your deposit.',
            saContext: `Transfer duty on ${fmtZAR(targetPrice)}: ${fmtZAR(transferDuty)}. Conveyancing estimate: ${fmtZAR(conveyancing)}. These are paid from your own cash, not the bond.`,
            warning:   Math.max(0, bankBalance - emergencyTarget) < totalCashNeeded * 0.3
                ? `Your savings toward the deposit are at ${Math.round((Math.max(0, bankBalance - emergencyTarget) / Math.max(1, totalCashNeeded)) * 100)}% of total needed. The final stretch requires consistent monthly saving without any withdrawals.`
                : null,
            tradeoffs: [
                {
                    type:    'prioritise',
                    heading: 'Separate deposit savings from transfer cost savings',
                    body:    `Keep your ${fmtZAR(deposit)} deposit and the ${fmtZAR(transferDuty + conveyancing)} in transfer costs in completely separate accounts. Mixing them creates a false sense of readiness - you need both to close the deal.`,
                },
                {
                    type:    'avoid',
                    heading: 'Buying at the top of your approval limit',
                    body:    'Banks approve what you mathematically afford at current interest rates. A 1-2% rate increase post-approval can make the same bond unaffordable. Stay 15-20% below your ceiling as a buffer against rate movements.',
                },
            ],
        },
        {
            year:     5,
            label:    'Purchase',
            sublabel: 'Execute and own',
            status:   y5Status,
            mainTarget:   totalCashNeeded,
            mainCurrent:  Math.max(0, bankBalance - emergencyTarget),
            mainLabel:    'Cash ready for purchase',
            progressPct:  Math.min(100, depositProgress),
            progressLabel: `${depositProgress}% of purchase costs saved`,
            insight: `Your bond payment will be ${fmtZAR(bondPayment)}/month (${bondAsPctTH}% of take-home). In the first 7-10 years, most of this goes to interest - that is normal and expected.`,
            focus: [
                'Make a written offer to purchase. Use a conveyancing attorney - not just the developer\'s recommended attorney.',
                'Negotiate the bond rate: present competing offers from your bond originator. Even 0.25% off saves tens of thousands over 20 years.',
                'Consider an access bond - you can pay extra and redraw later, which reduces your interest burden significantly.',
            ],
            avoid:     ['Buying at peak market without research', 'Using all savings for deposit (keep 1-2 months buffer)', 'Skipping a property inspection'],
            why:       'This is the payoff of 4 years of discipline. The goal now is to execute carefully. A rushed purchase or missed red flag can be expensive.',
            saContext: `ABSA FlexiReserve is an access bond product - you pay in extra, reduce your balance, and can redraw if needed. On a ${fmtZAR(targetPrice - deposit)} bond at ${((bondRate) * 100).toFixed(2)}%, paying in ${fmtZAR(500)}/month extra saves years of interest.`,
            warning:   bondAsPctTH > 40
                ? `Your projected bond payment of ${fmtZAR(bondPayment)} is ${bondAsPctTH}% of take-home - above the 30% recommended maximum. A larger deposit or lower property price would reduce this meaningfully.`
                : null,
            tradeoffs: [
                {
                    type:    'prioritise',
                    heading: 'Access bond (FlexiReserve) over a standard bond',
                    body:    `Paying ${fmtZAR(500)} extra per month into an access bond saves tens of thousands in interest and shortens your term by years. You can still redraw the extra if genuinely needed - it is not locked away.`,
                },
                {
                    type:    'avoid',
                    heading: 'Skipping an independent property inspection',
                    body:    'A structural defect found after transfer is entirely your problem. An independent inspection costs R1 500-R3 000. Remediating hidden structural damage after purchase costs R50 000+. This is not where to save money.',
                },
            ],
        },
    ]
}

export default function FirstPropertyPath() {
    const { profile }    = useUserProfile()
    const { user }       = useContext(AuthContext)
    const hasData        = profile.grossIncome > 0

    /* User-adjustable assumptions in the sidebar */
    const [targetPrice,  setTargetPrice]  = useState(1500000)
    const [depositPct,   setDepositPct]   = useState(10)
    const [selectedYear, setSelectedYear] = useState(1)

    /* Derived values that feed into milestones and the verdict */
    const takeHome  = calcTakeHome(profile.grossIncome, profile.raPercent, profile.otherIncome)
    const surplus   = calcNetSurplus(profile)
    const expenses  = calcTotalExpenses(profile)
    const dti       = calcDTI(profile)
    const deposit   = Math.round(targetPrice * (depositPct / 100))
    const bondRate  = SA.PRIME_RATE + SA.BOND_SPREAD
    const bondPmt   = calcBondRepayment(targetPrice - deposit, bondRate, 20)
    const transferD = calcTransferDuty(targetPrice)
    const convey    = Math.round(targetPrice * 0.02)
    const totalCash = deposit + transferD + convey

    /* How long to reach the deposit target from current savings */
    const savingsRate     = Math.max(0, surplus * 0.6)
    const bankBalance     = profile.bankBalance || 0
    const monthsToGoal    = savingsRate > 0
        ? Math.ceil((totalCash - bankBalance) / savingsRate)
        : null
    const buyYear         = monthsToGoal !== null
        ? new Date().getFullYear() + Math.ceil(monthsToGoal / 12)
        : null

    /* Verdict status */
    const isOnTrack   = savingsRate >= totalCash / (5 * 12)
    const verdictStatus = surplus <= 0 ? 'deficit' : isOnTrack ? 'on-track' : 'at-risk'

    const milestones = useMemo(() => buildMilestones({
        profile, targetPrice, depositPct, takeHome, surplus, expenses
    }), [profile, targetPrice, depositPct, takeHome, surplus, expenses])

    const activeMilestone = milestones[selectedYear - 1]

    /* Micro-action progress */
    const { getCompleted, toggleAction } = useTrackProgress('property')
    const progressMap = useMemo(() => {
        const map = {}
        ;[1,2,3,4,5].forEach(yr => {
            map[yr] = { done: getCompleted(yr).length, total: PROPERTY_ACTIONS[yr].length }
        })
        return map
    }, [getCompleted])

    /* Empty state - no data entered yet */
    if (!hasData) {
        return (
            <div className="pp-empty">
                <div className="pp-empty-inner">
                    <Icon name="tracks" size={40} colour="var(--n-300)"/>
                    <h2>Set up your Money Snapshot first</h2>
                    <p>Your Property Path projections are built from your actual income, expenses, and savings. Enter your financial details to unlock personalised milestones.</p>
                    <Link to="/dashboard" className="btn-primary">Go to Money Snapshot</Link>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Page header with live verdict */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">{user?.name ? `${user.name}'s Property Path` : 'First Property Path'}</h1>
                    <p className="page-subtitle">A personalised 5-year roadmap to your first property, built from your real numbers.</p>
                </div>
                <VerdictBadge
                    status={verdictStatus}
                    buyYear={buyYear}
                    monthsToGoal={monthsToGoal}
                    surplus={surplus}
                    totalCash={totalCash}
                />
            </div>

            <div className="split-body">
                {/* LEFT - Inputs + key numbers */}
                <div className="split-left">
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="target" size={13}/> Your Goal</p>

                        <div className="input-field">
                            <label>Target property price</label>
                            <div className="input-prefix-wrap">
                                <span className="input-prefix">R</span>
                                <input
                                    type="number"
                                    value={targetPrice}
                                    onChange={e => setTargetPrice(Number(e.target.value) || 0)}
                                    min="500000"
                                    step="50000"
                                />
                            </div>
                            <p className="input-hint">JHB average 2-bed: R1.2M-R2M in northern suburbs.</p>
                        </div>

                        <div className="input-field">
                            <label>Deposit: {depositPct}%</label>
                            <input
                                type="range"
                                min="10" max="30" step="5"
                                value={depositPct}
                                onChange={e => setDepositPct(Number(e.target.value))}
                            />
                            <p className="input-hint">10% is standard. 20% eliminates transfer duty on most properties.</p>
                        </div>
                    </div>

                    {/* Key numbers card */}
                    <div className="pp-key-numbers">
                        <p className="pp-key-numbers-title">Your numbers</p>
                        <div className="pp-key-row">
                            <span>Required deposit</span>
                            <strong>{fmtZAR(deposit)}</strong>
                        </div>
                        <div className="pp-key-row">
                            <span>Transfer duty</span>
                            <strong>{fmtZAR(transferD)}</strong>
                        </div>
                        <div className="pp-key-row">
                            <span>Conveyancing (est.)</span>
                            <strong>{fmtZAR(convey)}</strong>
                        </div>
                        <div className="pp-key-row pp-key-row--total">
                            <span>Total cash needed</span>
                            <strong>{fmtZAR(totalCash)}</strong>
                        </div>
                        <div className="pp-key-divider"/>
                        <div className="pp-key-row">
                            <span>Monthly bond (est.)</span>
                            <strong>{fmtZAR(bondPmt)}</strong>
                        </div>
                        <div className="pp-key-row">
                            <span>Your current surplus</span>
                            <strong className={surplus < 0 ? 'pp-danger' : surplus < 2000 ? 'pp-warn' : 'pp-ok'}>{fmtZAR(surplus)}</strong>
                        </div>
                        <div className="pp-key-row">
                            <span>Your DTI</span>
                            <strong className={dti > 36 ? 'pp-danger' : dti > 25 ? 'pp-warn' : 'pp-ok'}>{dti}%</strong>
                        </div>
                    </div>

                    {/* DTI explanation if high */}
                    {dti > 36 && (
                        <div className="pp-inline-alert pp-inline-alert--warn">
                            <Icon name="warn" size={13}/>
                            Your DTI of {dti}% exceeds the 36% bond approval threshold. Clearing debt is your Year 2 priority.
                        </div>
                    )}
                </div>

                {/* RIGHT - Timeline + year detail */}
                <div className="split-right">
                    <TrackTimeline
                        milestones={milestones}
                        selectedYear={selectedYear}
                        onSelect={setSelectedYear}
                        progressMap={progressMap}
                    />
                    <TrackYearDetail
                        key={selectedYear}
                        milestone={activeMilestone}
                        actions={PROPERTY_ACTIONS[selectedYear]}
                        completed={getCompleted(selectedYear)}
                        onToggle={toggleAction}
                    />
                </div>
            </div>
        </>
    )
}

/* Verdict badge in the page header */

function VerdictBadge({ status, buyYear, monthsToGoal, surplus, totalCash }) {
    if (status === 'deficit') {
        return (
            <div className="pp-verdict pp-verdict--risk">
                <Icon name="danger" size={14}/>
                <div>
                    <strong>At risk</strong>
                    <span>No savings surplus. Reduce expenses first.</span>
                </div>
            </div>
        )
    }
    if (status === 'on-track') {
        return (
            <div className="pp-verdict pp-verdict--ok">
                <Icon name="ok" size={14}/>
                <div>
                    <strong>On track - buying in {buyYear}</strong>
                    <span>{monthsToGoal} months to {fmtZAR(totalCash)} at your current savings rate</span>
                </div>
            </div>
        )
    }
    return (
        <div className="pp-verdict pp-verdict--warn">
            <Icon name="warn" size={14}/>
            <div>
                <strong>{buyYear ? `Projected: ${buyYear}` : 'Increase savings rate'}</strong>
                <span>{monthsToGoal ? `${monthsToGoal} months at current pace` : 'Save more to hit your target'}</span>
            </div>
        </div>
    )
}

/* PropertyTimeline and YearDetail have been moved to shared components:
   src/components/track/TrackTimeline.jsx
   src/components/track/TrackYearDetail.jsx */
