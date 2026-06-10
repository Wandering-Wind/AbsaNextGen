import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useUserProfile } from './UserProfileContext'
import {
    calcNetSurplus,
    calcDTI,
    calcEmergencyMonths,
    calcHealthScore,
    fmtZAR,
    SA,
} from '../components/financialCalcs'

const NudgeContext = createContext()

/* localStorage key for dismissed nudge IDs */
const DISMISSED_KEY = 'absa_dismissed_nudges'


function computeNudges(profile) {
    if (!profile || profile.grossIncome === 0) return []

    const nudges          = []
    const surplus         = calcNetSurplus(profile)
    const dti             = calcDTI(profile)
    const emergencyMonths = parseFloat(calcEmergencyMonths(profile))
    const health          = calcHealthScore(profile)
    const tfsaMonthly     = profile.tfsaContribution || 0
    const tfsaMaxMonthly  = SA.TFSA_ANNUAL_CAP / 12   /* ~R3 833/month */

    /* Alert tier (red would be priority, fix the layout since the whole colour scheme is red, priority 1-3) */

    if (surplus < -500) {
        nudges.push({
            id:       'deficit-active',
            type:     'alert',
            icon:     'alarm',
            priority: 1,
            title:    'Spending exceeds income',
            body:     `Your expenses outpace your take-home by ${fmtZAR(Math.abs(surplus))} this month. Address this before any wealth-building can begin.`,
        })
    }

    if (dti > 50) {
        nudges.push({
            id:       'dti-critical',
            type:     'alert',
            icon:     'danger',
            priority: 2,
            title:    'Debt load is critical',
            body:     `Your DTI is at ${dti}%. Lenders typically decline applications above 50%. Clearing high-interest debt is the first move before everything else.`,
        })
    } else if (dti > 36) {
        nudges.push({
            id:       'dti-warning',
            type:     'alert',
            icon:     'warn',
            priority: 3,
            title:    `DTI at ${dti}% - above bond threshold`,
            body:     `Banks want your debt-to-income ratio under 36% before approving a home loan. You are ${dti - 36} points above that line right now.`,
        })
    }

    if (emergencyMonths < 1 && profile.bankBalance >= 0) {
        nudges.push({
            id:       'emergency-none',
            type:     'alert',
            icon:     'emergency',
            priority: 2,
            title:    'No emergency buffer',
            body:     `You have less than one month of expenses saved. A single unexpected bill could push you into debt. Build this before anything else.`,
        })
    }

    /* Reminder tier (amber, priority 4-7) - look at colour once the structure is done */

    if (emergencyMonths >= 1 && emergencyMonths < 3) {
        nudges.push({
            id:       'emergency-building',
            type:     'reminder',
            icon:     'piggy',
            priority: 6,
            title:    `${emergencyMonths}m covered - push to 3`,
            body:     `You have a start. Push to 3 months before investing aggressively - that buffer is what keeps you from liquidating investments in a crisis.`,
        })
    }

    if ((profile.raPercent || 0) < 5 && profile.grossIncome > 20000) {
        nudges.push({
            id:       'ra-low',
            type:     'reminder',
            icon:     'nudge',
            priority: 7,
            title:    'RA contribution can cut your PAYE',
            body:     `At ${profile.raPercent || 0}% RA you are leaving a significant tax reduction unclaimed. The cap is 27.5%. Every extra percent reduces what SARS takes right now.`,
        })
    }

    /* Insight tier (blue, priority 4-6) */

    const tfsaPct = tfsaMaxMonthly > 0
        ? Math.round((tfsaMonthly / tfsaMaxMonthly) * 100)
        : 0

    if (surplus > 3000 && tfsaMonthly < tfsaMaxMonthly * 0.5) {
        nudges.push({
            id:       'surplus-idle',
            type:     'insight',
            icon:     'nudge',
            priority: 5,
            title:    `${fmtZAR(surplus)} sitting idle each month`,
            body:     `You are only using ${tfsaPct}% of your R46 000 TFSA allowance. Move some of that surplus in before the tax year ends.`,
        })
    }

    /* Win tier (green, priority 8-10) */

    if (dti > 0 && dti <= 20) {
        nudges.push({
            id:       'dti-clear',
            type:     'win',
            icon:     'ok',
            priority: 8,
            title:    'Bond-ready DTI',
            body:     `At ${dti}%, your debt-to-income ratio is well within what lenders want to see. You are in a strong position for bond pre-approval.`,
        })
    }

    if (emergencyMonths >= 3) {
        nudges.push({
            id:       'emergency-solid',
            type:     'win',
            icon:     'ok',
            priority: 9,
            title:    'Emergency fund is solid',
            body:     `${emergencyMonths} months of expenses covered. That is a proper safety net. You can now focus on growing wealth, not just protecting it.`,
        })
    }

    if (tfsaMonthly > 0 && tfsaPct >= 95) {
        nudges.push({
            id:       'tfsa-maxed',
            type:     'win',
            icon:     'tfsa',
            priority: 8,
            title:    'TFSA fully maximised',
            body:     `You are contributing ${fmtZAR(tfsaMonthly)}/month and hitting your R46 000 annual allowance. Every rand of growth in here is tax-free.`,
        })
    }

    if (health.pct >= 75) {
        nudges.push({
            id:       'health-great',
            type:     'win',
            icon:     'ok',
            priority: 10,
            title:    `Financial health at ${health.pct}%`,
            body:     `Strong savings rate, manageable debt, and a solid emergency fund. You are building something real.`,
        })
    }

    /* Sort by priority soo most urgent first */
    return nudges.sort((a, b) => a.priority - b.priority)
}

