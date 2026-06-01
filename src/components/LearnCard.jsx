import { useState } from 'react'

export default function LearnCard({ term, explanation }) {
    const [open, setOpen] = useState(false)

    return (
        <div className="learn-card">
            <button onClick={() => setOpen(o => !o)}>
                {term}
                <span>{open ? '−' : '+'}</span>
            </button>
            {open && <p>{explanation}</p>}
        </div>
    )
}
