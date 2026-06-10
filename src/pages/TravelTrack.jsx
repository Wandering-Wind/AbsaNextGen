import { useState, useMemo, useContext, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useUserProfile } from '../context/UserProfileContext'
import AuthContext from '../context/AuthContext'
import {
    calcNetSurplus, calcTakeHome, calcTotalExpenses, fmtZAR,
} from '../components/financialCalcs'
import "../styles/shared/TracksStudioShared.css"
import "../styles/shared/Tracks.css"
import Icon from '../components/Icons'
import TrackTimeline       from '../components/track/TrackTimeline'
import TrackYearDetail      from '../components/track/TrackYearDetail'
import { useTrackProgress } from '../hooks/useTrackProgress'
import { TRAVEL_ACTIONS }   from '../data/trackActions'

/* Static data */

const REGIONS = [
    { id: 'africa',   label: 'Africa',       baseCost: 22000, currency: 'ZAR', fxRisk: false },
    { id: 'europe',   label: 'Europe',        baseCost: 55000, currency: 'EUR', fxRisk: true  },
    { id: 'seasia',   label: 'SE Asia',       baseCost: 38000, currency: 'USD', fxRisk: true  },
    { id: 'americas', label: 'Americas',      baseCost: 65000, currency: 'USD', fxRisk: true  },
    { id: 'mideast',  label: 'Middle East',   baseCost: 32000, currency: 'AED', fxRisk: true  },
    { id: 'global',   label: 'Anywhere',      baseCost: 80000, currency: 'USD', fxRisk: true  },
]

const STYLES = [
    { id: 'budget',   label: 'Budget',    multiplier: 0.65 },
    { id: 'midrange', label: 'Mid-range', multiplier: 1.0  },
    { id: 'luxury',   label: 'Luxury',    multiplier: 1.75 },
]

const DURATIONS = [
    { id: '2w', label: '2 weeks', weeks: 2,  multiplier: 1.0 },
    { id: '1m', label: '1 month', weeks: 4,  multiplier: 1.7 },
    { id: '3m', label: '3 months',weeks: 13, multiplier: 4.5 },
    { id: '6m', label: '6 months',weeks: 26, multiplier: 8.0 },
]

/* Savings projection */
function buildProjection({ monthlyAmount, interestRate = 7.5 }) {
    const monthlyRate = (interestRate / 100) / 12
    let balance = 0
    const data = []
    for (let year = 1; year <= 5; year++) {
        for (let m = 0; m < 12; m++) {
            balance = balance * (1 + monthlyRate) + monthlyAmount
        }
        const contributed = Math.round(monthlyAmount * year * 12)
        const total       = Math.round(balance)
        data.push({
            year,
            label:       `Yr ${year}`,
            total,
            contributed,
            interest:    Math.max(0, total - contributed),
        })
    }
    return data
}

