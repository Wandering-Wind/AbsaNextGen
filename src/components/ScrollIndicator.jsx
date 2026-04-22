import { useState, useEffect, useRef } from 'react'

export default function ScrollIndicator({ scrollRef }) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        function handleScroll() {
            //Hide when user is near the bottom (within 80px)
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            setVisible(!nearBottom)
        }

        el.addEventListener('scroll', handleScroll)
        handleScroll() //check on mount - not working
        return () => el.removeEventListener('scroll', handleScroll)
    }, [scrollRef])

    function scrollDown() {
        scrollRef.current?.scrollBy({ top: 300, behavior: 'smooth' })
    }

    return (
        <div className="scroll-indicator">
            <button
                className={`scroll-indicator-btn ${!visible ? 'hidden' : ''}`}
                onClick={scrollDown}
            >
                ↓ scroll for more
            </button>
        </div>
    )
}