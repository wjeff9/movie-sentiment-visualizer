import './ReviewPanel.css';

export default function ReviewPanel({ opinion, reviews, highlightColor }) {
    return (
        <div className="review-panel">
            <ReviewPanelHeader opinion={opinion} highlightColor={highlightColor} numReviews={reviews.length} />
            <div className="review-list">
                {reviews.map((r, i) => (
                    <ReviewCard key={i} review={r} activeOpinion={opinion} highlightColor={highlightColor} />
                ))}
            </div>
        </div>
    );
}

function ReviewPanelHeader({ opinion, highlightColor, numReviews }) {
    return (
        <>
            <h2>
                Reviews{opinion && (
                    <> — <span style={{ color: highlightColor }}>{opinion}</span></>
                )}
            </h2>
            {!numReviews && <p className="placeholder">Select a bubble to see related reviews.</p>}
        </>
    );
}

function ReviewCard({ review, activeOpinion, highlightColor }) {
    return (
        <div className='review-card'>
            <p className='review-text'>
                <ReviewText text={review.text} highlight={activeOpinion} color={highlightColor} />
            </p>
            <div className='review-footer'>
                <span className='reviewer-name'>— {review.reviewer}</span>
                <span className='review-date'>{review.date}</span>
            </div>
        </div>
    )
}

// Helper component to keep ReviewCard clean
function ReviewText({ text, highlight, color }) {
    if (!highlight) return <>{text}</>;

    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));

    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() ? (
                    <span
                        key={i}
                        className="highlight"
                        style={{
                            color: color,
                        }}
                    >
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </>
    );
}