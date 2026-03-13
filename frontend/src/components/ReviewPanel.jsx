import './ReviewPanel.css';

export default function ReviewPanel({ opinion, reviews, sentiment, colors }) {
    const highlightColor = sentiment ? colors.default[sentiment] : null;

    return (
        <div className="review-panel">
            <ReviewPanelHeader opinion={opinion} highlightColor={highlightColor} numReviews={reviews.length} />
            <div className="review-list">
                {reviews.map((r, i) => (
                    <ReviewCard key={i} review={r} highlightColor={highlightColor} />
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

function ReviewCard({ review, highlightColor }) {
    return (
        <div className='review-card'>
            <p className='review-text'>
                <ReviewText text={review.text} color={highlightColor} />
            </p>
            <div className='review-footer'>
                <span className='reviewer-name'>{review.reviewer}</span>
                <span className='review-date'>{review.date}</span>
            </div>
        </div>
    )
}

// Renders pre-tagged highlighted_review, converting <opi> and <asp> to styled spans
function ReviewText({ text, color }) {
    if (!text) return null;

    // Split on <opi>...</opi> and <asp>...</asp> tags, keeping the delimiters
    const parts = text.split(/(<opi>.*?<\/opi>|<asp>.*?<\/asp>)/g);

    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('<opi>')) {
                    const inner = part.replace(/<\/?opi>/g, '');
                    return <span key={i} className="highlight-opinion" style={{ color }}>{inner}</span>;
                }
                if (part.startsWith('<asp>')) {
                    const inner = part.replace(/<\/?asp>/g, '');
                    return <span key={i} className="highlight-aspect">{inner}</span>;
                }
                return part;
            })}
        </>
    );
}