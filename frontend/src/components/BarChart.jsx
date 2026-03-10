import { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import './BarChart.css';

export default function BarChart({ data, labels, dataKey = 'aspect', width, height, margin, colors, barRadius = 0, selectedBar = null, onSelect, setTooltip }) {
    // Dimensions
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // X-axis measures sentiment count
    const xScale = useMemo(() => {
        const maxVal = d3.max(data, d => d.positive + d.negative) || 10;

        return d3.scaleLinear()
            .domain([0, maxVal])
            .range([0, innerWidth])
            .nice();  // Rounds domain ends to clean numbers
    }, [data, innerWidth]);

    // Y-axis contains categories
    const yScale = useMemo(() => {
        return d3.scaleBand()
            .domain(labels)
            .range([0, innerHeight])
            .padding(0.2);
    }, [labels, innerHeight])

    return (
        <>
            <svg width={width} height={height}>
                <g transform={`translate(${margin.left}, ${margin.top})`}>
                    <Axes xScale={xScale} yScale={yScale} innerHeight={innerHeight} />
                    <Bars
                        data={data}
                        dataKey={dataKey}
                        xScale={xScale}
                        yScale={yScale}
                        innerWidth={innerWidth}
                        colors={colors}
                        barRadius={barRadius}
                        selectedBar={selectedBar}
                        onSelect={onSelect}
                        setTooltip={setTooltip}
                    />
                </g>
            </svg>
        </>
    );
}


function Axes({ xScale, yScale, innerHeight }) {
    return (
        <g className='axes'>
            <Axis scale={xScale} orient='bottom' transform={`translate(0, ${innerHeight})`} />
            <Axis scale={yScale} orient='left' />
        </g>
    )
}


function Axis({ scale, orient, transform }) {
    const axisRef = useRef(null);

    useEffect(() => {
        // Decide which D3 axis generator to use
        const axisGenerator = orient === 'left' ? d3.axisLeft : d3.axisBottom
        const axis = axisGenerator(scale).ticks(4);

        d3.select(axisRef.current).call(axis);
    }, [scale, orient])

    return <g className='axis' ref={axisRef} transform={transform} />
}


function Bars({ data, dataKey, xScale, yScale, innerWidth, colors, barRadius, selectedBar, onSelect, setTooltip }) {
    // Prepare stacked data
    const stackedRects = useMemo(() => {
        // Prevents D3 from stacking undefined data
        if (!data || !data.length) return [];

        // Calculate stack coordinates
        const stackGenerator = d3.stack()
            .keys(['positive', 'negative']);

        return stackGenerator(data)
    }, [data]);

    return (
        <g className='bars'>
            {data.map((d, i) => (
                <BarComplete
                    key={d[dataKey]}
                    posRect={stackedRects[0][i]}
                    negRect={stackedRects[1][i]}
                    aspect={d[dataKey]}
                    xScale={xScale}
                    yScale={yScale}
                    innerWidth={innerWidth}
                    colors={colors}
                    barRadius={barRadius}
                    gradientId='bar-glow'
                    isSelected={selectedBar === d[dataKey]}
                    onSelect={() => onSelect(d[dataKey])}
                    setTooltip={setTooltip}
                />
            ))}
        </g>
    )
}


function BarComplete({ posRect, negRect, aspect, xScale, yScale, innerWidth, colors, barRadius, gradientId, isSelected, onSelect, setTooltip }) {
    const [isHovered, setIsHovered] = useState(false);

    // Tooltip content
    const posCount = posRect.data.positive;
    const negCount = posRect.data.negative;
    const totalCount = posCount + negCount;
    const posPercent = totalCount > 0 ? Math.round((posCount / totalCount) * 100) : 0;
    const negPercent = totalCount > 0 ? Math.round((negCount / totalCount) * 100) : 0;

    const handleMouseMove = (e) => {
        setIsHovered(true);
        if (setTooltip) {
            setTooltip({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                content: (
                    <>
                        <h4>{aspect}</h4>
                        <p>Total Mentions <strong>{totalCount}</strong></p>
                        <p style={{ color: colors.default.positive }}>Positive <strong>{posPercent}%</strong></p>
                        <p style={{ color: colors.default.negative }}>Negative <strong>{negPercent}%</strong></p>
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
            className='bar'
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={onSelect}
            style={{ cursor: 'pointer' }}
        >
            <BarHitbox
                x={0}
                y={yScale(aspect)}
                width={innerWidth}
                height={yScale.bandwidth()}
                borderRadius={barRadius}
                isHovered={isHovered}
                isSelected={isSelected}
                gradientId={gradientId}
            />
            <BarSegment
                key={`${aspect}-positive`}
                x={xScale(posRect[0])}
                y={yScale(aspect)}
                width={xScale(posRect[1]) - xScale(posRect[0])}
                height={yScale.bandwidth()}
                fill={isSelected ? "url(#bar-gradient-positive)" : colors.default.positive}
                stroke={isSelected ? colors.selected.positive : colors.default.positive}
                opacity={isHovered ? 1 : 0.5}
                barRadius={barRadius}
            />
            <BarSegment
                key={`${aspect}-negative`}
                x={xScale(negRect[0])}
                y={yScale(aspect)}
                width={xScale(negRect[1]) - xScale(negRect[0])}
                height={yScale.bandwidth()}
                fill={isSelected ? "url(#bar-gradient-negative)" : colors.default.negative}
                stroke={isSelected ? colors.selected.negative : colors.default.negative}
                opacity={isHovered ? 1 : 0.5}
                barRadius={barRadius}
            />
        </g>
    )
}

function BarSegment({ x, y, width, height, fill, stroke, opacity = 0.5, barRadius }) {
    return (
        <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fill}
            fillOpacity={opacity}
            stroke={stroke}
            rx={barRadius}
        />
    )
}

function BarHitbox({ x, y, width, height, borderRadius, isHovered, isSelected, gradientId }) {
    return (
        <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={isSelected ? 'transparent' : "#fff"}
            rx={borderRadius}
            opacity={isSelected ? 1 : (isHovered ? 0.05 : 0)}
        />
    )
}