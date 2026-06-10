/* Reusable formatted currency input
   Displays numbers with SA thousands spacing (45 000 not 45000)
   while storing the raw digit string for calculations.

   Usage:
     <FormattedCurrencyInput
         name="grossIncome"
         value={formData.grossIncome}   // store as raw digits: "45000"
         onChange={handleChange}         // receives synthetic event with raw value
         placeholder="45 000"
     />

   The value prop should always be the raw digit string (no spaces).
   The component formats it for display only */

export function formatNumber(val) {
    /* Strip everything except digits, then insert a space every 3 digits
       from the right. "45000" → "45 000", "1234567" → "1 234 567" */
    const digits = String(val || '').replace(/\D/g, '')
    if (!digits) return ''
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') /* non-breaking space */
}

export function parseNumber(val) {
    /* Strip spaces/formatting and return just the digit string */
    return String(val || '').replace(/\D/g, '')
}

export function FormattedCurrencyInput({ name, value, onChange, placeholder = '0', prefix = 'R', className = '' }) {
    function handleChange(e) {
        /* Strip all non-digit characters before storing */
        const raw = e.target.value.replace(/\D/g, '')
        /* Fire a synthetic event that looks like a normal input event
           so it works with existing handleChange(e) patterns */
        onChange({ target: { name, value: raw } })
    }

    return (
        <div className="fmt-wrap">
            {prefix && <span className="fmt-prefix">{prefix}</span>}
            <input
                type="text"
                inputMode="numeric"  /* shows numeric keyboard on mobile */
                value={formatNumber(value)}
                onChange={handleChange}
                placeholder={placeholder}
                className={`fmt-input ${className}`}
                autoComplete="off"
            />
        </div>
    )
}

export function FormattedPercentInput({ name, value, onChange, placeholder = '0', max = 100 }) {
    function handleChange(e) {
        /* Allow one decimal place for percentages like 27.5 */
        const raw = e.target.value.replace(/[^0-9.]/g, '')
        if (max && Number(raw) > max) return
        onChange({ target: { name, value: raw } })
    }

    return (
        <div className="fmt-wrap">
            <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className="fmt-input"
                autoComplete="off"
            />
            <span className="fmt-suffix">%</span>
        </div>
    )
}
