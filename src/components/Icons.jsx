import {
    Wallet, Home, FlaskConical, BarChart3, CreditCard,
    Target, ShieldCheck, TrendingUp, BookOpen, ChevronDown,
    ChevronUp, CheckCircle, AlertTriangle, AlertCircle,
    Lightbulb, Calendar, Heart, Siren, Landmark, 
    PiggyBank, Scale, Map
} from 'lucide-react'

const ICON_MAP = {
    income:         Wallet,
    'fixed-costs':  Home,
    debt:           CreditCard,
    savings:        Target,

    //SA Insight labels
    medical:        Heart,
    dti:            Scale,
    tfsa:           TrendingUp,
    emergency:      ShieldCheck,

    //Feature cards — HomePage
    snapshot:       BarChart3,
    tracks:         Map,
    studio:         FlaskConical,

    learn:          BookOpen,

    //Milestone
    nudge:          Lightbulb,
    target:         Target,

    // Status / alerts
    ok:             CheckCircle,
    warn:           AlertTriangle,
    danger:         AlertCircle,
    alarm:          Siren,

    //Verdict
    'buy-wins':     Home,
    'rent-wins':    TrendingUp,

    year:           Calendar,

    //Winner column
    'win-buy':      Home,
    'win-rent':     TrendingUp,

    //Savings & bank
    bank:           Landmark,
    piggy:          PiggyBank,
}

const GLOW_MAP = {
    ok:       'var(--success)',
    warn:     'var(--warning)',
    danger:   'var(--danger)',
    alarm:    'var(--danger)',
    medical:  'var(--p-100)',
    dti:      'var(--p-100)',
    tfsa:     'var(--success)',
    emergency:'var(--p-100)',
    learn:    'var(--p-100)',
    nudge:    'var(--warning)',
    target:   'var(--p-100)',
    snapshot: 'var(--p-100)',
    tracks:   'var(--p-100)',
    studio:   '#7dd3fc',
    'buy-wins':'var(--p-100)',
    'rent-wins':'var(--success)',
}

export default function Icon({ name, size = 16, glow = false, colour, className = '' }) {
    const Component = ICON_MAP[name]
    if (!Component) return null

    const glowColour = colour ?? GLOW_MAP[name] ?? 'var(--p-100)'
    const iconColour = colour ?? glowColour

    const style = glow
        ? { filter: `drop-shadow(0 0 6px ${glowColour}) drop-shadow(0 0 2px ${glowColour})` }
        : {}

    return (
        <Component
            size={size}
            color={iconColour}
            strokeWidth={1.75}
            style={style}
            className={`app-icon ${className}`}
        />
    )
}