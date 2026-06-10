import { Link } from 'react-router-dom'
import Icon from '../components/Icons'
import '../styles/pages/StudioHub.css'

const STUDIO_TOOLS = [
    {
        id:       'rent-vs-buy',
        path:     '/studio/rent-vs-buy',
        eyebrow:  'CALCULATOR',
        title:    'Rent vs Buy',
        description: 'Model whether buying or continuing to rent wins over your time horizon. Pulls in your bond rate and profile data to show you a personalised crossover year.',
        stats: [
            { label: 'Presets',  value: '3 scenarios'   },
            { label: 'Horizon',  value: 'Up to 20 years' },
            { label: 'Output',   value: 'Crossover year' },
        ],
        iconName: 'bank',
        cta:      'Open Rent vs Buy',
    },
    {
        id:       'car-vs-invest',
        path:     '/studio/car-vs-invest',
        eyebrow:  'CALCULATOR',
        title:    'Car vs Invest',
        description: 'See the true cost of financing a car versus putting those payments into your portfolio. Includes depreciation, running costs, balloon risk, and real opportunity cost.',
        stats: [
            { label: 'Presets',  value: '3 scenarios'      },
            { label: 'Horizon',  value: 'Up to 10 years'   },
            { label: 'Output',   value: 'Opportunity cost' },
        ],
        iconName: 'target',
        cta:      'Open Car vs Invest',
    },
    {
        id:       'offshore',
        path:     '/studio/offshore',
        eyebrow:  'SIMULATOR',
        title:    'Offshore Portfolio',
        description: 'Model how monthly rand contributions perform in USD-denominated assets across three exchange rate paths, benchmarked against JSE.',
        stats: [
            { label: 'FX paths',   value: '3 scenarios'     },
            { label: 'Benchmark',  value: 'JSE comparison'  },
            { label: 'Output',     value: 'ZAR + USD value' },
        ],
        iconName: 'tfsa',
        cta:      'Open Offshore Studio',
    },
]

export default function StudioHub() {
    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Money Studio</h1>
                    <p className="page-subtitle">
                        Decision tools for big money choices. Run your numbers, not someone else's.
                    </p>
                </div>
            </div>

            <div className="studio-hub-body">

                {/* What is Money Studio */}
                <div className="studio-hub-intro">
                    <p className="studio-hub-intro-eyebrow">What is Money Studio</p>
                    <p className="studio-hub-intro-text">
                        Each tool models a specific financial decision using your real profile data where
                        available. Adjust the inputs, stress-test your assumptions, and see the honest
                        numbers - not the marketing version.
                    </p>
                </div>

                {/* Tool cards */}
                <div className="studio-hub-grid">
                    {STUDIO_TOOLS.map(tool => (
                        <StudioCard key={tool.id} tool={tool} />
                    ))}
                </div>

            </div>
        </>
    )
}

function StudioCard({ tool }) {
    return (
        <div className="studio-hub-card">
            <div className="studio-hub-card-body">

                <div className="studio-hub-top">
                    <div className="studio-hub-icon">
                        <Icon name={tool.iconName} size={22} colour="var(--absa-red)" />
                    </div>
                    <span className="studio-hub-eyebrow">{tool.eyebrow}</span>
                </div>

                <div className="studio-hub-text-block">
                    <h2 className="studio-hub-title">{tool.title}</h2>
                    {/* Description hidden by default, shown on hover */}
                    <p className="studio-hub-description">{tool.description}</p>
                </div>

                {/* Stats always visible */}
                <div className="studio-hub-stats">
                    {tool.stats.map(s => (
                        <div key={s.label} className="studio-hub-stat">
                            <span className="studio-hub-stat-value">{s.value}</span>
                            <span className="studio-hub-stat-label">{s.label}</span>
                        </div>
                    ))}
                </div>

                <Link to={tool.path} className="studio-hub-cta">
                    {tool.cta}
                </Link>

            </div>
        </div>
    )
}
