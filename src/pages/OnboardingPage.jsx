import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import AuthContext from '../context/AuthContext'
import { useUserProfile } from '../context/UserProfileContext'
import '../styles/Onboarding.css'
import Icon from '../components/Icons'
import { FormattedCurrencyInput, FormattedPercentInput, formatNumber } from '../components/FormattedInput'

/* MEDICAL AID: single-adult contributions */
const MEDICAL_AIDS = [
    { scheme: 'Discovery Health', plans: [
        { name: 'KeyCare Start',             amount: 1250 },
        { name: 'KeyCare Core',              amount: 1680 },
        { name: 'Classic Delta Saver',       amount: 2890 },
        { name: 'Classic Saver',             amount: 3420 },
        { name: 'Classic Comprehensive',     amount: 5200 },
    ]},
    { scheme: 'Bonitas', plans: [
        { name: 'BonStart',                  amount: 1580 },
        { name: 'BonEssential',              amount: 1920 },
        { name: 'BonFit Select',             amount: 2250 },
        { name: 'BonSave',                   amount: 2750 },
        { name: 'BonComplete',               amount: 3800 },
    ]},
    { scheme: 'Momentum Health', plans: [
        { name: 'Ingwe',                     amount: 1420 },
        { name: 'Evolve',                    amount: 2100 },
        { name: 'Custom',                    amount: 2650 },
        { name: 'Extender',                  amount: 3200 },
    ]},
    { scheme: 'Medshield', plans: [
        { name: 'MediZero',                  amount: 1180 },
        { name: 'MediCore',                  amount: 1680 },
        { name: 'MediPlus',                  amount: 2420 },
        { name: 'MediSurge',                 amount: 3150 },
    ]},
    { scheme: 'Bestmed', plans: [
        { name: 'Beat 1',                    amount: 1150 },
        { name: 'Beat 2',                    amount: 1620 },
        { name: 'Beat 3',                    amount: 2180 },
        { name: 'Beat 4',                    amount: 3100 },
    ]},
    { scheme: 'Fedhealth', plans: [
        { name: 'myFed',                     amount: 1380 },
        { name: 'flexiFED 1',                amount: 1750 },
        { name: 'flexiFED 2',                amount: 2300 },
        { name: 'flexiFED 3',                amount: 3050 },
    ]},
    { scheme: 'GEMS', plans: [
        { name: 'Sapphire',                  amount: 1780 },
        { name: 'Beryl',                     amount: 2200 },
        { name: 'Emerald',                   amount: 3100 },
        { name: 'Onyx',                      amount: 3900 },
    ]},
]

/* Income source types for the "add other income" dropdown */
const INCOME_TYPES = [
    { value: 'freelance',  label: 'Freelance / Side income' },
    { value: 'rental',     label: 'Rental income' },
    { value: 'allowance',  label: 'Allowance / Family support' },
    { value: 'dividends',  label: 'Investment dividends' },
    { value: 'gift',       label: 'Gift / Transfer' },
    { value: 'other',      label: 'Other' },
]

const STEPS = [
    { id: 'account',  label: 'Account',  title: 'Create your profile',         subtitle: "This is how you'll sign in every time." },
    { id: 'income',   label: 'Income',   title: 'Your income',                  subtitle: 'We use this to calculate your real take-home pay after PAYE and RA deductions.' },
    { id: 'expenses', label: 'Expenses', title: 'Your monthly expenses',        subtitle: 'Be honest here - the more accurate this is, the more useful your snapshot becomes.' },
    { id: 'savings',  label: 'Savings',  title: 'Your savings',                 subtitle: "Don't worry if this is low. That's exactly what this tool helps you fix." },
    { id: 'goal',     label: 'Goal',     title: 'What are you working toward?', subtitle: 'This sets your primary Strategy Track. You can always add more later.' },
]

