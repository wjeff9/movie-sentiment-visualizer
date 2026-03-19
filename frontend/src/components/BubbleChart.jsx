import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import './BubbleChart.css';
import { useChartDimensions } from '../hooks/useChartDimensions';

export default function BubbleChart({ data, colors, selectedBubble = null, onSelect = null, setTooltip }) {
    const [chartRef, chartDims] = useChartDimensions();
    const { width, height } = chartDims;
    // Position state updated at 60 FPS
    const [bubbles, setBubbles] = useState([]);

    // Prepare nodes for phsyics engine
    const nodeData = useMemo(() => {
        if (!data || !data.length) return [];

        const maxCount = d3.max(data, d => d.count);
        const totalCount = d3.sum(data, d => d.count);

        // Target % of the SVG area to prevent crowding
        const targetArea = width * height * 0.67;

        // Calculate scaling factor 'k' so sum(pi * r^2) = targetArea
        let k = Math.sqrt(targetArea / (Math.PI * totalCount));

        // Cap the maximum possible bubble size so a single bubble doesn't dominate
        const maxAllowedRadius = Math.min(width, height) / 4;
        if (k * Math.sqrt(maxCount) > maxAllowedRadius) {
            k = maxAllowedRadius / Math.sqrt(maxCount);
        }

        return data.map(d => ({
            ...d,
            radius: Math.max(10, k * Math.sqrt(d.count)), // Guarantee at least 10px for text legibility
            x: width / 2 + (Math.random() - 0.5) * 50, // Small scatter to prevent infinite collision calculations
            y: height / 2 + (Math.random() - 0.5) * 50
        }))
    }, [data, width, height])

    useEffect(() => {
        if (!nodeData.length) return;

        // Clone to avoid mutating memoized data
        const nodes = nodeData.map(d => ({ ...d }));

        const simulation = d3.forceSimulation(nodes)
            // Pulls bubbles toward their sentiment "home" (Positive up, Negative down)
            .force('xCenter', d3.forceX(width / 2).strength(0.1))
            .force('yCenter', d3.forceY(height / 2).strength(0.45))
            // Larger bubbles should be closer to the ends
            .force('ySentiment', d3.forceY(d => d.sentiment === 'positive' ? 0 : height).strength(d => 0.05 * d.count))
            // Prevents bubbles from overlapping
            .force('collide', d3.forceCollide(d => d.radius).strength(0.7))
            // Subtle push so they aren't totally jammed together
            .force('charge', d3.forceManyBody().strength(-70))
            .velocityDecay(0.525) // Adds "friction" (default 0.4) so they don't teleport outward instantly
            .on('tick', () => {
                const padding = 1; // Keep them slightly off the true edge
                nodes.forEach(d => {
                    d.x = Math.max(d.radius + padding, Math.min(width - d.radius - padding, d.x));
                    d.y = Math.max(d.radius + padding, Math.min(height - d.radius - padding, d.y));
                });
                setBubbles([...nodes]);
            })
            .alpha(1)       // Initial heat
            .alphaDecay(0.03) // Cool down
            .alphaTarget(0.01);

        return () => simulation.stop(); // Cleanup: stop simulation when component unmounts or data changes
    }, [nodeData, width, height]);

    return (
        <div ref={chartRef} style={{ width: '100%', height: '100%' }}>
            {width > 0 && height > 0 && (
                <svg width={width} height={height} className='bubble-chart'>
                    {bubbles.map((node, i) => (
                        <Bubble
                            key={`${node.opinion}-${node.sentiment}`}
                            x={node.x}
                            y={node.y}
                            radius={node.radius}
                            text={node.opinion}
                            selectionColor={colors.selected[node.sentiment]}
                            sentimentColor={colors.default[node.sentiment]}
                            isSelected={node.id === selectedBubble}
                            onClick={() => onSelect(node)}
                            setTooltip={setTooltip}
                            node={node}
                        />
                    ))}
                </svg>
            )}
        </div>
    )
}

function Bubble({ x, y, radius, text, selectionColor, sentimentColor, isSelected, onClick, setTooltip, node }) {
    const [isHovered, setIsHovered] = useState(false);

    // Tooltip content
    const handleMouseMove = (e) => {
        setIsHovered(true);
        if (setTooltip) {
            setTooltip({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                content: (
                    <>
                        <h4>{node.opinion}</h4>
                        {/* <p>Sentiment <strong style={{ color: sentimentColor, textTransform: 'capitalize' }}>{node.sentiment}</strong></p> */}
                        <p>Total Mentions <strong>{node.count}</strong></p>
                    </>
                )
            });
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        if (setTooltip) {
            setTooltip(prev => ({ ...prev, visible: false }));
        }
    };

    return (
        <g
            transform={`translate(${x}, ${y})`}
            className='bubble'
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <circle
                r={radius}
                fill={isSelected ? selectionColor : sentimentColor}
                fillOpacity={isHovered ? 1 : 0.35}
                stroke={isSelected ? selectionColor : sentimentColor}
                onClick={onClick}
            />
            <text
                textAnchor='middle'
                style={{ fontSize: radius / 3 }}
                fill={isHovered ? '#24283B' : '#C0CAF5'}
            >
                <MultilineText text={text} />
            </text>
        </g >
    );
}

function MultilineText({ text, lineHeight = 1.1 }) {
    // Split on space or hyphen (removes the character)
    const words = text.split(/[ -]/);
    const startOffset = -(words.length - 1) * (lineHeight / 2);

    return words.map((word, i) => (
        <tspan
            key={i}
            x="0"
            dy={i === 0 ? `${startOffset + 0.3}em` : `${lineHeight}em`}
        >
            {word.toLowerCase()}
        </tspan>
    ));
}