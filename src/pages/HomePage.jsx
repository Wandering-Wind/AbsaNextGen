import React from "react";
import "../styles/HomePage.css";
import { Link } from "react-router-dom";
import { useUserProfile } from "../context/UserProfileContext";
import { calcHealthScore, calcNetSurplus, fmtZAR } from "../components/financialCalcs";

export default function HomePage() {
    const { profile } = useUserProfile()
    const health  = calcHealthScore(profile)
    const surplus = calcNetSurplus(profile)
    const hasData = profile.grossIncome > 0

    const healthColor = {
        'doing-well': '#4ade80',
        'coping':     '#fbbf24',
        'struggling': '#f87171',
    }[health.status] ?? 'rgba(255,255,255,0.5)'

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">ABSA NextGen Wealth Studio</h1>
                    <p className="page-subtitle">
                        A financial planning tool built specifically for young South African
                        professionals - simulate decisions, track goals, and understand
                        your money before you commit.
                    </p>
                </div>
            </div>

            <div className="home-body">

                {hasData && (
                    <div className="home-status-bar">
                        <div className="home-status-item">
                            <span className="home-status-label">Financial Health</span>
                            <span className="home-status-value" style={{ color: healthColor }}>
                                {health.pct}% - {health.label}
                            </span>
                        </div>
                        <div className="home-status-divider" />
                        <div className="home-status-item">
                            <span className="home-status-label">Monthly Surplus</span>
                            <span className="home-status-value"
                                style={{ color: surplus >= 0 ? '#4ade80' : '#f87171' }}>
                                {fmtZAR(surplus)}
                            </span>
                        </div>
                        <div className="home-status-divider" />
                        <div className="home-status-item">
                            <span className="home-status-label">Gross Income</span>
                            <span className="home-status-value">
                                {fmtZAR(profile.grossIncome)}/month
                            </span>
                        </div>
                    </div>
                )}

                {/* ── Feature cards ── */}
                <div className="home-feature-grid">

                    <Link to="/dashboard" className="home-feature-card">
                        <div className="home-feature-card-header">
                            <span className="home-feature-icon">📊</span>
                            <span className="home-feature-tag">Start here</span>
                        </div>
                        <h2>Money Snapshot</h2>
                        <p>
                            Enter your gross salary, rent, medical aid, debts, and savings.
                            Instantly see your take-home pay after PAYE and RA deductions,
                            your net surplus, and a financial health score broken down across
                            savings rate, debt ratio, and emergency fund coverage.
                        </p>
                        <ul className="home-feature-list">
                            <li>Health score 0-100% with breakdown</li>
                            <li>SARS medical tax credit (R364/month)</li>
                            <li>TFSA annual cap tracker</li>
                            <li>Expense donut + income waterfall</li>
                        </ul>
                        <span className="home-feature-cta">Go to Snapshot →</span>
                    </Link>

                    <Link to="/tracks/property" className="home-feature-card">
                        <div className="home-feature-card-header">
                            <span className="home-feature-icon">🏠</span>
                            <span className="home-feature-tag home-feature-tag--purple">5-year plan</span>
                        </div>
                        <h2>Strategy Tracks</h2>
                        <p>
                            Follow a personalised 5-year financial roadmap tailored to
                            your goals. The First Property Path walks you through emergency
                            fund, deposit savings, bond pre-approval, and purchase - with
                            milestones that update based on your actual income and surplus.
                        </p>
                        <ul className="home-feature-list">
                            <li>First Property Path (deposit to bond)</li>
                            <li>Global Investing (JSE + offshore)</li>
                            <li>Travel Track (TFSA travel fund)</li>
                            <li>Live personalised recommendations</li>
                        </ul>
                        <span className="home-feature-cta">Start a Track →</span>
                    </Link>

                    <Link to="/studio/rent-vs-buy" className="home-feature-card">
                        <div className="home-feature-card-header">
                            <span className="home-feature-icon">🧪</span>
                            <span className="home-feature-tag home-feature-tag--teal">Simulate</span>
                        </div>
                        <h2>Money Studio</h2>
                        <p>
                            Run "what-if" simulations before committing to major decisions.
                            Compare buying vs renting in Johannesburg, car finance vs
                            investing the difference, and local vs offshore portfolios -
                            with live charts and plain-English verdicts.
                        </p>
                        <ul className="home-feature-list">
                            <li>Rent vs Buy (Johannesburg rates)</li>
                            <li>Car Finance vs Invest the difference</li>
                            <li>Local vs Offshore portfolio</li>
                            <li>Year-by-year net worth charts</li>
                        </ul>
                        <span className="home-feature-cta">Open Studio →</span>
                    </Link>

                </div>

                {/* ── SA parameters strip ── */}
                <div className="home-sa-strip">
                    <span className="home-sa-strip-label">
                        SA parameters used across all features
                    </span>
                    <div className="home-sa-items">
                        {[
                            { value: '10.25%',      label: 'Prime Rate' },
                            { value: 'R46 000',     label: 'TFSA Annual Cap' },
                            { value: 'R364/month',  label: 'Medical Tax Credit' },
                            { value: '27.5%',       label: 'RA Deduction Cap' },
                            { value: '~11% p.a.',   label: 'JSE Historical Return' },
                            { value: '~6% p.a.',    label: 'JHB Property Growth' },
                        ].map(item => (
                            <div key={item.label} className="home-sa-item">
                                <span className="home-sa-value">{item.value}</span>
                                <span className="home-sa-label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </>
    )
}