/* Milestone builder */
function buildMilestones({ profile, monthlyAmount, tripCost, fxCost, regionId, styleId, durationId, projection, surplus, expenses }) {
    const region   = REGIONS.find(r => r.id === regionId)   || REGIONS[0]
    const style    = STYLES.find(s => s.id === styleId)     || STYLES[1]
    const duration = DURATIONS.find(d => d.id === durationId) || DURATIONS[0]

    const emergencyTarget   = Math.round(expenses * 3)
    const bankBalance       = profile.bankBalance || 0
    const hasEmergency      = bankBalance >= emergencyTarget
    const travelPct         = surplus > 0 ? Math.round((monthlyAmount / surplus) * 100) : 0
    const isSafe            = travelPct <= 40

    const monthsToTrip      = monthlyAmount > 0 ? Math.ceil(fxCost / monthlyAmount) : null
    const y1 = projection[0]
    const y2 = projection[1]
    const y3 = projection[2]
    const y4 = projection[3]
    const y5 = projection[4]

    /* Extended trip cost estimate for Year 4 (3 months) */
    const extendedCost = Math.round(fxCost * (DURATIONS.find(d => d.id === '3m').multiplier / duration.multiplier))

    const y1Status = hasEmergency ? 'active' : 'upcoming'
    const y2Status = y1Status === 'active' && monthsToTrip !== null && monthsToTrip <= 24 ? 'active' : 'upcoming'
    const y3Status = 'upcoming'
    const y4Status = 'upcoming'
    const y5Status = 'upcoming'

    return [
        {
            year:     1,
            label:    'Travel Fund',
            sublabel: 'Dedicated account',
            status:   y1Status,
            mainTarget:   fxCost,
            mainCurrent:  y1.total,
            mainLabel:    'Target: first trip cost',
            currentLabel: 'Year 1 savings',
            progressPct:  Math.min(100, Math.round((y1.total / fxCost) * 100)),
            progressLabel: monthsToTrip
                ? `${monthsToTrip} months to first trip at ${fmtZAR(monthlyAmount)}/month`
                : 'Set a monthly amount to see your timeline',
            insight: hasEmergency
                ? isSafe
                    ? `${fmtZAR(monthlyAmount)}/month is ${travelPct}% of your surplus - well within the safe zone. Your emergency fund is intact and this allocation won't derail your investment goals.`
                    : `${fmtZAR(monthlyAmount)}/month is ${travelPct}% of your surplus - that's high. Consider reducing to ${fmtZAR(Math.round(surplus * 0.3))}/month and extending your timeline slightly.`
                : `Your emergency fund has ${fmtZAR(bankBalance)} - you need ${fmtZAR(emergencyTarget)} before ring-fencing money for travel. Build the buffer first, then start your travel fund.`,
            focus: [
                'Open a dedicated travel savings account - separate from your emergency fund and cheque account. The psychological separation prevents raids.',
                'Automate a debit order the day after payday. If it leaves your account before you see it, you will not miss it.',
                region.fxRisk
                    ? `Your target is ${region.label} - costs are in ${region.currency}. Save in rands, but buy forex 4-6 months before travel to lock in a rate.`
                    : `Regional African travel keeps costs in ZAR - no currency risk to manage. Your savings estimate is stable.`,
            ],
            avoid:     ['Using your emergency fund for travel', 'Booking on credit without a savings plan', 'Skipping your RA contribution to fund a trip', 'Keeping travel savings in your main account'],
            why:       'A dedicated account creates a hard barrier against impulse spending. When the money is earmarked and separate, the decision to spend it on something else requires a deliberate action - and that friction is the whole point.',
            saContext: `ABSA, Nedbank, and Standard Bank all offer 32-day notice accounts earning 7-8% p.a. on balances above R5 000. On a ${fmtZAR(fxCost)} travel goal, that's ${fmtZAR(Math.round(fxCost * 0.075))}/year in interest - your trip gets cheaper the longer you save.`,
            warning:   !hasEmergency
                ? `Your emergency fund is not complete. Build it to 3 months of expenses (${fmtZAR(emergencyTarget)}) before ring-fencing money for travel.`
                : travelPct > 40
                    ? `You are directing ${travelPct}% of your surplus to travel savings - above the 40% safe zone. Reduce to under ${fmtZAR(Math.round(surplus * 0.35))}/month to keep other goals on track.`
                    : null,
            tradeoffs: [
                {
                    type:    'prioritise',
                    heading: '32-day notice account over your main account',
                    body:    'Keeping travel savings in your cheque account makes them invisible as a goal and too easy to raid. A 32-day notice account earns 7-8% p.a. and adds friction that protects the target. The slight inconvenience is the feature.',
                },
                {
                    type:    'avoid',
                    heading: 'Funding your first trip with credit',
                    body:    'A trip funded on credit and repaid over 12 months at 22% p.a. costs 20-25% more than the sticker price. The debt repayment months erase the emotional benefit of the experience. Save before you go.',
                },
            ],
        },
        {
            year:     2,
            label:    'First Trip',
            sublabel: `${region.label} · ${style.label} · ${duration.label}`,
            status:   y2Status,
            mainTarget:   fxCost,
            mainCurrent:  y2.total,
            mainLabel:    `${style.label} ${duration.label} to ${region.label}`,
            currentLabel: 'Year 2 balance',
            progressPct:  Math.min(100, Math.round((y2.total / fxCost) * 100)),
            progressLabel: region.fxRisk
                ? `Forex-adjusted cost: ${fmtZAR(fxCost)} (5% p.a. rand depreciation)`
                : `Trip cost estimate: ${fmtZAR(fxCost)}`,
            insight: region.fxRisk
                ? `The rand depreciates ~5% per year against major currencies. A trip costing ${fmtZAR(tripCost)} today will cost approximately ${fmtZAR(Math.round(tripCost * 1.1))} in 2 years in rand terms. Save for the future price, not today's.`
                : `Regional African travel eliminates currency risk entirely. Your ${fmtZAR(fxCost)} estimate is stable and inflation-resistant compared to international destinations.`,
            focus: [
                region.fxRisk
                    ? 'Buy foreign currency 4-6 months before travel via ABSA Global Forex or Travelex. Both offer forward rate contracts - you lock in today\'s exchange rate for future delivery.'
                    : 'Book regional flights early. FlySafair, Airlink, and Ethiopian Airlines offer the best fares on African routes when booked 3+ months ahead.',
                'Budget 15% above your estimate for the unexpected - visa costs, travel insurance, health emergencies, or a spontaneous experience you didn\'t plan for.',
                'Use a travel credit card for all forex purchases. ABSA Rewards Mastercard and FNB Global Account both offer competitive forex rates with no per-transaction fees.',
            ],
            avoid:     ['Buying forex at OR Tambo airport (8–12% worse than online)', 'Skipping travel insurance', 'Booking last-minute at premium prices', 'Funding any shortfall with a credit card'],
            why:       'The first trip is proof of concept. You saved, you went, you came back financially intact. That experience makes every subsequent trip easier to plan - and removes the guilt that comes from funding travel impulsively.',
            saContext: `South African passport holders have visa-free or visa-on-arrival access to 103 countries. For the rest, budget R800–R2 500 per visa application. SARS allows you to carry R25 000 in foreign currency cash when travelling without a tax clearance certificate - above that, you need one.`,
            warning:   region.fxRisk && y2.total < fxCost * 0.6
                ? `You are at ${Math.round((y2.total / Math.max(1, fxCost)) * 100)}% of your forex-adjusted target and currency depreciation is moving it. Consider increasing contributions by ${fmtZAR(Math.round((fxCost - y2.total) / 12))}/month.`
                : null,
            tradeoffs: [
                {
                    type:    'prioritise',
                    heading: 'Buying forex 4-6 months early',
                    body:    `Online forex platforms give rates 8-12% better than OR Tambo airport exchanges. On a ${fmtZAR(fxCost)} purchase, that is ${fmtZAR(Math.round(fxCost * 0.09))} saved. ABSA Global Forex offers forward rate contracts up to 6 months in advance.`,
                },
                {
                    type:    'avoid',
                    heading: 'Skipping travel insurance to save on cost',
                    body:    'A medical evacuation abroad costs R150 000-R500 000. ABSA travel insurance starts at R250-400 per trip. This is not where to cut corners - one hospitalisation without cover erases years of savings.',
                },
            ],
        },
        {
            year:     3,
            label:    'Travel System',
            sublabel: 'Points + forex strategy',
            status:   y3Status,
            mainTarget:   y3.total,
            mainCurrent:  y2.total,
            mainLabel:    'Year 3 travel fund',
            currentLabel: 'Year 2 balance',
            progressPct:  Math.round((y2.total / y3.total) * 100),
            progressLabel: `${fmtZAR(y3.total - y2.total)} growth from Year 2 → Year 3`,
            insight: `By Year 3, your fund has ${fmtZAR(y3.total)}. If you've done your first trip, the goal now is to build a repeatable system - not start from zero each time.`,
            focus: [
                'Build a points strategy. ABSA Rewards, Discovery Miles, and eBucks (FNB) are the three most valuable SA programmes. Use your credit card for all monthly spend - groceries, fuel, subscriptions - and pay it in full each month.',
                'Consider an annual travel insurance policy. Discovery Insure and Sanlam both offer multi-trip annual cover that works out cheaper than per-trip insurance once you travel twice or more per year.',
                'Review your travel credit card. FNB Global Account earns eBucks redeemable at full face value on FlySafair - the highest-value points redemption in SA. Compare against your current card\'s actual forex fee.',
            ],
            avoid:     ['Paying interest on travel credit card spend - it wipes every benefit', 'Letting points expire (Avios expire after 36 months of inactivity)', 'Annual travel card fees that exceed your points value', 'Booking through third-party sites that don\'t earn points'],
            why:       'Year 3 is where travel becomes a system instead of a project. The difference between someone who travels expensively and someone who travels smartly is almost entirely the infrastructure they built in years 2–3.',
            saContext: `eBucks is the most misunderstood loyalty programme in SA. At top tier, FNB customers can redeem eBucks at face value (1 eBuck = R1) on FlySafair flights - unlike most cash-back programmes where redemption rates are heavily discounted. For frequent travellers, this can effectively halve domestic flight costs.`,
            warning:   null,
            tradeoffs: [
                {
                    type:    'prioritise',
                    heading: 'Points on everyday spend, paid in full monthly',
                    body:    'Using a travel rewards card for groceries, fuel, and subscriptions earns meaningful points with zero net cost - provided you pay the full balance every month. The points are a free benefit of purchases you were making anyway.',
                },
                {
                    type:    'avoid',
                    heading: 'Carrying a balance on a rewards credit card',
                    body:    'Interest at 22% p.a. wipes every point, benefit, and cashback earned. A rewards card only benefits you when the balance is cleared each month. If you carry a balance, the effective cost of points is negative.',
                },
            ],
        },
        {
            year:     4,
            label:    'Extended Travel',
            sublabel: '1–3 months funded',
            status:   y4Status,
            mainTarget:   extendedCost,
            mainCurrent:  y3.total,
            mainLabel:    '3-month trip target',
            currentLabel: 'Year 3 balance',
            progressPct:  Math.min(100, Math.round((y3.total / extendedCost) * 100)),
            progressLabel: `Extended trip estimate: ${fmtZAR(extendedCost)}`,
            insight: `A 3-month trip to ${region.label} at ${style.label.toLowerCase()} spend costs approximately ${fmtZAR(extendedCost)}. Your Year 4 balance is ${fmtZAR(y4.total)} - ${y4.total >= extendedCost ? 'enough to fund it in full.' : `${fmtZAR(extendedCost - y4.total)} short.`}`,
            focus: [
                'Extended travel requires income planning, not just savings. Remote work or a negotiated sabbatical are the two realistic routes - both require 6–12 months of lead time.',
                'Calculate your true cost: travel spend + ongoing SA fixed costs (rent, phone, medical aid, insurance). Most people underestimate their South African overhead by 30–40% when planning extended travel.',
                'Australia, Germany, and the UK all offer working holiday visas accessible to South Africans under 30–35. These let you work legally while travelling, which fundamentally changes the financial model.',
            ],
            avoid:     ['Leaving SA without any income replacement', 'Cancelling your RA during a sabbatical - you lose compound growth permanently', 'Ignoring ongoing SA costs while abroad', 'Returning home in debt'],
            why:       'Extended travel is fundamentally different from a 2-week trip. You are funding a period of life without income. The planning horizon and financial discipline required are much closer to early retirement planning than to a holiday.',
            saContext: `SARS taxes South Africans on worldwide income. If you work remotely for a foreign employer while abroad, income not remitted to SA may fall under the R1.25M foreign income exemption - but above that, full SARS tax applies. Get a tax professional involved before any arrangement over 60 days.`,
            warning:   null,
            tradeoffs: [
                {
                    type:    'prioritise',
                    heading: 'Planning income continuity before a sabbatical',
                    body:    'Extended travel without income is fundable from savings for 1-3 months. Beyond that, you need either remote work or a negotiated sabbatical - both require 6-12 months of preparation. The financial plan and the employment plan are the same plan.',
                },
                {
                    type:    'avoid',
                    heading: 'Pausing your RA during extended travel',
                    body:    'The compound growth lost from even one year of paused RA contributions is permanent. Work the trip cost into your budget without stopping your RA. If the numbers do not add up, reduce the trip duration rather than halt compounding.',
                },
            ],
        },
        {
            year:     5,
            label:    'On Your Terms',
            sublabel: `${fmtZAR(y5.total)} travel freedom`,
            status:   y5Status,
            mainTarget:   y5.total,
            mainCurrent:  y4.total,
            mainLabel:    '5-year travel fund',
            currentLabel: 'Year 4 balance',
            progressPct:  Math.round((y4.total / y5.total) * 100),
            progressLabel: `${fmtZAR(y5.interest)} earned in savings interest over 5 years`,
            insight: `Over 5 years, you saved ${fmtZAR(y5.contributed)} and your fund grew to ${fmtZAR(y5.total)}. Travel is now a recurring budget line - not a multi-year savings project.`,
            focus: [
                'At this point, travel should be an annual budget line. Review whether your monthly allocation still matches your goals - a fund that grows faster than you spend it is capital that could be compounding in your investment portfolio.',
                'Consider whether location independence is a realistic life goal. If so, your financial foundation (emergency fund, RA, investment portfolio) needs to be solid enough to support 3–6 months abroad per year without stress.',
                'Destination arbitrage: the rand buys significantly more in SE Asia, Eastern Europe, and most of Africa than in Western Europe or North America. Building knowledge of high-value, lower-cost destinations is a legitimate long-term financial strategy.',
            ],
            avoid:     ['Neglecting your investment portfolio in favour of travel', 'Spending the entire fund without rebuilding', 'Failing to update beneficiaries and estate plans before long-haul travel', 'Lifestyle inflation through travel spend'],
            why:       'Year 5 is not the destination - it\'s the proof of concept. You built a life that includes travel without financial compromise. The same discipline that funded your travel fund is the discipline that makes every other financial goal achievable.',
            saContext: `South Africa is one of the best countries in the world to travel from on a relative cost basis. Your rand buys you meaningfully more in SE Asia, Eastern Europe, Latin America, and most of Africa than it does at home. Intentional destination selection is not budget travel - it\'s smart travel.`,
            warning:   null,
            tradeoffs: [
                {
                    type:    'prioritise',
                    heading: 'Merging travel savings into a broader lifestyle fund',
                    body:    'After 5 years your travel habit is established. A permanently ring-fenced travel account may be less efficient than a general savings pot where travel is one planned use among others. Review whether the separation still serves you.',
                },
                {
                    type:    'avoid',
                    heading: 'Over-optimising points at the expense of actual travel',
                    body:    'Points are a means to travel, not a hobby in themselves. If optimising your redemption takes more time than planning the actual trip, something has gone wrong. Use the system when it is easy - do not let it use you.',
                },
            ],
        },
    ]
}

