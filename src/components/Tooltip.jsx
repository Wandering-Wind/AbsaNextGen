import { useState, useRef } from 'react'
import { Info } from 'lucide-react'
import '../styles/components/Tooltip.css'

/* Tooltip component to give more information for teaching element
   Uses position:fixed so the popup escapes any overflow:hidden on parent containers
   Shows on hover and on keyboard focus */
   
export default function Tooltip({ text }) {
    const [coords, setCoords] = useState(null)
    const btnRef = useRef(null)

    if (!text) return null

    function handleShow() {
        const r = btnRef.current?.getBoundingClientRect()
        if (r) setCoords({ top: r.top, left: r.left + r.width / 2 })
    }

    function handleHide() {
        setCoords(null)
    }

    return (
        <span className="tooltip-wrap">
            <button
                ref={btnRef}
                className="tooltip-trigger"
                type="button"
                tabIndex={0}
                aria-label="More information"
                aria-describedby={coords ? 'tt-popup' : undefined}
                onMouseEnter={handleShow}
                onFocus={handleShow}
                onMouseLeave={handleHide}
                onBlur={handleHide}
            >
                <Info size={12} strokeWidth={2} />
            </button>

            {coords && (
                <span
                    id="tt-popup"
                    className="tooltip-popup"
                    role="tooltip"
                    style={{ top: coords.top, left: coords.left }}
                >
                    {text}
                </span>
            )}
        </span>
    )
}
