export const SA = {
    /* PAYE_RATE kept for rough display hints (e.g. MoneySnapshot RA saving label).
       All actual tax calculations use calcPAYE() with the SARS brackets below */
    PAYE_RATE: 0.26,
    RA_MAX_PERCENT: 27.5,
    TFSA_ANNUAL_CAP: 46000,
    MEDICAL_CREDIT_PRIMARY: 364,
    PRIME_RATE: 0.1025,
    BOND_SPREAD: 0.005,
    JSE_RETURN: 0.11,
    PROPERTY_GROWTH: 0.06,
    INFLATION: 0.05,
}

/* SARS income tax brackets */
export function calcPAYE(annualTaxable) {
    let tax = 0
    if      (annualTaxable <= 237100)   tax = annualTaxable * 0.18
    else if (annualTaxable <= 370500)   tax = 42678  + (annualTaxable - 237100)  * 0.26
    else if (annualTaxable <= 512800)   tax = 77362  + (annualTaxable - 370500)  * 0.31
    else if (annualTaxable <= 673000)   tax = 121475 + (annualTaxable - 512800)  * 0.36
    else if (annualTaxable <= 857900)   tax = 179147 + (annualTaxable - 673000)  * 0.39
    else if (annualTaxable <= 1817000)  tax = 251258 + (annualTaxable - 857900)  * 0.41
    else                                tax = 644489 + (annualTaxable - 1817000) * 0.45
    return Math.max(0, Math.round(tax - 17235))
}

/* otherIncome array of { type, amount } saurr defaults to [] for
   backward-compatible calls that don't pass it */
export function calcTakeHome(grossIncome, raPercent, otherIncome = []) {
    const otherTotal    = otherIncome.reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
    const totalGross    = grossIncome + otherTotal
    const raAmount      = totalGross * (Math.min(raPercent, SA.RA_MAX_PERCENT) / 100)
    const annualTaxable = (totalGross - raAmount) * 12
    const monthlyPAYE   = Math.round(calcPAYE(annualTaxable) / 12)
    return Math.round(totalGross - raAmount - monthlyPAYE)
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

export function calcNetSurplus(profile) {
    const takeHome = calcTakeHome(profile.grossIncome, profile.raPercent, profile.otherIncome || [])
    const expenses = calcTotalExpenses(profile)
    return Math.round(takeHome - expenses)
}

export function calcSurplusStatus(profile) {
    const surplus = calcNetSurplus(profile)
    if (surplus > 500)  return 'surplus'
    if (surplus >= -500) return 'breakeven' 
    return 'deficit'
}

export function calcSurplusMessage(profile) {
    const surplus = calcNetSurplus(profile)
    const status  = calcSurplusStatus(profile)

    if (status === 'surplus') {
        return `You have ${fmtZAR(surplus)} left over each month. Consider investing this surplus.`
    }
    if (status === 'breakeven') {
        return `You are roughly breaking even. You have almost no buffer for unexpected costs.`
    }
    return `Your expenses exceed your income by ${fmtZAR(Math.abs(surplus))}. Reduce costs before investing.`
}

//Savings rate (targeting 10-20% of take-home (double-check if this is realistic thoughhh)) 
export function calcSavingsScore(profile) {
    const takeHome = calcTakeHome(profile.grossIncome, profile.raPercent)
    if (takeHome === 0 ) return 0
    const rate = (profile.tfsaContribution || 0) /takeHome
    if (rate >= 0.20) return 10
    if (rate >= 0.10) return 5 + ((rate - 0.10) / 0.10) * 5
    return Math.round((rate/ 0.10)* 5)
}

export function calcDebtScore(profile) {
    const totalDebt = (profile.carPayment || 0) + (profile.loanPayment || 0)
    if (profile.grossIncome === 0) return 0
    const ratio = totalDebt / profile.grossIncome
    if (ratio > 0.50) return 0
    if (ratio <= 0.30) return 10

    return Math.round(10-((ratio - 0.30)/0.20)*10)
}

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
    if (pct>= 75) {label = "Doing Well"; status = 'doing-well'}
    else if (pct >= 50) {label = "Coping"; status = 'coping'}
    else {label = "Struggling"; status = 'struggling'}

    return {pct, label, status, savings, debt, emergency}
}

export function calcMedicalCredit(medicalAid) {
  return medicalAid > 0 ? SA.MEDICAL_CREDIT_PRIMARY : 0
}

export function calcTfsaHeadroom(monthlyContribution) {
  const annual = (monthlyContribution || 0) * 12
  return Math.max(0, SA.TFSA_ANNUAL_CAP - annual)
}

export function fmtZAR(amount) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function calcDTI(profile) {
  const totalDebt = (profile.carPayment || 0) + (profile.loanPayment || 0)
  if (profile.grossIncome === 0) return 0
  return Math.round((totalDebt / profile.grossIncome) * 100)
}

export function calcEmergencyMonths(profile) {
  const expenses = calcTotalExpenses(profile)
  if (expenses === 0) return 0
  return ((profile.bankBalance || 0) / expenses).toFixed(1)
}

