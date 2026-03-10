import './Tooltip.css';

export default function Tooltip({ visible, x, y, content }) {
    if (!visible || !content) return null;

    // Use absolute positioning to stick the tooltip to the mouse cursor
    const style = {
        left: x + 10, // Add a small offset so cursor doesn't block the tooltip
        top: y + 10,
    };

    return (
        <div className="custom-tooltip" style={style}>
            {content}
        </div>
    );
}
