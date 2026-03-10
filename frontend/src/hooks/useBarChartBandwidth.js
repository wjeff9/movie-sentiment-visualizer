import { useMemo } from 'react';

/**
 * Calculates proportional heights for stacked bar charts to ensure they share the exact same bar bandwidth.
 * 
 * @param {number} availableHeight - Total height available for the charts (e.g. from useChartDimensions)
 * @param {number} dataLength1 - Number of items in the first chart
 * @param {number} dataLength2 - Number of total items in the second chart (for static bandwidth calculation)
 * @param {number} dynamicLength2 - Number of visible items in the second chart (for actual height calculation)
 * @param {number} gap - Gap between the two charts in pixels (default 20)
 * @param {object} margins - Margin object containing top and bottom margins { top, bottom }
 * @param {number} minBandwidth - Minimum allowed bandwidth in pixels (default 5)
 * @returns {object} Object containing calculated heights { height1, height2 }
 */
export function useBarChartBandwidth(availableHeight, dataLength1, dataLength2, dynamicLength2, gap = 20, margins = { top: 20, bottom: 40 }, minBandwidth = 5) {
    return useMemo(() => {
        let height1 = 0;
        let height2 = 0;

        if (availableHeight > 0) {
            const marginY = margins.top + margins.bottom;
            const totalItems = Math.max(dataLength1 + dataLength2, 1);
            const availableInnerHeight = availableHeight - gap - (marginY * 2);
            const sharedBandwidth = Math.max(availableInnerHeight / totalItems, minBandwidth);

            height1 = dataLength1 * sharedBandwidth + marginY;
            height2 = dynamicLength2 * sharedBandwidth + marginY;
        }

        return { height1, height2 };
    }, [availableHeight, dataLength1, dataLength2, dynamicLength2, gap, margins.top, margins.bottom, minBandwidth]);
}
