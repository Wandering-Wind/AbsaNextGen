export const SA = {
    PAYE_RATE: 0.18,
    RA_MAX_PERCENT: 27.5,
    TFSA_ANNUAL_CAP: 46000,
    MEDICAL_CREDIT_PRIMARY: 364,
    PRIME_RATE: 0.1025,
    BOND_SPREAD: 0.005,
    JSE_RETURN: 0.11,
    PROPERTY_GROWTH: 0.06,
    INFLATION: 0.05,
}

export function calcTakeHome(grossIncome, raPercent) {
    const raFraction = Math.min(raPercent, SA.RA_MAX_PERCENT) / 100
    const raAmount = grossIncome * raFraction
    const taxableIncome = grossIncome - raAmount
    const paye = taxableIncome * SA.PAYE_RATE
    return Math.round(grossIncome - raAmount - paye)
}

export function calcTotalExpenses(profile){
    return(
        (profile.rent || 0) +
        (profile.utilities || 0) +
        (profile.medicalAid || 0) +
        (profile.carPayment || 0) +
        (profile.loanPayment || 0) +
        (profile.entertainment || 0) +
        (profile.tfsaContribution || 0) 
    )
}

//Net Surplus: what's left after your take-home minus all your expenses
export function calcNetSurplus(profile) {
    const takeHome = calcTakeHome(profile.grossIncome, profile.raPercent)
    const expenses = calcTotalExpenses(profile)
    return Math.round(takeHome - expenses)
}

// Returns 'surplus', 'breakeven', or 'deficit'
// MoneySnapshot uses this to decide what colour/message to show
export function calcSurplusStatus(profile) {
    const surplus = calcNetSurplus(profile)
    if (surplus > 500)  return 'surplus'
    if (surplus >= -500) return 'breakeven'  // within R500 either way
    return 'deficit'
}

// Human-readable message for the UI
export function calcSurplusMessage(profile) {
    const surplus = calcNetSurplus(profile)
    const status  = calcSurplusStatus(profile)

    if (status === 'surplus') {
        return `You have ${fmtZAR(surplus)} left over each month. Consider investing this surplus.`
    }
    if (status === 'breakeven') {
        return `You are roughly breaking even. You have almost no buffer for unexpected costs.`
    }
    // deficit
    return `Your expenses exceed your income by ${fmtZAR(Math.abs(surplus))}. Reduce costs before investing.`
}

//Savings rate (we're targeting 10-20% of take-home) 
export function calcSavingsScore(profile) {
    const takeHome = calcTakeHome(profile.grossIncome, profile.raPercent)
    if (takeHome === 0 ) return 0
    const rate = (profile.tfsaContribution || 0) /takeHome
    if (rate >= 0.20) return 10
    if (rate >= 0.10) return 5 + ((rate - 0.10) / 0.10) * 5
    return Math.round((rate/ 0.10)* 5)
}

//The target of the debt score is to be below 36%
export function calcDebtScore(profile) {
    const totalDebt = (profile.carPayment || 0) + (profile.loanPayment || 0)
    if (profile.grossIncome === 0) return 0
    const ratio = totalDebt / profile.grossIncome
    if (ratio > 0.50) return 0
    if (ratio <= 0.30) return 10

    return Math.round(10-((ratio - 0.30)/0.20)*10)
}

//Emergency fund: bank balance / monthly expenses (the target is 3-6 months)
export function calcEmergencyScore(profile) {
    const monthlyExpenses = calcTotalExpenses(profile)
    if (monthlyExpenses === 0) return 10
    const months = (profile.bankBalance || 0) / monthlyExpenses
    if (months >= 6) return 10
    if (months>= 3) return 6
    if (months>= 1) return 3
    return 0
}

export function calcHealthScore(profile) {
    const savings = calcSavingsScore(profile)
    const debt = calcDebtScore(profile)
    const emergency = calcEmergencyScore(profile)

    const total = savings + debt + emergency
    const pct = Math.round((total/30)*100)

    let label, status
    if (pct>= 75) {label = "Doing Well"; status = 'doing well'}
    else if (pct >= 50) {label = "Coping"; status = 'coping'}
    else {label = "Struggling"; status = 'struggling'}

    return {pct, label, status, savings, debt, emergency}
}

// ── SARS medical tax credit ───────────────────────────────────
export function calcMedicalCredit(medicalAid) {
  // You only get the credit if you're actually paying for medical aid
  return medicalAid > 0 ? SA.MEDICAL_CREDIT_PRIMARY : 0
}

// ── TFSA headroom ─────────────────────────────────────────────
export function calcTfsaHeadroom(monthlyContribution) {
  const annual = (monthlyContribution || 0) * 12
  return Math.max(0, SA.TFSA_ANNUAL_CAP - annual)
}

// ── ZAR formatter ─────────────────────────────────────────────
export function fmtZAR(amount) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// ── Debt-to-income ratio as percentage (for display) ──────────
export function calcDTI(profile) {
  const totalDebt = (profile.carPayment || 0) + (profile.loanPayment || 0)
  if (profile.grossIncome === 0) return 0
  return Math.round((totalDebt / profile.grossIncome) * 100)
}

// ── Emergency fund months covered ────────────────────────────
export function calcEmergencyMonths(profile) {
  const expenses = calcTotalExpenses(profile)
  if (expenses === 0) return 0
  return ((profile.bankBalance || 0) / expenses).toFixed(1)
}