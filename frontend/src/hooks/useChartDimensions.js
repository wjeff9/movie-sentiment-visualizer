import { useState, useEffect, useRef } from 'react';

export function useChartDimensions() {
    // Create a ref to attach to the container div
    const ref = useRef();

    // Store the dimensions in state. Default to 0 to identify if unmeasured
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        // If the ref isn't attached to anything yet, do nothing
        if (!ref.current) return;

        // Built-in browser API that detects when a DOM element changes size
        const resizeObserver = new ResizeObserver(entries => {
            // entries[0] is the div we are watching
            const { width, height } = entries[0].contentRect;

            // Only update state if the dimensions actually changed
            if (dimensions.width !== width || dimensions.height !== height) {
                setDimensions({ width, height });
            }
        });

        // Start watching our container
        resizeObserver.observe(ref.current);

        // Cleanup: stop watching when the component unmounts
        return () => resizeObserver.disconnect();
    }, [dimensions.width, dimensions.height]);

    // Returns the ref (to attach) and the dimensions (to use)
    return [ref, dimensions];
}
