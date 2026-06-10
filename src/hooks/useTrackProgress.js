import { useState, useCallback } from 'react'

const STORAGE_KEY = 'absa_track_progress'

/* Reads the full progress object from localStorage */
function loadProgress() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    } catch {
        return {}
    }
}

/* Hook for persisting micro-action completions per track and year
   trackId should be 'property' | 'investing' | 'travel'

   Storage shape:
   {
     property: { 1: ['0', '2'], 2: ['1'], ... },
     investing: { ... },
     travel: { ... },
   }
*/
export function useTrackProgress(trackId) {
    const [progress, setProgress] = useState(loadProgress)

    /* Returns an array of completed action index strings for a given year */
    const getCompleted = useCallback((year) => {
        return progress?.[trackId]?.[year] ?? []
    }, [progress, trackId])

    /* Toggles a single action on or off, saves to localStorage */
    const toggleAction = useCallback((year, idx) => {
        setProgress(prev => {
            const trackData = prev[trackId] ?? {}
            const yearData  = trackData[year] ?? []
            const idxStr    = String(idx)
            const updated   = yearData.includes(idxStr)
                ? yearData.filter(i => i !== idxStr)
                : [...yearData, idxStr]

            const next = {
                ...prev,
                [trackId]: { ...trackData, [year]: updated },
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            return next
        })
    }, [trackId])

    return { getCompleted, toggleAction }
}