/* Custom area chart tooltip */
function TravelTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const contributed = payload.find(p => p.dataKey === 'contributed')?.value ?? 0
    const interest    = payload.find(p => p.dataKey === 'interest')?.value ?? 0
    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip-title">{label}</p>
            <div className="chart-tooltip-row">
                <span style={{ color: 'var(--absa-red)' }}>Saved</span>
                <strong>{fmtZAR(contributed)}</strong>
            </div>
            <div className="chart-tooltip-row">
                <span style={{ color: '#22c55e' }}>Interest</span>
                <strong>{fmtZAR(interest)}</strong>
            </div>
            <div className="chart-tooltip-row" style={{ borderTop: '1px solid var(--n-200)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                <span>Total</span>
                <strong>{fmtZAR(contributed + interest)}</strong>
            </div>
        </div>
    )
}

/* Derailment indicator */
function DerailmentIndicator({ travelPct, hasEmergency }) {
    let status, label, detail, cls
    if (!hasEmergency) {
        status = 'risk'; cls = 'tt-derail--risk'
        label  = 'Emergency fund missing'
        detail = 'Build your 3-month buffer before allocating to travel.'
    } else if (travelPct > 50) {
        status = 'risk'; cls = 'tt-derail--risk'
        label  = `${travelPct}% of surplus - too high`
        detail = 'Travel is crowding out investments. Reduce to under 40%.'
    } else if (travelPct > 40) {
        status = 'warn'; cls = 'tt-derail--warn'
        label  = `${travelPct}% of surplus - borderline`
        detail = 'Manageable but leaves little room for unexpected costs.'
    } else if (travelPct > 0) {
        status = 'ok'; cls = 'tt-derail--ok'
        label  = `${travelPct}% of surplus - safe`
        detail = 'Travel savings won\'t derail your financial foundation.'
    } else {
        status = 'ok'; cls = 'tt-derail--ok'
        label  = 'No allocation set'
        detail = 'Set a monthly amount above to see your impact.'
    }
    return (
        <div className={`tt-derail ${cls}`}>
            <div className="tt-derail-header">
                <Icon name={status === 'ok' ? 'ok' : status === 'warn' ? 'warn' : 'danger'} size={13}/>
                <strong>{label}</strong>
            </div>
            <p>{detail}</p>
        </div>
    )
}