const GOALS = [
    { id: 'property',  icon: 'tracks',   heading: 'Buy my first property',            detail: 'Build a deposit, get bond-ready, and own by year 5.' },
    { id: 'investing', icon: 'snapshot', heading: 'Build an investment portfolio',     detail: 'Grow wealth through JSE, ETFs, and offshore exposure.' },
    { id: 'travel',    icon: 'studio',   heading: 'Fund my travel goals',              detail: 'Save purposefully for experiences without derailing long-term goals.' },
]

export default function OnboardingPage() {
    const navigate           = useNavigate()
    const { register }       = useContext(AuthContext)
    const { reloadProfile }  = useUserProfile()

    const [step,     setStep]     = useState(0)
    const [error,    setError]    = useState('')
    const [formData, setFormData] = useState({
        name: '', email: '', password: '',
        grossIncome: '', raPercent: '8',
        otherIncome: [],  /* array of { id, type, amount } */
        rent: '', utilities: '', medicalAid: '', carPayment: '', entertainment: '',
        tfsaContribution: '', bankBalance: '',
        primaryGoal: 'property',
    })

    /* Add a blank other-income row */
    function addOtherIncome() {
        setFormData(prev => ({
            ...prev,
            otherIncome: [...prev.otherIncome, { id: Date.now(), type: 'freelance', amount: '' }]
        }))
    }

    /* Update a specific field on a specific other-income row by its id */
    function updateOtherIncome(id, field, value) {
        setFormData(prev => ({
            ...prev,
            otherIncome: prev.otherIncome.map(item =>
                item.id === id ? { ...item, [field]: value } : item
            )
        }))
    }

    /* Remove a specific other-income row by its id */
    function removeOtherIncome(id) {
        setFormData(prev => ({
            ...prev,
            otherIncome: prev.otherIncome.filter(item => item.id !== id)
        }))
    }

    function handleChange(e) {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        setError('')
    }

    function validateStep() {
        if (step === 0) {
            if (!formData.name.trim())         return 'Please enter your name.'
            if (!formData.email.includes('@')) return 'Please enter a valid email address.'
            if (formData.password.length < 6)  return 'Password must be at least 6 characters.'
        }
        if (step === 1) {
            if (!formData.grossIncome || Number(formData.grossIncome) <= 0)
                return 'Please enter your gross monthly income.'
        }
        return ''
    }

    function handleNext() {
        const err = validateStep()
        if (err) { setError(err); return }
        setError('')
        setStep(s => s + 1)
    }

    function handleBack() {
        setError('')
        setStep(s => s - 1)
    }

    function handleComplete() {
        const result = register({
            name:        formData.name.trim(),
            email:       formData.email.trim().toLowerCase(),
            password:    formData.password,
            primaryGoal: formData.primaryGoal,
            profile: {
                grossIncome:      Number(formData.grossIncome)      || 0,
                raPercent:        Number(formData.raPercent)        || 8,
                otherIncome:      formData.otherIncome.map(item => ({
                    type:   item.type,
                    amount: Number(item.amount) || 0,
                })),
                rent:             Number(formData.rent)             || 0,
                utilities:        Number(formData.utilities)        || 0,
                medicalAid:       Number(formData.medicalAid)       || 0,
                carPayment:       Number(formData.carPayment)       || 0,
                loanPayment:      0,
                tfsaContribution: Number(formData.tfsaContribution) || 0,
                bankBalance:      Number(formData.bankBalance)      || 0,
                entertainment:    Number(formData.entertainment)    || 0,
            }
        })

        if (result.success) {
            reloadProfile()
            navigate('/home')
        } else {
            setError(result.error)
        }
    }

    /* Total of all income sources - using for the preview dropdown*/
    const totalOtherIncome = formData.otherIncome.reduce(
        (sum, item) => sum + (Number(item.amount) || 0), 0
    )

    const currentStep = STEPS[step]
    const progressPct = ((step + 1) / STEPS.length) * 100

    return (
        <div className="ob-shell">

            {/* Left panel: branding, should stay fixed while steps change */}
            <div className="ob-left">
                <div className="ob-left-inner">
                    <div className="ob-brand">
                        <span className="ob-brand-logo">ABSA</span>
                        <span className="ob-brand-name">NextGen</span>
                    </div>
                    <h2 className="ob-left-headline">
                        Your story<br/>matters.
                    </h2>
                    <p className="ob-left-body">
                        A financial planning tool built for high-earning young South Africans.
                        Understand your money, simulate your decisions, and build toward real goals.
                    </p>
                    <ul className="ob-left-list">
                        <li><Icon name="snapshot" size={16}/> Real take-home pay after PAYE &amp; RA</li>
                        <li><Icon name="tracks"   size={16}/> Personalised 5-year strategy tracks</li>
                        <li><Icon name="studio"   size={16}/> Live financial simulations</li>
                    </ul>
                    <p className="ob-left-takes">Takes about 3 minutes.</p>
                </div>
            </div>

            {/* Right panel: the form steps */}
            <div className="ob-right">
                <div className="ob-form-wrap">

                    {/* Step dots */}
                    <div className="ob-steps">
                        {STEPS.map((s, i) => (
                            <div
                                key={s.id}
                                className={[
                                    'ob-step-item',
                                    i < step  ? 'ob-step--done'   : '',
                                    i === step ? 'ob-step--active' : '',
                                ].join(' ')}
                            >
                                <div className="ob-step-dot">
                                    {i < step ? '✓' : i + 1}
                                </div>
                                <span className="ob-step-label">{s.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Progress bar */}
                    <div className="ob-progress-track">
                        <div className="ob-progress-fill" style={{ width: `${progressPct}%` }}/>
                    </div>

                    {/* Step content */}
                    <div className="ob-content">
                        <p className="ob-step-count">Step {step + 1} of {STEPS.length}</p>
                        <h1 className="ob-title">{currentStep.title}</h1>
                        <p className="ob-subtitle">{currentStep.subtitle}</p>

                        <div className="ob-fields">
                            {step === 0 && <StepAccount   formData={formData} onChange={handleChange}/>}
                            {step === 1 && (
                                <StepIncome
                                    formData={formData}
                                    onChange={handleChange}
                                    onAdd={addOtherIncome}
                                    onUpdate={updateOtherIncome}
                                    onRemove={removeOtherIncome}
                                    totalOtherIncome={totalOtherIncome}
                                />
                            )}
                            {step === 2 && <StepExpenses  formData={formData} onChange={handleChange}/>}
                            {step === 3 && <StepSavings   formData={formData} onChange={handleChange}/>}
                            {step === 4 && (
                                <StepGoal
                                    formData={formData}
                                    onSelect={g => setFormData(p => ({ ...p, primaryGoal: g }))}
                                />
                            )}
                        </div>

                        {error && <p className="ob-error">{error}</p>}

                        <div className="ob-actions">
                            {step > 0 && (
                                <button className="ob-btn-back" onClick={handleBack}>Back</button>
                            )}
                            {step < STEPS.length - 1 ? (
                                <button className="ob-btn-next" onClick={handleNext}>Continue</button>
                            ) : (
                                <button className="ob-btn-next" onClick={handleComplete}>Let's go</button>
                            )}
                        </div>
                    </div>

                </div>
            </div>

        </div>
    )
}

/* Step sub-components */

function Field({ label, hint, children }) {
    return (
        <div className="ob-field">
            <label className="ob-label">{label}</label>
            {children}
            {hint && <p className="ob-hint">{hint}</p>}
        </div>
    )
}

function StepAccount({ formData, onChange }) {
    /* Local state - toggling the visibility of the password */
    const [showPassword, setShowPassword] = useState(false)

    return (
        <>
            <Field label="Full name">
                <input
                    className="ob-input"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={onChange}
                    placeholder="Username"
                    autoComplete="name"
                />
            </Field>

            <Field label="Email address">
                <input
                    className="ob-input"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={onChange}
                    placeholder="name@example.com"
                    autoComplete="email"
                />
            </Field>

            <Field label="Password" hint="Minimum 6 characters.">
                {/* The wrapper positions the toggle button inside the input */}
                <div className="ob-password-wrap">
                    <input
                        className="ob-input"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={onChange}
                        placeholder="••••••••"
                        autoComplete="new-password"
                    />
                    <button
                        type="button"
                        className="ob-eye-btn"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        {showPassword
                            ? <EyeOff size={16} strokeWidth={1.75}/>
                            : <Eye    size={16} strokeWidth={1.75}/>
                        }
                    </button>
                </div>
            </Field>
        </>
    )
}

function StepIncome({ formData, onChange, onAdd, onUpdate, onRemove, totalOtherIncome }) {
    const gross    = Number(formData.grossIncome) || 0
    const total    = gross + totalOtherIncome
    const ra       = total * (Math.min(Number(formData.raPercent) || 0, 27.5) / 100)
    const paye     = (total - ra) * 0.26
    const takeHome = Math.max(0, total - paye - ra)

    return (
        <>
            <Field label="Gross monthly salary" hint="Your salary before any deductions - what your offer letter says.">
                <FormattedCurrencyInput name="grossIncome" value={formData.grossIncome} onChange={onChange} placeholder="45 000"/>
            </Field>

            <Field label="Retirement Annuity contribution" hint="As a % of your gross. Leave at 0 if you don't have one. Up to 27.5% is tax-deductible.">
                <FormattedPercentInput name="raPercent" value={formData.raPercent} onChange={onChange} placeholder="8" max={27.5}/>
            </Field>

            {/* Other income rows - each has a type dropdown and formatted amount */}
            {formData.otherIncome.map(item => (
                <div key={item.id} className="ob-other-income-row">
                    <select
                        className="ob-select"
                        value={item.type}
                        onChange={e => onUpdate(item.id, 'type', e.target.value)}
                    >
                        {INCOME_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                    <FormattedCurrencyInput
                        name={`other_${item.id}`}
                        value={item.amount}
                        onChange={e => onUpdate(item.id, 'amount', e.target.value)}
                        placeholder="0"
                    />
                    <button
                        type="button"
                        className="ob-remove-btn"
                        onClick={() => onRemove(item.id)}
                        aria-label="Remove income source"
                    >
                        ×
                    </button>
                </div>
            ))}

            <button type="button" className="ob-add-income-btn" onClick={onAdd}>
                + Add another income source
            </button>

            {/* Live take-home preview - updates as user types for that responsive vibe */}
            {total > 0 && (
                <div className="ob-live-calc">
                    <span className="ob-live-label">Estimated take-home</span>
                    <span className="ob-live-value">
                        R {Math.round(takeHome).toLocaleString('en-ZA').replace(/,/g, ' ')}/month
                    </span>
                    {totalOtherIncome > 0 && (
                        <span className="ob-live-note">
                            Based on total income of R {formatNumber(String(Math.round(total)))}
                        </span>
                    )}
                    <span className="ob-live-note">Exact figure on your dashboard after SARS credits.</span>
                </div>
            )}
        </>
    )
}

function StepExpenses({ formData, onChange }) {
    /* Controls whether the user picks a plan or types manually.
       Default is 'manual' so nobody is forced through the dropdown. */
    const [medMode, setMedMode] = useState('manual')

    /* When a plan is selected from the dropdown, fire onChange with
       the plan's amount so it lands in formData.medicalAid */
    function handlePlanSelect(e) {
        const amount = e.target.value
        onChange({ target: { name: 'medicalAid', value: amount } })
    }

    return (
        <>
            <Field label="Rent or bond repayment" hint="Enter 0 if you live with family.">
                <FormattedCurrencyInput name="rent" value={formData.rent} onChange={onChange}/>
            </Field>

            <Field label="Car payment">
                <FormattedCurrencyInput name="carPayment" value={formData.carPayment} onChange={onChange}/>
            </Field>

            {/* Medical aid - toggle between manual entry and plan selector (FIX THE UI of this) */}
            <div className="ob-field">
                <div className="ob-field-header">
                    <label className="ob-label">Medical aid</label>
                    {/* Mode toggle - two small tabs */}
                    <div className="ob-mode-tabs">
                        <button
                            type="button"
                            className={`ob-mode-tab ${medMode === 'manual' ? 'ob-mode-tab--active' : ''}`}
                            onClick={() => setMedMode('manual')}
                        >
                            Enter amount
                        </button>
                        <button
                            type="button"
                            className={`ob-mode-tab ${medMode === 'select' ? 'ob-mode-tab--active' : ''}`}
                            onClick={() => setMedMode('select')}
                        >
                            Choose plan
                        </button>
                    </div>
                </div>

                {medMode === 'manual' ? (
                    <FormattedCurrencyInput
                        name="medicalAid"
                        value={formData.medicalAid}
                        onChange={onChange}
                        placeholder="0"
                    />
                ) : (
                    /* Grouped select - each option is a medical aid scheme */
                    <select className="ob-select ob-select--full" onChange={handlePlanSelect} defaultValue="">
                        <option value="" disabled>Select your scheme and plan</option>
                        {MEDICAL_AIDS.map(scheme => (
                            <optgroup key={scheme.scheme} label={scheme.scheme}>
                                {scheme.plans.map(plan => (
                                    <option key={plan.name} value={String(plan.amount)}>
                                        {plan.name} - R {plan.amount.toLocaleString('en-ZA')} /month
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                )}

                {/* Always show the current amount when in select mode so user can confirm */}
                {medMode === 'select' && formData.medicalAid && (
                    <div className="ob-med-confirm">
                        <span>Selected amount:</span>
                        <strong>R {formatNumber(formData.medicalAid)}/month</strong>
                        <span className="ob-med-note">Approximate 2025 rate - verify against your payslip.</span>
                    </div>
                )}

                <p className="ob-hint">Your personal contribution only - not your employer's portion.</p>
            </div>

            <Field label="Utilities" hint="Electricity, water, internet, subscriptions.">
                <FormattedCurrencyInput name="utilities" value={formData.utilities} onChange={onChange}/>
            </Field>

            <Field label="Entertainment & lifestyle" hint="Eating out, gym, social. This information is private.">
                <FormattedCurrencyInput name="entertainment" value={formData.entertainment} onChange={onChange}/>
            </Field>
        </>
    )
}

function StepSavings({ formData, onChange }) {
    return (
        <>
            <Field label="Monthly TFSA contribution" hint="R46 000/year cap. Even R500/month compounds significantly over 5 years.">
                <FormattedCurrencyInput name="tfsaContribution" value={formData.tfsaContribution} onChange={onChange}/>
            </Field>
            <Field label="Current savings / emergency fund balance" hint="What you have liquid right now - excluding investments that are not easily access.">
                <FormattedCurrencyInput name="bankBalance" value={formData.bankBalance} onChange={onChange}/>
            </Field>
        </>
    )
}

function StepGoal({ formData, onSelect }) {
    return (
        <div className="ob-goal-grid">
            {GOALS.map(goal => (
                <button
                    key={goal.id}
                    type="button"
                    className={`ob-goal-card ${formData.primaryGoal === goal.id ? 'ob-goal-card--selected' : ''}`}
                    onClick={() => onSelect(goal.id)}
                >
                    <div className="ob-goal-icon">
                        <Icon name={goal.icon} size={22}/>
                    </div>
                    <div>
                        <strong className="ob-goal-heading">{goal.heading}</strong>
                        <p className="ob-goal-detail">{goal.detail}</p>
                    </div>
                </button>
            ))}
        </div>
    )
}