/* Standard bond repayment formula (yohh finances are so hard bro)*/
export function calcBondRepayment(principal, annualRate, termYears) {
  const r = annualRate / 12
  const n = termYears * 12
  if (r === 0) return Math.round(principal / n)
  return Math.round((principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1))
}

/* Snapshot narrative - returns an bunch of { text, sentiment } objects
   Each combining the user's numbers into context and like what it means for them
   The sentiments are one of: 'positive' | 'caution' | 'negative' | 'neutral'   */
export function buildSnapshotNarrative(profile, takeHome) {
  if (!profile || !profile.grossIncome || profile.grossIncome === 0) return []

  const lines = []
  const gross = profile.grossIncome

  /* 1.Income band context */
  if (gross < 25000) {
    lines.push({
      text:      `At ${fmtZAR(gross)}/month gross, you are in the graduate band. The RA and TFSA habits you build now compound across decades - the consistency matters more than the amount at this stage.`,
      sentiment: 'neutral',
    })
  } else if (gross < 55000) {
    lines.push({
      text:      `At ${fmtZAR(gross)}/month gross, PAYE starts to bite hardest in this range. Using your RA allowance aggressively is the single most effective tax tool available to you right now.`,
      sentiment: 'neutral',
    })
  } else {
    lines.push({
      text:      `At ${fmtZAR(gross)}/month gross your tax exposure is significant. Maxing your RA and TFSA before lifestyle expenses absorb the difference is the priority call at this income level.`,
      sentiment: 'caution',
    })
  }

  /* 2.Housing allocation */
  if (takeHome > 0 && (profile.rent || 0) > 0) {
    const pct = Math.round(((profile.rent || 0) / takeHome) * 100)
    if (pct <= 25) {
      lines.push({
        text:      `Housing at ${pct}% of take-home is lean - well below the 30% threshold that signals financial strain. That headroom can go directly into wealth-building.`,
        sentiment: 'positive',
      })
    } else if (pct <= 33) {
      lines.push({
        text:      `Housing is taking ${pct}% of take-home, which sits within the acceptable range. Worth monitoring if interest rates or rent escalations push it past 33%.`,
        sentiment: 'neutral',
      })
    } else {
      lines.push({
        text:      `At ${pct}% of take-home, housing is absorbing a large share of your income. The general guideline is 30% maximum - this level limits what you can build elsewhere.`,
        sentiment: 'caution',
      })
    }
  }

  /* 3. Lifestyle spend */
  if (takeHome > 0 && (profile.entertainment || 0) > 0) {
    const pct = Math.round(((profile.entertainment || 0) / takeHome) * 100)
    if (pct < 10) {
      lines.push({
        text:      `Lifestyle spend at ${pct}% of take-home is disciplined. Typical for your income band is 10-15% - you have real room to redirect here if priorities shift.`,
        sentiment: 'positive',
      })
    } else if (pct <= 15) {
      lines.push({
        text:      `Entertainment and dining at ${pct}% of take-home is typical for your income band - not excessive, not negligible. This is a healthy baseline.`,
        sentiment: 'neutral',
      })
    } else if (pct <= 25) {
      lines.push({
        text:      `Lifestyle spend at ${pct}% of take-home is above average for your income band. This is the most negotiable category in your budget if you need to free up capital.`,
        sentiment: 'caution',
      })
    } else {
      lines.push({
        text:      `At ${pct}% of take-home, lifestyle and entertainment is significantly above average. This is the category where wealth accumulation most commonly stalls.`,
        sentiment: 'negative',
      })
    }
  }

  /* 4. Savings rate and forward-look */
  if (takeHome > 0) {
    const savingsPct = Math.round(((profile.tfsaContribution || 0) / takeHome) * 100)
    if (savingsPct === 0) {
      lines.push({
        text:      `No TFSA contribution is currently set. Even R500/month started now builds the habit and the compound base that accelerates meaningfully over five years.`,
        sentiment: 'negative',
      })
    } else if (savingsPct < 10) {
      lines.push({
        text:      `A ${savingsPct}% savings rate is a foundation. The target for meaningful 5-year accumulation is 15-20% of take-home - there is room to grow this gradually.`,
        sentiment: 'caution',
      })
    } else if (savingsPct < 20) {
      lines.push({
        text:      `Saving ${savingsPct}% of take-home puts you in a healthy range. Pushing toward 20% would place you firmly in the wealth-building tier for your income band.`,
        sentiment: 'positive',
      })
    } else {
      lines.push({
        text:      `At ${savingsPct}% savings rate, you are ahead of most earners in your income band. Protect this discipline as income grows - lifestyle inflation is the main threat at this stage.`,
        sentiment: 'positive',
      })
    }
  }

  return lines
}

/* SARS transfer duty bands (2024/25 rates) */
export function calcTransferDuty(price) {
  if (price <= 1100000)  return 0
  if (price <= 1375000)  return Math.round((price - 1100000) * 0.03)
  if (price <= 1925000)  return Math.round(8250  + (price - 1375000) * 0.06)
  if (price <= 2475000)  return Math.round(41250 + (price - 1925000) * 0.08)
  if (price <= 11000000) return Math.round(85250 + (price - 2475000) * 0.11)
  return Math.round(1024500 + (price - 11000000) * 0.13)
}