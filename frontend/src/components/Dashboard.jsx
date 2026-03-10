import './Dashboard.css'
import './../App.css'
import BarChart from './BarChart';
import BubbleChart from './BubbleChart';
import ReviewPanel from './ReviewPanel';
import Tooltip from './Tooltip';
import AspectPanel from './AspectPanel';
import { useDashboardData } from '../hooks/useDashboardData';

import { useState } from 'react';

export default function Dashboard({ colors }) {
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null });

    // Logic Layer (Data Fetching, Processing, State)
    const {
        aspectData,
        aspectLabels,
        subaspectData,
        subaspectLabels,
        opinionData,
        activeNode,
        handleSelectBubble,
        activeAspect,
        activeSubaspect,
        handleSelectAspect,
        handleSelectSubaspect,
        loading,
        totalSubaspectLabels
    } = useDashboardData();

    return (
        <div className='dashboard-grid'>
            {/* LEFT PANE: Aspects (Bar Charts) */}
            <aside className='pane left-pane'>
                <AspectPanel
                    aspectData={aspectData}
                    aspectLabels={aspectLabels}
                    subaspectData={subaspectData}
                    subaspectLabels={subaspectLabels}
                    totalSubaspectLabels={totalSubaspectLabels}
                    activeAspect={activeAspect}
                    activeSubaspect={activeSubaspect}
                    handleSelectAspect={handleSelectAspect}
                    handleSelectSubaspect={handleSelectSubaspect}
                    colors={colors}
                    setTooltip={setTooltip}
                />
            </aside>

            {/* CENTER PANE: Bubble Chart */}
            <section className='pane center-pane'>
                <BubbleChart
                    data={opinionData}
                    colors={colors}
                    selectedBubble={activeNode?.id || null}
                    onSelect={handleSelectBubble}
                    setTooltip={setTooltip}
                />
            </section>

            {/* RIGHT PANE: Reviews */}
            <aside className='pane right-pane'>
                {/* Use original_text from the json triplets */}
                <ReviewPanel
                    opinion={activeNode?.opinion || null}
                    reviews={activeNode?.reviews || []}
                    highlightColor={activeNode ? colors.default[activeNode.sentiment] : null}
                />
            </aside>
            <Tooltip
                visible={tooltip.visible}
                x={tooltip.x}
                y={tooltip.y}
                content={tooltip.content}
            />
        </div>
    )
}