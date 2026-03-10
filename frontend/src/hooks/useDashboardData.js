import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSentimentCountsByAspect, getSentimentCountsByOpinion } from '../utils/dataHandlers';

/**
 * useDashboardData: Orchestrates the data layer for the Sentiment Dashboard.
 * 
 * - Logic Separation: Decouples fetching/processing from the UI layout.
 * - Referential Stability: useMemo ensures D3 simulations don't reset unless raw data changes.
 * - Stable Callbacks: useCallback prevents child re-renders.
 */
export function useDashboardData() {
    const [data, setData] = useState([]);
    const [activeNode, setActiveNode] = useState(null);
    const [activeAspect, setActiveAspect] = useState(null);
    const [activeSubaspect, setActiveSubaspect] = useState(null);

    // Fetch data from triplets.json
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/data/triplets.json');
                const rawData = await response.json();
                setData(rawData);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        };
        fetchData();
    }, []);

    // Memoize processed data to ensure referential stability
    // This stops the BubbleChart simulation from restarting on every state update
    const opinionData = useMemo(() => {
        let filteredData = data;
        if (activeSubaspect) {
            filteredData = data.filter(d => d.subaspect === activeSubaspect);
        } else if (activeAspect) {
            filteredData = data.filter(d => d.aspect === activeAspect);
        }
        return getSentimentCountsByOpinion(filteredData);
    }, [data, activeAspect, activeSubaspect]);

    const aspectData = useMemo(() => getSentimentCountsByAspect(data, 'aspect'), [data]);
    const aspectLabels = useMemo(() => aspectData.map(d => d.aspect), [aspectData]);

    const subaspectData = useMemo(() => {
        const isAspectSelected = activeAspect !== null;
        const filteredData = data
            // Don't display the "verdict" subaspect because it's just a placeholder for the "verdict" aspect, which has no subaspects
            .filter(d => d.subaspect && d.subaspect?.toLowerCase() !== 'verdict')
            .filter(d => isAspectSelected ? d.aspect === activeAspect : true);

        return getSentimentCountsByAspect(filteredData, 'subaspect');
    }, [data, activeAspect]);

    const totalSubaspectLabels = useMemo(() => {
        const filteredData = data
            .filter(d => d.subaspect && d.subaspect?.toLowerCase() !== 'verdict')

        const sortedData = getSentimentCountsByAspect(filteredData, 'subaspect');
        return sortedData.map(d => d.subaspect);
    }, [data]);

    const subaspectLabels = useMemo(() => {
        const activeSubaspects = new Set(subaspectData.map(d => d.subaspect));
        return totalSubaspectLabels.filter(label => activeSubaspects.has(label));
    }, [totalSubaspectLabels, subaspectData]);

    // Selection Handlers
    const handleSelectBubble = useCallback((node) => {
        // Toggle selection off if clicking the already selected bar
        setActiveNode(prev => prev?.id === node.id ? null : node);
    }, []);

    const handleSelectAspect = useCallback((aspectName) => {
        setActiveAspect(prev => prev === aspectName ? null : aspectName);
        setActiveSubaspect(null); // Clear selected subaspect when aspect changes
        setActiveNode(null); // Clear selected bubble when filter changes
    }, []);

    const handleSelectSubaspect = useCallback((subaspectName) => {
        setActiveSubaspect(prev => prev === subaspectName ? null : subaspectName);
        setActiveNode(null);
    }, []);

    return {
        data,
        opinionData,
        aspectData,
        aspectLabels,
        subaspectData,
        subaspectLabels,
        totalSubaspectLabels,
        activeNode,
        handleSelectBubble,
        activeAspect,
        activeSubaspect,
        handleSelectAspect,
        handleSelectSubaspect,
        loading: data.length === 0
    };
}
