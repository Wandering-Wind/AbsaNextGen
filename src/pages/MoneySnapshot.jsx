import { useState } from 'react'
import { useUserProfile } from '../context/UserProfileContext'
import { 
    calcTakeHome, calcNetSurplus, calcHealthScore, calcSurplusStatus,
    calcSurplusMessage, calcMedicalCredit, calcTfsaHeadroom, calcDTI,
    calcEmergencyMonths, calcTotalExpenses, fmtZAR, SA,
} from '../components/financialCalcs'
import "../styles/MoneySnapshot.css";
import "../styles/TracksStudioShared.css";

import HealthGauge   from '../components/money_snapshot/HealthGauge'
import DonutChart    from '../components/money_snapshot/DonutChart'
import WaterfallBar  from '../components/money_snapshot/WaterfallBar'
import ProgressBar   from '../components/money_snapshot/ProgressBar'

export default function MoneySnapshot() {
    const { profile, updateProfile, resetProfile } = useUserProfile()
    const [learnOpen, setLearnOpen] = useState(false)

    const raAmount      = profile.grossIncome * (Math.min(profile.raPercent, 27.5) / 100)
    const taxable       = profile.grossIncome - raAmount
    const payeAmount    = taxable * SA.PAYE_RATE
    const takeHome      = calcTakeHome(profile.grossIncome, profile.raPercent)
    const totalExpenses = calcTotalExpenses(profile)
    const netSurplus    = calcNetSurplus(profile)
    const surplusStatus = calcSurplusStatus(profile)
    const surplusMsg    = calcSurplusMessage(profile)
    const health        = calcHealthScore(profile)
    const medCredit     = calcMedicalCredit(profile.medicalAid)
    const tfsaHeadroom  = calcTfsaHeadroom(profile.tfsaContribution)
    const dti           = calcDTI(profile)
    const emergMonths   = Number(calcEmergencyMonths(profile))
    const tfsaAnnual    = (profile.tfsaContribution || 0) * 12
    const tfsaPct       = Math.min(100, Math.round((tfsaAnnual / SA.TFSA_ANNUAL_CAP) * 100))

    //Donut chart segments stuff
    const expenseSegments = [
        { label: 'Rent / bond',   value: profile.rent || 0,              colour: '#6366f1' },
        { label: 'Utilities',     value: profile.utilities || 0,          colour: '#06b6d4' },
        { label: 'Medical aid',   value: profile.medicalAid || 0,         colour: '#ec4899' },
        { label: 'Car payment',   value: profile.carPayment || 0,         colour: '#f59e0b' },
        { label: 'Loans',         value: profile.loanPayment || 0,        colour: '#ef4444' },
        { label: 'Entertainment', value: profile.entertainment || 0,      colour: '#8b5cf6' },
        { label: 'TFSA savings',  value: profile.tfsaContribution || 0,   colour: '#22c55e' },
    ]

    //Emergency fund progress bar marker thing (markers at 1, 3, and 6 months so the user sees where they stand)
    const emergencyMarkers = [
        { pct: (1 / 6) * 100, label: '1 month' },
        { pct: (3 / 6) * 100, label: '3 months' },
        { pct: 100,           label: '6 months' },
    ]
    const emergencyPct = Math.min(100, (emergMonths / 6) * 100)

    //Input handling ro update the values instantly
    function handleChange(field, rawValue) {
        const value = rawValue === '' ? 0 : Number(rawValue)
        updateProfile(field, value)
    }

    return (
        <>
            {/* Page header — inside the container, never scrolls */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Money Snapshot</h1>
                    <p className="page-subtitle">
                        Your customizable financial dashboard. Fill in your details
                        on the left — every tile and chart updates instantly as you type.
                    </p>
                </div>
                <button onClick={resetProfile} className="reset-btn">
                    Reset to defaults
                </button>
            </div>

            {/* Split body — this IS the container's inner layout */}
            <div className="split-body">

                {/* LEFT 1/4 — inputs, scrolls independently */}
                <aside className="split-left">
                    <section className="input-section">
                        <h2 className="input-section-title">💰 Income</h2>
                        <InputField
                            label="Gross monthly salary"
                            value={profile.grossIncome}
                            onChange={val => handleChange('grossIncome', val)}
                            tooltip="Your salary before any deductions"
                        />
                        <SliderField
                            label={`RA contribution: ${profile.raPercent}%`}
                            value={profile.raPercent}
                            onChange={val => handleChange('raPercent', val)}
                            min={0} max={27} step={0.5}
                            tooltip="Up to 27.5% of income is tax-deductible in SA"
                        />
                        <div className="inline-calc">
                            RA deduction: {fmtZAR(raAmount)}/month · saves ~{fmtZAR(raAmount * SA.PAYE_RATE)} in PAYE
                        </div>
                    </section>

                    <section className="input-section">
                        <h2 className="input-section-title">🏠 Fixed Costs</h2>
                        <InputField label="Rent / bond payment"   value={profile.rent}       onChange={val => handleChange('rent', val)}       tooltip="Sandton 1-bed averages R15 000–R25 000/month" />
                        <InputField label="Utilities"              value={profile.utilities}   onChange={val => handleChange('utilities', val)}   tooltip="Water, electricity, internet" />
                        <InputField label="Medical aid premium"    value={profile.medicalAid}  onChange={val => handleChange('medicalAid', val)}  tooltip="Unlocks your SARS R364/month tax credit" />
                    </section>

                    <section className="input-section">
                        <h2 className="input-section-title">💳 Debt Payments</h2>
                        <InputField label="Car payment"   value={profile.carPayment}  onChange={val => handleChange('carPayment', val)}  tooltip="Vehicle finance typically 10–12% p.a. in SA" />
                        <InputField label="Other loans"   value={profile.loanPayment} onChange={val => handleChange('loanPayment', val)} tooltip="Student loans, personal loans, etc." />
                    </section>

                    <section className="input-section">
                        <h2 className="input-section-title">🎯 Savings & Lifestyle</h2>
                        <InputField label="Monthly TFSA contribution" value={profile.tfsaContribution} onChange={val => handleChange('tfsaContribution', val)} tooltip="Annual cap is R46 000. No tax on growth." />
                        <InputField label="Bank balance (emergency)"  value={profile.bankBalance}       onChange={val => handleChange('bankBalance', val)}       tooltip="Goal: 3–6 months of total expenses." />
                        <InputField label="Entertainment & dining"    value={profile.entertainment}     onChange={val => handleChange('entertainment', val)}     tooltip="Where lifestyle creep hides." />
                    </section>
                </aside>

                {/* RIGHT 3/4 — results, scrolls independently */}
                <div className="split-right">

                    <div className={`surplus-alert surplus-alert--${surplusStatus}`}>
                        <strong>
                            {surplusStatus === 'surplus'   && '✅ On track'}
                            {surplusStatus === 'breakeven' && '⚡ Breaking even'}
                            {surplusStatus === 'deficit'   && '🚨 Spending more than you earn'}
                        </strong>
                        <p>{surplusMsg}</p>
                    </div>

                    <div className="result-row result-row--two">
                        <div className="result-card result-card--center">
                            <h3>Financial Health</h3>
                            <HealthGauge pct={health.pct} label={health.label} status={health.status} />
                            <div className="score-breakdown">
                                <ScoreBar label="Savings rate"   score={health.savings}   max={10} />
                                <ScoreBar label="Debt ratio"     score={health.debt}       max={10} />
                                <ScoreBar label="Emergency fund" score={health.emergency}  max={10} />
                            </div>
                        </div>

                        <div className="result-card">
                            <h3>Income Breakdown</h3>
                            <WaterfallBar
                                gross={profile.grossIncome}
                                raAmount={raAmount}
                                payeAmount={payeAmount}
                                expenses={totalExpenses}
                                surplus={netSurplus}
                            />
                            <div className="waterfall-summary">
                                <div className="summary-row">
                                    <span>Take-home pay</span>
                                    <strong>{fmtZAR(takeHome)}</strong>
                                </div>
                                <div className="summary-row">
                                    <span>Total expenses</span>
                                    <strong>{fmtZAR(totalExpenses)}</strong>
                                </div>
                                <div className={`summary-row summary-row--${surplusStatus}`}>
                                    <span>Net surplus</span>
                                    <strong>{fmtZAR(netSurplus)}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="result-row result-row--two">
                        <div className="result-card">
                            <h3>Expense Breakdown</h3>
                            <DonutChart segments={expenseSegments} />
                        </div>

                        <div className="result-card">
                            <h3>SA-Specific Insights</h3>
                            <div className="sa-insight">
                                <span className="sa-insight-label">🏥 SARS Medical Credit</span>
                                {profile.medicalAid > 0 ? (
                                    <span className="sa-insight-value">
                                        {fmtZAR(medCredit)}/month · {fmtZAR(medCredit * 12)}/year back
                                    </span>
                                ) : (
                                    <span className="sa-insight-empty">Enter medical aid to see credit</span>
                                )}
                            </div>

                            <div className={`sa-insight ${dti > 36 ? 'sa-insight--warn' : ''}`}>
                                <span className="sa-insight-label">💳 Debt-to-Income</span>
                                <span className="sa-insight-value">{dti}%
                                    {dti === 0 && ' — no debt ✅'}
                                    {dti > 0 && dti <= 36 && ' — bond-ready ✅'}
                                    {dti > 36 && dti <= 50 && ' — above 36% ⚠️'}
                                    {dti > 50 && ' — critical 🚨'}
                                </span>
                            </div>

                            <div className="sa-insight">
                                <span className="sa-insight-label">📈 TFSA ({tfsaPct}% of cap)</span>
                                <ProgressBar value={tfsaPct} colour="#22c55e" />
                                <span className="sa-insight-sub">
                                    {fmtZAR(tfsaAnnual)}/year of R46 000 cap ·{' '}
                                    {tfsaHeadroom > 0 ? `${fmtZAR(tfsaHeadroom)} headroom` : 'Cap reached'}
                                </span>
                            </div>

                            <div className="sa-insight">
                                <span className="sa-insight-label">
                                    🛡️ Emergency Fund — {emergMonths} months covered
                                </span>
                                <ProgressBar
                                    value={emergencyPct}
                                    colour={emergMonths >= 3 ? '#22c55e' : emergMonths >= 1 ? '#f59e0b' : '#ef4444'}
                                    markers={emergencyMarkers}
                                />
                                <span className="sa-insight-sub">
                                    {emergMonths < 1  && '🚨 Less than 1 month — build this before investing'}
                                    {emergMonths >= 1 && emergMonths < 3 && '⚠️ Below 3-month target'}
                                    {emergMonths >= 3 && emergMonths < 6 && '✅ In range — keep building'}
                                    {emergMonths >= 6 && '✅ Fully funded — redirect surplus to investments'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="learn-section">
                        <button className="learn-toggle" onClick={() => setLearnOpen(prev => !prev)}>
                            📚 {learnOpen ? 'Hide' : 'Show'} financial concepts explained
                        </button>
                        {learnOpen && (
                            <div className="learn-grid">
                                <LearnCard term="Net Surplus"             explanation="Money left after all expenses are paid from your take-home. Aim for 20%+. A negative number means you are spending more than you earn — reduce costs before investing." />
                                <LearnCard term="PAYE"                    explanation="Pay As You Earn — SA's income tax system. Your employer deducts it monthly. RA contributions reduce your taxable income, lowering your PAYE bill." />
                                <LearnCard term="Retirement Annuity (RA)" explanation="Contributions up to 27.5% of income are tax-deductible. Grows tax-free. Accessible from age 55. One of the most powerful tax tools for SA earners." />
                                <LearnCard term="TFSA"                    explanation="Tax Free Savings Account. R46 000/year cap (R500 000 lifetime). Zero tax on growth, interest, or withdrawals. Ideal for medium-term goals." />
                                <LearnCard term="SARS Medical Credit"     explanation="R364/month off your tax bill for being a primary medical aid member (2026/27). A direct rand-for-rand credit — more powerful than a deduction." />
                                <LearnCard term="Debt-to-Income (DTI)"    explanation="Total monthly debt payments ÷ gross income. Banks require below 36% for bond approval. Above 50% means you are over-leveraged." />
                                <LearnCard term="Emergency Fund"          explanation="3–6 months of expenses in a liquid account. Your financial airbag. Without it, one unexpected bill forces you into expensive debt." />
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </>
    )
}

// Sub-components

function InputField({ label, value, onChange, tooltip, min = 0, max }) {
    return (
        <div className="input-field">
            <label>
                {label}
                {tooltip && <span className="tooltip" title={tooltip}> ℹ</span>}
            </label>
            <div className="input-prefix-wrap">
                <span className="input-prefix">R</span>
                <input
                    type="number"
                    // Show empty string when value is 0 so user doesn't get "01234"
                    value={value === 0 ? '' : value}
                    placeholder="0"
                    min={min}
                    max={max}
                    onChange={e => onChange(e.target.value)}
                />
            </div>
        </div>
    )
}

function SliderField({ label, value, onChange, min, max, step, tooltip }) {
    return (
        <div className="input-field">
            <label>
                {label}
                {tooltip && <span className="tooltip" title={tooltip}> ℹ</span>}
            </label>
            <input
                type="range"
                value={value}
                min={min} max={max} step={step}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    )
}

function ScoreBar({ label, score, max }) {
    const pct = Math.round((score / max) * 100)
    const colour = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
    return (
        <div className="score-bar">
            <span className="score-bar-label">{label}</span>
            <div className="score-bar-track">
                <div
                    className="score-bar-fill"
                    style={{ width: `${pct}%`, background: colour }}
                />
            </div>
            <span className="score-bar-value">{score.toFixed(1)}/{max}</span>
        </div>
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

/*
const status  = calcSurplusStatus(profile)   // 'surplus' | 'breakeven' | 'deficit'
const message = calcSurplusMessage(profile)

// Conditional rendering based on status
{status === 'deficit' && (
    <div className="alert alert--danger">
         {message}
    </div>
)}

{status === 'breakeven' && (
    <div className="alert alert--warning">
         {message}
    </div>
)}

{status === 'surplus' && (
    <div className="alert alert--success">
         {message}
    </div>
)}
*/

/*
"The page has two sides. The left side is a form - when the user types 
into any field, handleChange converts the string to a number and calls 
updateProfile from UserProfileContext. 
That updates the shared profile state."
"The right side never waits for a button press. Because it reads 
directly from the context, every time profile changes React re-renders 
he component and all the calc functions run again with the new values - 
so the health score, surplus, and all tiles update instantly."
"The deficit logic works through calcSurplusStatus. That function looks 
at the result of calcNetSurplus - if it's below negative R500, it 
returns 'deficit'. The component uses that string to conditionally 
apply a CSS class and show a warning message. So if you enter a salary 
of R20 000 but rent of R25 000, the page immediately shows a red deficit 
alert."
"The health score adds three sub-scores - savings rate, debt ratio, 
and emergency fund coverage - each scored 0 to 10, then maps the total
 to a percentage. The marker can test edge cases: zero income shows 
 everything at zero, very high debt pushes DTI above 50% and triggers 
 the warning, low bank balance drops the emergency score."
*/