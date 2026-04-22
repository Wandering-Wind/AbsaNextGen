import { useState } from 'react'
import { useUserProfile } from '../context/UserProfileContext'
import { 
    calcTakeHome, calcNetSurplus, calcHealthScore, calcSurplusStatus,
    calcSurplusMessage, calcMedicalCredit, calcTfsaHeadroom, calcDTI,
    calcEmergencyMonths, calcTotalExpenses, fmtZAR, SA,
} from '../components/financialCalcs'
import "../styles/MoneySnapshot.css";
import "../styles/TracksStudioShared.css";
import Icon from "../components/Icons";

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
                            <Icon name="income" size={17} glow /> Income
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
                        <h2 className="input-section-title"><Icon name="fixed-costs" size={17} glow /> Fixed Costs</h2>
                        <InputField label="Rent / bond payment"   value={profile.rent}       onChange={val => handleChange('rent', val)}       tooltip="Sandton 1-bed averages R15 000–R25 000/month" />
                        <InputField label="Utilities"              value={profile.utilities}   onChange={val => handleChange('utilities', val)}   tooltip="Water, electricity, internet" />
                        <InputField label="Medical aid premium"    value={profile.medicalAid}  onChange={val => handleChange('medicalAid', val)}  tooltip="Unlocks your SARS R364/month tax credit" />
                    </section>

                    <section className="input-section">
                        <h2 className="input-section-title"> <Icon name="debt" size={17} glow /> Debt Payments</h2>
                        <InputField label="Car payment"   value={profile.carPayment}  onChange={val => handleChange('carPayment', val)}  tooltip="Vehicle finance typically 10–12% p.a. in SA" />
                        <InputField label="Other loans"   value={profile.loanPayment} onChange={val => handleChange('loanPayment', val)} tooltip="Student loans, personal loans, etc." />
                    </section>

                    <section className="input-section">
                        <h2 className="input-section-title"> <Icon name="savings" size={17} glow /> Savings & Lifestyle</h2>
                        <InputField label="Monthly TFSA contribution" value={profile.tfsaContribution} onChange={val => handleChange('tfsaContribution', val)} tooltip="Annual cap is R46 000. No tax on growth." />
                        <InputField label="Bank balance (emergency)"  value={profile.bankBalance}       onChange={val => handleChange('bankBalance', val)}       tooltip="Goal: 3–6 months of total expenses." />
                        <InputField label="Entertainment & dining"    value={profile.entertainment}     onChange={val => handleChange('entertainment', val)}     tooltip="Where lifestyle creep hides." />
                    </section>
                </aside>

                <div className="split-right">

                    <div className={`surplus-alert surplus-alert--${surplusStatus}`}>
                        <strong>
                            {surplusStatus === 'surplus'   && <><Icon name="ok"     size={16} glow /> On track</>}
                            {surplusStatus === 'breakeven' && <><Icon name="warn"   size={16} glow /> Breaking even</>}
                            {surplusStatus === 'deficit'   && <><Icon name="danger" size={16} glow /> Spending more than you earn</>}
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
                                <span className="sa-insight-label">  <Icon name="medical" size={17} glow/>  SARS Medical Credit</span>
                                {profile.medicalAid > 0 ? (
                                    <span className="sa-insight-value">
                                        {fmtZAR(medCredit)}/month · {fmtZAR(medCredit * 12)}/year back
                                    </span>
                                ) : (
                                    <span className="sa-insight-empty">Enter medical aid to see credit</span>
                                )}
                            </div>

                            <div className={`sa-insight ${dti > 36 ? 'sa-insight--warn' : ''}`}>
                                <span className="sa-insight-label"><Icon name="dti" size={19} glow/> Debt-to-Income</span>
                                <span className="sa-insight-value">{dti}%
                                    {dti === 0 && <> — <Icon name="ok"     size={17} glow /> no debt</>}
                                    {dti > 0 && dti <= 36 && <> — <Icon name="ok"     size={17} glow /> bond-ready</>}
                                    {dti > 36 && dti <= 50 && <> — <Icon name="warn"   size={17} glow /> above 36%</>}
                                    {dti > 50 && <> — <Icon name="danger" size={17} glow /> critical</>}
                                </span>
                            </div>

                            <div className="sa-insight">
                                <span className="sa-insight-label"> <Icon name="tfsa" size={17} glow/> TFSA ({tfsaPct}% of cap)</span>
                                <ProgressBar value={tfsaPct} colour="#22c55e" />
                                <span className="sa-insight-sub">
                                    {fmtZAR(tfsaAnnual)}/year of R46 000 cap ·{' '}
                                    {tfsaHeadroom > 0 ? `${fmtZAR(tfsaHeadroom)} headroom` : 'Cap reached'}
                                </span>
                            </div>

                            <div className="sa-insight">
                                <span className="sa-insight-label">
                                    <Icon name="emergency" size={17} glow/> Emergency Fund - {emergMonths} months covered
                                </span>
                                <ProgressBar
                                    value={emergencyPct}
                                    colour={emergMonths >= 3 ? '#22c55e' : emergMonths >= 1 ? '#f59e0b' : '#ef4444'}
                                    markers={emergencyMarkers}
                                />
                                <span className="sa-insight-sub">
                                    {emergMonths < 1  && <><Icon name="danger" size={17} glow /> Less than 1 month — build this before investing</>}
                                    {emergMonths >= 1 && emergMonths < 3 && <><Icon name="warn" size={12} glow /> Below 3-month target</>}
                                    {emergMonths >= 3 && emergMonths < 6 && <><Icon name="ok"   size={12} glow /> In range — keep building</>}
                                    {emergMonths >= 6 && <><Icon name="ok"   size={17} glow /> Fully funded — redirect surplus to investments</>}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="learn-section">
                        <button className="learn-toggle" onClick={() => setLearnOpen(prev => !prev)}>
                            <Icon name="learn" size={19} glow />
                            {learnOpen ? 'Hide' : 'Show'} financial concepts explained
                        </button>
                        {learnOpen && (
                            <div className="learn-grid">
                                <LearnCard term="Net Surplus"             explanation="Money left after all expenses are paid from your take-home. Aim for 20%+. A negative number means you are spending more than you earn - reduce costs before investing." />
                                <LearnCard term="PAYE"                    explanation="Pay As You Earn - SA's income tax system. Your employer deducts it monthly. RA contributions reduce your taxable income, lowering your PAYE bill." />
                                <LearnCard term="Retirement Annuity (RA)" explanation="Contributions up to 27.5% of income are tax-deductible. Grows tax-free. Accessible from age 55. One of the most powerful tax tools for SA earners." />
                                <LearnCard term="TFSA"                    explanation="Tax Free Savings Account. R46 000/year cap (R500 000 lifetime). Zero tax on growth, interest, or withdrawals. Ideal for medium-term goals." />
                                <LearnCard term="SARS Medical Credit"     explanation="R364/month off your tax bill for being a primary medical aid member (2026/27). A direct rand-for-rand credit - more powerful than a deduction." />
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