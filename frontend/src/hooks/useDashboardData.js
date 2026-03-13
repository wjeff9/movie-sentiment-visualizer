import { useState, useEffect, useMemo, useCallback } from 'react';
import { getSentimentCountsByAspect, getSentimentCountsByOpinion, titleCase } from '../utils/dataHandlers';

/**
 * useDashboardData: Orchestrates the data layer for the Sentiment Dashboard.
 * 
 * - Logic Separation: Decouples fetching/processing from the UI layout.
 * - Referential Stability: useMemo ensures D3 simulations don't reset unless raw data changes.
 * - Stable Callbacks: useCallback prevents child re-renders.
 */
export function useDashboardData() {
    const [data, setData] = useState([]);
    const [activeMovie, setActiveMovie] = useState(null);
    const [activeNode, setActiveNode] = useState(null);
    const [activeAspect, setActiveAspect] = useState(null);
    const [activeSubaspect, setActiveSubaspect] = useState(null);

    // Fetch data from triplets.json
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Use Vite's BASE_URL to construct the correct path for GitHub Pages
                const basePath = import.meta.env.BASE_URL;
                const response = await fetch(`${basePath}data/triplets.json`);
                const rawData = await response.json();

                // Title case data immediately after fetching
                const normalizedData = rawData.map(d => ({
                    ...d,
                    aspect: titleCase(d.aspect),
                    subaspect: titleCase(d.subaspect)
                }));

                setData(normalizedData);
                normalizedData.length > 0 ? setActiveMovie(normalizedData[0].title) : setActiveMovie(null);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        };
        fetchData();
    }, []);

    // List of movie titles for drop down
    const movieTitles = useMemo(() => {
        return [...new Set(data.map(d => d.title))].sort();  // Set removes duplicates
    }, [data])

    // Data filtered by active movie
    const movieData = useMemo(() => {
        return activeMovie ? data.filter(d => d.title === activeMovie) : data;
    }, [data, activeMovie])

    // Memoize processed data to ensure referential stability
    // This stops the BubbleChart simulation from restarting on every state update
    const opinionData = useMemo(() => {
        let filteredData = movieData;
        if (activeSubaspect) {
            filteredData = movieData.filter(d => d.subaspect === activeSubaspect);
        } else if (activeAspect) {
            filteredData = movieData.filter(d => d.aspect === activeAspect);
        }
        return getSentimentCountsByOpinion(filteredData);
    }, [movieData, activeAspect, activeSubaspect]);

    const aspectData = useMemo(() => getSentimentCountsByAspect(movieData, 'aspect'), [movieData]);
    const aspectLabels = useMemo(() => aspectData.map(d => d.aspect), [aspectData]);

    const subaspectData = useMemo(() => {
        const isAspectSelected = activeAspect !== null;
        const filteredData = movieData
            .filter(d => d.aspect.toLowerCase() !== 'general')
            .filter(d => isAspectSelected ? d.aspect === activeAspect : true);

        return getSentimentCountsByAspect(filteredData, 'subaspect');
    }, [movieData, activeAspect]);

    const totalSubaspectLabels = useMemo(() => {
        const sortedData = getSentimentCountsByAspect(movieData, 'subaspect');
        return sortedData.map(d => d.subaspect);
    }, [movieData]);

    const subaspectLabels = useMemo(() => {
        const activeSubaspects = new Set(subaspectData.map(d => d.subaspect));
        return totalSubaspectLabels.filter(label => activeSubaspects.has(label));
    }, [totalSubaspectLabels, subaspectData]);

    // Selection Handlers
    const handleSelectMovie = useCallback((movieTitle) => {
        setActiveMovie(movieTitle);
        setActiveAspect(null);
        setActiveSubaspect(null);
        setActiveNode(null);
    })

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
        activeMovie,
        movieTitles,
        handleSelectMovie,
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
