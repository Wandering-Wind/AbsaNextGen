/* Reusable formatted currency input
   Displays numbers with SA thousands spacing (45 000 not 45000)
   while storing the raw digit string for calculations */

export function formatNumber(val) {
    const digits = String(val || '').replace(/\D/g, '')
    if (!digits) return ''
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function parseNumber(val) {
    /* Stripping spaces/formatting and return just the digit string */
    return String(val || '').replace(/\D/g, '')
}

export function FormattedCurrencyInput({ name, value, onChange, placeholder = '0', prefix = 'R', className = '' }) {
    function handleChange(e) {
        /* Strip non-digits, then strip leading zeros so "0" + "2" = "2" not "02" */
        const raw = e.target.value.replace(/\D/g, '').replace(/^0+(\d)/, '$1')
        onChange({ target: { name, value: raw } })
    }

    return (
        <div className="fmt-wrap">
            {prefix && <span className="fmt-prefix">{prefix}</span>}
            <input
                type="text"
                inputMode="numeric" 
                value={formatNumber(value)}
                onChange={handleChange}
                placeholder={placeholder}
                className={`fmt-input ${className}`}
                autoComplete="off"
            />
        </div>
    )
}

export function FormattedNumberInput({ value, onChange, placeholder = '0', prefix = 'R', className = '' }) {
    function handleChange(e) {
        const digits = e.target.value.replace(/\D/g, '').replace(/^0+(\d)/, '$1')
        onChange(digits === '' ? 0 : Number(digits))
    }
    return (
        <div className="fmt-wrap">
            {prefix && <span className="fmt-prefix">{prefix}</span>}
            <input
                type="text"
                inputMode="numeric"
                value={value ? formatNumber(String(value)) : ''}
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