/* Picker component */
function OptionPicker({ options, value, onChange }) {
    return (
        <div className="tt-picker">
            {options.map(o => (
                <button
                    key={o.id}
                    className={`tt-picker-btn ${value === o.id ? 'tt-picker-btn--active' : ''}`}
                    onClick={() => onChange(o.id)}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

/* Main component */
export default function TravelTrack() {
    const { profile } = useUserProfile()
    const { user }    = useContext(AuthContext)
    const hasData     = profile.grossIncome > 0

    const surplus  = calcNetSurplus(profile)
    const takeHome = calcTakeHome(profile.grossIncome, profile.raPercent, profile.otherIncome)
    const expenses = calcTotalExpenses(profile)

    /* Sidebar state */
    const [regionId,      setRegionId]      = useState('europe')
    const [styleId,       setStyleId]       = useState('midrange')
    const [durationId,    setDurationId]    = useState('2w')
    const [monthlyAmount, setMonthlyAmount] = useState(() => Math.max(500, Math.round(surplus * 0.25)))
    const [selectedYear,  setSelectedYear]  = useState(1)

    const region   = REGIONS.find(r => r.id === regionId)   || REGIONS[1]
    const style    = STYLES.find(s => s.id === styleId)     || STYLES[1]
    const duration = DURATIONS.find(d => d.id === durationId) || DURATIONS[0]

    /* Base trip cost */
    const tripCost = Math.round(region.baseCost * style.multiplier * duration.multiplier)

    /* Forex-adjusted cost: for international trips, add 2 years of rand depreciation (5% p.a.) */
    const fxCost = region.fxRisk
        ? Math.round(tripCost * Math.pow(1.05, 2))
        : tripCost

    /* Travel as % of surplus */
    const travelPct    = surplus > 0 ? Math.round((monthlyAmount / surplus) * 100) : 0
    const hasEmergency = (profile.bankBalance || 0) >= Math.round(expenses * 3)

    const projection = useMemo(() => buildProjection({ monthlyAmount }), [monthlyAmount])

    const milestones = useMemo(() => buildMilestones({
        profile, monthlyAmount, tripCost, fxCost, regionId, styleId, durationId,
        projection, surplus, expenses
    }), [profile, monthlyAmount, tripCost, fxCost, regionId, styleId, durationId, projection, surplus, expenses])

    const activeMilestone = milestones[selectedYear - 1]
    const y5 = projection[4]

    /* Micro-action progress */
    const { getCompleted, toggleAction } = useTrackProgress('travel')
    const progressMap = useMemo(() => {
        const map = {}
        ;[1,2,3,4,5].forEach(yr => {
            map[yr] = { done: getCompleted(yr).length, total: TRAVEL_ACTIONS[yr].length }
        })
        return map
    }, [getCompleted])

    /* Verdict */
    const verdictStatus = surplus <= 0 ? 'deficit'
        : !hasEmergency ? 'at-risk'
        : travelPct <= 40 ? 'on-track'
        : 'at-risk'

    const monthsToTrip = monthlyAmount > 0 ? Math.ceil(fxCost / monthlyAmount) : null

    if (!hasData) {
        return (
            <div className="pp-empty">
                <div className="pp-empty-inner">
                    <Icon name="studio" size={40} colour="var(--n-300)"/>
                    <h2>Set up your Money Snapshot first</h2>
                    <p>Your Travel Track is built from your actual surplus. Enter your income and expenses to see a personalised travel savings plan.</p>
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
                    <h1 className="page-title">{user?.name ? `${user.name}'s Travel Track` : 'Travel Track'}</h1>
                    <p className="page-subtitle">Save purposefully for travel experiences - without derailing your emergency fund, RA, or investment goals.</p>
                </div>
                <div className={`pp-verdict ${verdictStatus === 'on-track' ? 'pp-verdict--ok' : verdictStatus === 'at-risk' ? 'pp-verdict--warn' : 'pp-verdict--risk'}`}>
                    <Icon name={verdictStatus === 'on-track' ? 'ok' : 'warn'} size={14}/>
                    <div>
                        <strong>
                            {verdictStatus === 'on-track'
                                ? monthsToTrip ? `First trip in ${monthsToTrip} months` : 'Allocation on track'
                                : verdictStatus === 'at-risk'
                                    ? !hasEmergency ? 'Build emergency fund first' : 'Reduce travel allocation'
                                    : 'No investable surplus'}
                        </strong>
                        <span>
                            {verdictStatus !== 'deficit'
                                ? `${fmtZAR(y5.total)} in your fund after 5 years`
                                : 'Reduce expenses before allocating to travel'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="split-body">
                {/* LEFT - Inputs */}
                <div className="split-left">

                    {/* Destination */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="studio" size={13}/> Destination</p>
                        <div className="input-field">
                            <label>Region</label>
                            <OptionPicker options={REGIONS} value={regionId} onChange={setRegionId}/>
                            {region.fxRisk && (
                                <p className="input-hint">
                                    Costs in {region.currency}. Rand depreciation adds ~10% over 2 years to your target.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Trip details */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="target" size={13}/> Trip details</p>
                        <div className="input-field">
                            <label>Travel style</label>
                            <OptionPicker options={STYLES} value={styleId} onChange={setStyleId}/>
                        </div>
                        <div className="input-field">
                            <label>Duration</label>
                            <OptionPicker options={DURATIONS} value={durationId} onChange={setDurationId}/>
                        </div>
                    </div>

                    {/* Monthly savings */}
                    <div className="input-section">
                        <p className="input-section-title"><Icon name="savings" size={13}/> Monthly savings</p>
                        <div className="input-field">
                            <label>Amount per month</label>
                            <div className="input-prefix-wrap">
                                <span className="input-prefix">R</span>
                                <input
                                    type="number"
                                    value={monthlyAmount}
                                    onChange={e => setMonthlyAmount(Math.max(0, Number(e.target.value)))}
                                    min="0"
                                    step="250"
                                />
                            </div>
                            <p className="input-hint">Your surplus is {fmtZAR(surplus)}/month. Keep travel under 40% ({fmtZAR(Math.round(surplus * 0.4))}/month).</p>
                        </div>
                        {/* Derailment check */}
                        <DerailmentIndicator travelPct={travelPct} hasEmergency={hasEmergency}/>
                    </div>

                    {/* Key numbers */}
                    <div className="pp-key-numbers">
                        <p className="pp-key-numbers-title">Your numbers</p>
                        <div className="pp-key-row">
                            <span>Base trip cost</span>
                            <strong>{fmtZAR(tripCost)}</strong>
                        </div>
                        {region.fxRisk && (
                            <div className="pp-key-row">
                                <span>Forex-adjusted (2yr)</span>
                                <strong className="pp-warn">{fmtZAR(fxCost)}</strong>
                            </div>
                        )}
                        <div className="pp-key-row">
                            <span>Months to first trip</span>
                            <strong>{monthsToTrip ? `${monthsToTrip} months` : '-'}</strong>
                        </div>
                        <div className="pp-key-divider"/>
                        {projection.map(yr => (
                            <div key={yr.year} className="pp-key-row">
                                <span>Year {yr.year}</span>
                                <strong>{fmtZAR(yr.total)}</strong>
                            </div>
                        ))}
                        <div className="pp-key-row pp-key-row--total">
                            <span>Interest earned (5yr)</span>
                            <strong className="pp-ok">{fmtZAR(y5.interest)}</strong>
                        </div>
                    </div>

                    {/* Savings growth chart */}
                    <div className="gi-chart-card">
                        <p className="pp-key-numbers-title">Fund growth</p>
                        <ResponsiveContainer width="100%" height={130}>
                            <AreaChart data={projection} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="travelGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="var(--absa-red)" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="var(--absa-red)" stopOpacity={0.02}/>
                                    </linearGradient>
                                    <linearGradient id="interestGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--n-400)' }} axisLine={false} tickLine={false}/>
                                <YAxis hide/>
                                <Tooltip content={<TravelTooltip/>} cursor={{ stroke: 'var(--n-200)', strokeWidth: 1 }}/>
                                <Area type="monotone" dataKey="contributed" stackId="1" stroke="var(--absa-red)"    fill="url(#travelGrad)"   strokeWidth={2}/>
                                <Area type="monotone" dataKey="interest"    stackId="1" stroke="#22c55e"            fill="url(#interestGrad)" strokeWidth={2}/>
                            </AreaChart>
                        </ResponsiveContainer>
                        <div className="gi-chart-legend">
                            <span><span className="gi-legend-dot" style={{ background: 'var(--absa-red)' }}/>Saved</span>
                            <span><span className="gi-legend-dot" style={{ background: '#22c55e' }}/>Interest</span>
                        </div>
                    </div>
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
                        key={`${selectedYear}-${regionId}-${styleId}-${durationId}`}
                        milestone={activeMilestone}
                        actions={TRAVEL_ACTIONS[selectedYear]}
                        completed={getCompleted(selectedYear)}
                        onToggle={toggleAction}
                    />
                </div>
            </div>
        </>
    )
}
