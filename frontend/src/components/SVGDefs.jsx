export default function SVGDefs({ colors }) {
    if (!colors) return null;

    return (
        <svg style={{ width: 0, height: 0, position: 'absolute' }} aria-hidden='true' focusable='false'>
            <defs>
                {/* Top-down gradient for positive bars */}
                <linearGradient id='bar-gradient-positive' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor={colors.selected.positive} />
                    <stop offset='50%' stopColor={colors.default.positive} />
                </linearGradient>

                {/* Top-down gradient for negative bars */}
                <linearGradient id='bar-gradient-negative' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='0%' stopColor={colors.selected.negative} />
                    <stop offset='50%' stopColor={colors.default.negative} />
                </linearGradient>
            </defs>
        </svg>
    )
}

