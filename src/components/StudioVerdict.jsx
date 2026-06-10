import { Link } from 'react-router-dom'

/* Okay, so this is used by all 3 money studios
   Sits at the bottom of the results panel after all the things have been taught */

const TYPE_STYLES = {
    positive: { border: 'var(--success)',  dot: 'var(--success)'  },
    caution:  { border: 'var(--warning)',  dot: 'var(--warning)'  },
    neutral:  { border: 'var(--absa-red)', dot: 'var(--absa-red)' },
    blocked:  { border: 'var(--n-300)',    dot: 'var(--n-400)'    },
}

export default function StudioVerdict({ type = 'neutral', headline, points = [], nextStep, nextPath }) {
    const style = TYPE_STYLES[type] ?? TYPE_STYLES.neutral

    return (
        <div
            className="studio-verdict"
            style={{ borderTopColor: style.border }}
        >
            <p className="studio-verdict-eyebrow">Studio Verdict</p>

            <h3 className="studio-verdict-headline">{headline}</h3>

            {points.length > 0 && (
                <ul className="studio-verdict-points">
                    {points.map((point, i) => (
                        <li key={i} className="studio-verdict-point">
                            <span
                                className="studio-verdict-dot"
                                style={{ background: style.dot }}
                                aria-hidden="true"
                            />
                            <span>{point}</span>
                        </li>
                    ))}
                </ul>
            )}

            {nextStep && nextPath && (
                <Link to={nextPath} className="studio-verdict-next">
                    {nextStep} &rarr;
                </Link>
            )}
        </div>
    )
}
