import { useState } from 'react'
import { useUserProfile } from '../context/UserProfileContext'
import "../styles/pages/MoneySnapshot.css";
import "../styles/shared/TracksStudioShared.css";
import Icon from "../components/Icons";
import LearnCard from "../components/LearnCard";
import {
            calcTakeHome, calcNetSurplus, calcHealthScore, calcSurplusStatus,
            calcSurplusMessage, calcMedicalCredit, calcTfsaHeadroom, calcDTI,
            calcEmergencyMonths, calcTotalExpenses, buildSnapshotNarrative,
            fmtZAR, SA,
        } from '../components/financialCalcs'

import HealthGauge   from '../components/money_snapshot/HealthGauge'
import DonutChart    from '../components/money_snapshot/DonutChart'
import WaterfallBar  from '../components/money_snapshot/WaterfallBar'
import ProgressBar   from '../components/money_snapshot/ProgressBar'
import Tooltip       from '../components/Tooltip'
import { FormattedNumberInput } from '../components/FormattedInput'

export default function MoneySnapshot() {
    const { profile, updateProfile, resetProfile } = useUserProfile()
    const [learnOpen, setLearnOpen] = useState(false)

    const otherIncome   = profile.otherIncome || []
    const otherTotal    = otherIncome.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
    const raAmount      = (profile.grossIncome + otherTotal) * (Math.min(profile.raPercent, 27.5) / 100)
    const taxable       = profile.grossIncome + otherTotal - raAmount
    const payeAmount    = taxable * SA.PAYE_RATE   // rough display only - actual PAYE uses brackets in calcTakeHome
    const takeHome      = calcTakeHome(profile.grossIncome, profile.raPercent, otherIncome)
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
    const narrative     = buildSnapshotNarrative(profile, takeHome)

    //Donut chart segments stuff
    const expenseSegments = [
        { label: 'Rent / bond',   value: profile.rent || 0,              colour: '#B91C1C' },
        { label: 'Utilities',     value: profile.utilities || 0,          colour: '#4B5563' },
        { label: 'Medical aid',   value: profile.medicalAid || 0,         colour: '#9D174D' },
        { label: 'Car payment',   value: profile.carPayment || 0,         colour: '#92400E' },
        { label: 'Loans',         value: profile.loanPayment || 0,        colour: '#1F2937' },
        { label: 'Entertainment', value: profile.entertainment || 0,      colour: '#5B21B6' },
        { label: 'TFSA savings',  value: profile.tfsaContribution || 0,   colour: '#065F46' },
    ]

    //Emergency fund progress bar marker thing (markers at 1, 3, and 6 months so the user sees where they stand)
    const emergencyMarkers = [
        { pct: (1 / 6) * 100, label: '1 month' },
        { pct: (3 / 6) * 100, label: '3 months' },
        { pct: 100,           label: '6 months' },
    ]
    const emergencyPct = Math.min(100, (emergMonths / 6) * 100)

    const alertStatus = (() => {
        if (surplusStatus === 'deficit') return 'deficit'
        if (surplusStatus === 'breakeven') return 'breakeven'
        if (health.status === 'struggling') return 'needs-attention'
        return 'surplus'
    })()

    const alertMessage = (() => {
        if (alertStatus === 'deficit') return surplusMsg
        if (alertStatus === 'breakeven') return surplusMsg
        if (alertStatus === 'needs-attention')
            return `You have leftover income, but your savings rate, debt load, or emergency fund needs attention. Check the health scores below.`
        return surplusMsg
    })()

    //Input handling ro update the values instantly
    function handleChange(field, rawValue) {
        const value = rawValue === '' ? 0 : Number(rawValue)
        updateProfile(field, value)
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Money Snapshot</h1>
                    <p className="page-subtitle">
                        Your customizable financial dashboard. Fill in your details
                        on the left - every tile and chart updates instantly as you type.
                    </p>
                </div>
                <button onClick={resetProfile} className="reset-btn">
                    Reset to defaults
                </button>
            </div>

            <div className="split-body">

                <aside className="split-left">
                    <section className="input-section">
                        <h2 className="input-section-title">
                            <Icon name="income" size={17} /> Income
                        </h2>

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
                        <h2 className="input-section-title"><Icon name="fixed-costs" size={17} /> Fixed Costs</h2>
                        <InputField label="Rent / bond payment"   value={profile.rent}       onChange={val => handleChange('rent', val)}       tooltip="Sandton 1-bed averages R15 000-R25 000/month" />
                        <InputField label="Utilities"              value={profile.utilities}   onChange={val => handleChange('utilities', val)}   tooltip="Water, electricity, internet" />
                        <InputField label="Medical aid premium"    value={profile.medicalAid}  onChange={val => handleChange('medicalAid', val)}  tooltip="Unlocks your SARS R364/month tax credit" />
                    </section>

                    <section className="input-section">
                        <h2 className="input-section-title"> <Icon name="debt" size={17} /> Debt Payments</h2>
                        <InputField label="Car payment"   value={profile.carPayment}  onChange={val => handleChange('carPayment', val)}  tooltip="Vehicle finance typically 10-12% p.a. in SA" />
                        <InputField label="Other loans"   value={profile.loanPayment} onChange={val => handleChange('loanPayment', val)} tooltip="Student loans, personal loans, etc." />
                    </section>

                    <section className="input-section">
                        <h2 className="input-section-title"> <Icon name="savings" size={17} /> Savings & Lifestyle</h2>
                        <InputField label="Monthly TFSA contribution" value={profile.tfsaContribution} onChange={val => handleChange('tfsaContribution', val)} tooltip="Annual cap is R46 000. No tax on growth." />
                        <InputField label="Bank balance (emergency)"  value={profile.bankBalance}       onChange={val => handleChange('bankBalance', val)}       tooltip="Goal: 3-6 months of total expenses." />
                        <InputField label="Entertainment & dining"    value={profile.entertainment}     onChange={val => handleChange('entertainment', val)}     tooltip="Where lifestyle creep hides." />
                    </section>
                </aside>

                <div className="split-right">
                <div className="snapshot-bento">

                    {/* Alert banner */}
                    <div className={`bento-full surplus-alert surplus-alert--${alertStatus === 'needs-attention' ? 'breakeven' : alertStatus}`}>
                        <strong>
                            {alertStatus === 'surplus'         && <><Icon name="ok"     size={16} /> On track</>}
                            {alertStatus === 'needs-attention' && <><Icon name="warn"   size={16} /> Surplus but gaps to fix</>}
                            {alertStatus === 'breakeven'       && <><Icon name="warn"   size={16} /> Breaking even</>}
                            {alertStatus === 'deficit'         && <><Icon name="danger" size={16} /> Spending more than you earn</>}
                        </strong>
                        <p>{alertMessage}</p>
                    </div>

                    {/* Position summary narrative */}
                    {narrative?.length > 0 && (
                        <SnapshotNarrative sentences={narrative} className="bento-full" />
                    )}

                    {/* Health gauge (1 of 3) */}
                    <div className="bento-1of3 result-card result-card--center">
                        <h3>Financial Health</h3>
                        <HealthGauge pct={health.pct} label={health.label} status={health.status} />
                        <div className="score-breakdown">
                            <ScoreBar label="Savings rate"   score={health.savings}   max={10} />
                            <ScoreBar label="Debt ratio"     score={health.debt}       max={10} />
                            <ScoreBar label="Emergency fund" score={health.emergency}  max={10} />
                        </div>
                    </div>

                    {/* Income waterfall (2 of 3) */}
                    <div className="bento-2of3 result-card">
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

                    {/* Expense donut (2 of 3) */}
                    <div className="bento-2of3 result-card">
                        <h3>Expense Breakdown</h3>
                        <DonutChart segments={expenseSegments} />
                    </div>

                    {/* SA-specific insights (1 of 3) */}
                    <div className="bento-1of3 result-card">
                        <h3>SA-Specific Insights</h3>
                        <div className="sa-insight">
                            <span className="sa-insight-label">
                                <Icon name="medical" size={17} /> SARS Medical Credit
                                <Tooltip text="R364/month direct tax reduction for being a primary medical aid member. A credit, not a deduction - it reduces your actual tax bill rand for rand, every month." />
                            </span>
                            {profile.medicalAid > 0 ? (
                                <span className="sa-insight-value">
                                    {fmtZAR(medCredit)}/month · {fmtZAR(medCredit * 12)}/year back
                                </span>
                            ) : (
                                <span className="sa-insight-empty">Enter medical aid to see credit</span>
                            )}
                        </div>

                        <div className={`sa-insight ${dti > 36 ? 'sa-insight--warn' : ''}`}>
                            <span className="sa-insight-label">
                                <Icon name="dti" size={19} /> Debt-to-Income
                                <Tooltip text="Total monthly debt payments divided by gross income. Banks require below 36% before approving a home loan. Above 50% means applications are typically declined." />
                            </span>
                            <span className="sa-insight-value">{dti}%
                                {dti === 0 && <> - <Icon name="ok"     size={17} /> no debt</>}
                                {dti > 0  && dti <= 36 && <> - <Icon name="ok"     size={17} /> bond-ready</>}
                                {dti > 36 && dti <= 50 && <> - <Icon name="warn"   size={17} /> above 36%</>}
                                {dti > 50 && <> - <Icon name="danger" size={17} /> critical</>}
                            </span>
                        </div>

                        <div className="sa-insight">
                            <span className="sa-insight-label">
                                <Icon name="tfsa" size={17} /> TFSA ({tfsaPct}% of cap)
                                <Tooltip text="Tax Free Savings Account. R46 000/year cap, R500 000 lifetime. Zero tax on all growth, interest, and withdrawals. The most tax-efficient savings vehicle available to SA investors." />
                            </span>
                            <ProgressBar value={tfsaPct} colour="#059669" />
                            <span className="sa-insight-sub">
                                {fmtZAR(tfsaAnnual)}/year of R46 000 cap{' '}
                                {tfsaHeadroom > 0 ? `· ${fmtZAR(tfsaHeadroom)} headroom` : '· Cap reached'}
                            </span>
                        </div>

                        <div className="sa-insight">
                            <span className="sa-insight-label">
                                <Icon name="emergency" size={17} /> Emergency Fund - {emergMonths} months
                                <Tooltip text="Your bank balance measured in months of total expenses. 3 months minimum, 6 months ideal. Below 1 month is a financial risk - one unexpected bill can push you into expensive debt." />
                            </span>
                            <ProgressBar
                                value={emergencyPct}
                                colour={emergMonths >= 3 ? 'var(--success)' : emergMonths >= 1 ? 'var(--warming)' : 'var(--danger)'}
                                markers={emergencyMarkers}
                            />
                            <span className="sa-insight-sub">
                                {emergMonths < 1  && <><Icon name="danger" size={17} /> Less than 1 month - build this before investing</>}
                                {emergMonths >= 1 && emergMonths < 3 && <><Icon name="warn" size={12} /> Below 3-month target</>}
                                {emergMonths >= 3 && emergMonths < 6 && <><Icon name="ok"   size={12} /> In range - keep building</>}
                                {emergMonths >= 6 && <><Icon name="ok"   size={17} /> Fully funded - redirect surplus to investments</>}
                            </span>
                        </div>
                    </div>

                    {/* Learn section */}
                    <div className="bento-full learn-section">
                        <button className="learn-toggle" onClick={() => setLearnOpen(prev => !prev)}>
                            <Icon name="learn" size={19} />
                            {learnOpen ? 'Hide' : 'Show'} financial concepts explained
                        </button>
                        {learnOpen && (
                            <div className="learn-grid">
                                <LearnCard term="Net Surplus"             explanation="Money left after all expenses are paid from your take-home. Aim for 20%+. A negative number means you are spending more than you earn - reduce costs before investing." />
                                <LearnCard term="PAYE"                    explanation="Pay As You Earn - SA's income tax system. Your employer deducts it monthly. RA contributions reduce your taxable income, lowering your PAYE bill." />
                                <LearnCard term="Retirement Annuity (RA)" explanation="Contributions up to 27.5% of income are tax-deductible. Grows tax-free. Accessible from age 55. One of the most powerful tax tools for SA earners." />
                                <LearnCard term="TFSA"                    explanation="Tax Free Savings Account. R46 000/year cap (R500 000 lifetime). Zero tax on growth, interest, or withdrawals. Ideal for medium-term goals." />
                                <LearnCard term="SARS Medical Credit"     explanation="R364/month off your tax bill for being a primary medical aid member (2026/27). A direct rand-for-rand credit - more powerful than a deduction." />
                                <LearnCard term="Debt-to-Income (DTI)"    explanation="Total monthly debt payments divided by gross income. Banks require below 36% for bond approval. Above 50% means you are over-leveraged." />
                                <LearnCard term="Emergency Fund"          explanation="3-6 months of expenses in a liquid account. Your financial safety net. Without it, one unexpected bill forces you into expensive debt." />
                            </div>
                        )}
                    </div>

                </div>
                </div>
            </div>
        </>
    )
}

function InputField({ label, value, onChange, tooltip }) {
    return (
        <div className="input-field">
            <label>
                {label}
                {tooltip && <Tooltip text={tooltip} />}
            </label>
            <FormattedNumberInput value={value} onChange={onChange} />
        </div>
    )
}

function SliderField({ label, value, onChange, min, max, step, tooltip }) {
    return (
        <div className="input-field">
            <label>
                {label}
                {tooltip && <Tooltip text={tooltip} />}
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

/* Narrative card which should render only when the user has entered income data */
function SnapshotNarrative({ sentences, className = '' }) {
    if (!sentences || sentences.length === 0) return null

    return (
        <div className={`narrative-card ${className}`.trim()}>
            <p className="narrative-eyebrow">Position Summary</p>
            <div className="narrative-grid">
                {sentences.map((s, i) => (
                    <div key={i} className={`narrative-tile narrative-tile--${s.sentiment}`}>
                        <p>{s.text}</p>
                    </div>
                ))}
            </div>
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