/* Provider */

export function NudgeProvider({ children }) {
    const { profile } = useUserProfile()

    const [allNudges, setAllNudges] = useState([])

    /* Load dismissed IDs from localStorage on mount */
    const [dismissedIds, setDismissedIds] = useState(() => {
        try {
            const stored = localStorage.getItem(DISMISSED_KEY)
            return stored ? new Set(JSON.parse(stored)) : new Set()
        } catch {
            return new Set()
        }
    })

    /* Re-compute nudges whenever them profile changes */
    useEffect(() => {
        const computed = computeNudges(profile)
        setAllNudges(computed)

        /* Remove dismissed IDs whose condition no longer applies. Iterate the colour.
           But also this way, if the situation gets worse again later, the nudge resurfaces */
        const computedIds = new Set(computed.map(n => n.id))
        setDismissedIds(prev => {
            const cleaned = new Set([...prev].filter(id => computedIds.has(id)))
            if (cleaned.size !== prev.size) {
                localStorage.setItem(DISMISSED_KEY, JSON.stringify([...cleaned]))
            }
            return cleaned
        })
    }, [profile])

    /* Dismiss a single nudge by ID - persists to localStorage */
    const dismissNudge = useCallback((id) => {
        setDismissedIds(prev => {
            const next = new Set([...prev, id])
            localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]))
            return next
        })
    }, [])

    const activeNudges    = allNudges.filter(n => !dismissedIds.has(n.id))
    const dismissedNudges = allNudges.filter(n =>  dismissedIds.has(n.id))
    const unreadCount     = activeNudges.length
    const hasAlerts       = activeNudges.some(n => n.type === 'alert')

    return (
        <NudgeContext.Provider value={{
            activeNudges,
            dismissedNudges,
            allNudges,
            dismissNudge,
            unreadCount,
            hasAlerts,
        }}>
            {children}
        </NudgeContext.Provider>
    )
}

export function useNudges() {
    const ctx = useContext(NudgeContext)
    if (!ctx) throw new Error('useNudges must be used inside NudgeProvider')
    return ctx
}

export default NudgeContext
