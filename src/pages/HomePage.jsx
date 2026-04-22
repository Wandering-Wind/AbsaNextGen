import React from "react";
// import HomePage from "../styles/HomePage.css"
import { Link } from "react-router-dom";

export default function HomePage() {
    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Welcome back</h1>
                    <p className="page-subtitle">
                        Your financial command centre. Where do you want to go today?
                    </p>
                </div>
            </div>

            <div className="home-body">
                <div className="result-row result-row--three">

                    <div className="result-card">
                        <h3>Money Snapshot</h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-sm)', marginBottom: '1rem', lineHeight: 1.6 }}>
                            View your financial health and net surplus in real time.
                        </p>
                        <Link to="/dashboard" style={{ color: 'var(--p-100)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                            Go to Snapshot →
                        </Link>
                    </div>

                    <div className="result-card">
                        <h3>Strategy Tracks</h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-sm)', marginBottom: '1rem', lineHeight: 1.6 }}>
                            Follow a structured 5-year roadmap toward property, investing, or travel.
                        </p>
                        <Link to="/tracks/property" style={{ color: 'var(--p-100)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                            Start a Track →
                        </Link>
                    </div>

                    <div className="result-card">
                        <h3>Money Studio</h3>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 'var(--text-sm)', marginBottom: '1rem', lineHeight: 1.6 }}>
                            Simulate rent vs buy, car vs invest, and more — before you commit.
                        </p>
                        <Link to="/studio/rent-vs-buy" style={{ color: 'var(--p-100)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                            Open Studio →
                        </Link>
                    </div>

                </div>
            </div>
        </>
    )
}
