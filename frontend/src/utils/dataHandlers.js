/**
 * Performs data wrangling for the "aspect sentiment counts" bar chart.
 * 
 * @param {Array} data - Array of triplet objects: { aspect, opinion, sentiment, ... }
 * @returns {Array} Array of aspect-to-sentiment-counts objects: { aspect, positive, negative }
 */
export function getSentimentCountsByAspect(data, aspect) {
    const sentimentCounts = data.reduce((acc, triplet) => {
        const key = triplet[aspect];
        if (!key) return acc;
        acc[key] = acc[key] || { positive: 0, negative: 0 }
        if (triplet.sentiment.toLowerCase() === 'positive') {
            acc[key].positive++;
        } else if (triplet.sentiment.toLowerCase() === 'negative') {
            acc[key].negative++;
        }
        return acc;
    }, {})

    return Object.entries(sentimentCounts).map(([key, counts]) => ({
        [aspect]: key,
        ...counts
    })).sort((a, b) => {
        const totalA = a.positive + a.negative;
        const totalB = b.positive + b.negative;

        // 1. Sort by total count (Descending)
        if (totalB !== totalA) {
            return totalB - totalA;
        }

        // 2. Sort by positive count (Descending)
        if (b.positive !== a.positive) {
            return b.positive - a.positive;
        }

        // 3. Sort alphabetically (Ascending A-Z)
        return String(a[aspect]).localeCompare(String(b[aspect]));
    });
}

/**
 * Groups triplets by opinion and counts frequencies for a bubble chart.
 * 
 * @param {Array} data - Array of triplet objects: { opinion, sentiment, ... }
 * @returns {Array} Array of opinion objects: { opinion, sentiment, count, reviews }
 */
export function getSentimentCountsByOpinion(data) {
    const grouped = data.reduce((acc, triplet) => {
        // Compose key from opinion and sentiment to separate opposites
        const key = `${triplet.opinion}-${triplet.sentiment}`;

        if (!acc[key]) {
            acc[key] = {
                id: key,  // For identifying bubbles later
                opinion: triplet.opinion,
                sentiment: triplet.sentiment,
                count: 0,
                reviews: []
            };
        }
        acc[key].count++;

        // Keep array of relevant review data to avoid searching later
        const reviewData = {
            text: triplet.highlightedReview,
            reviewer: triplet.criticName,
            date: triplet.reviewDate
        }
        acc[key].reviews.push(reviewData);

        return acc;
    }, {});

    return Object.values(grouped);
}

export function titleCase(str) {
    if (!str) return str;
    return str.toLowerCase().replace(/(?:^|\s|[(\-])[a-z]/g, (match) => match.toUpperCase());
}