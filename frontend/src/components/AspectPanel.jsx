import BarChart from './BarChart';
import { useChartDimensions } from '../hooks/useChartDimensions';
import './AspectPanel.css';
import { useBarChartBandwidth } from '../hooks/useBarChartBandwidth';

export default function AspectPanel({
    aspectData,
    aspectLabels,
    subaspectData,
    subaspectLabels,
    totalSubaspectLabels,
    activeAspect,
    activeSubaspect,
    handleSelectAspect,
    handleSelectSubaspect,
    colors,
    setTooltip
}) {
    const [chartRef, chartDims] = useChartDimensions();
    const chartMargins = { top: 20, right: 10, bottom: 40, left: 100 };
    const gap = 20; // 1.25rem from Dashboard.css

    // Calculate proportional heights so both charts share exact same bar bandwidth
    const { height1: aspectHeight, height2: subaspectHeight } = useBarChartBandwidth(
        chartDims.height,
        aspectLabels.length,
        totalSubaspectLabels ? totalSubaspectLabels.length : 0,
        subaspectLabels.length,
        gap,
        chartMargins
    );

    return (
        <>
            <div className="pane-header">
                <h2>Aspects</h2>
            </div>
            <div className="chart-container" ref={chartRef}>
                {chartDims.width > 0 && aspectHeight > 0 && (
                    <>
                        <BarChart
                            data={aspectData}
                            labels={aspectLabels}
                            dataKey="aspect"
                            width={chartDims.width}
                            height={aspectHeight}
                            margin={chartMargins}
                            colors={colors}
                            barRadius={3}
                            selectedBar={activeAspect}
                            onSelect={handleSelectAspect}
                            setTooltip={setTooltip}
                        />
                        {subaspectData.length > 0 && (
                            <BarChart
                                data={subaspectData}
                                labels={subaspectLabels}
                                dataKey="subaspect"
                                width={chartDims.width}
                                height={subaspectHeight}
                                margin={chartMargins}
                                colors={colors}
                                barRadius={3}
                                selectedBar={activeSubaspect}
                                onSelect={handleSelectSubaspect}
                                setTooltip={setTooltip}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    );
}
