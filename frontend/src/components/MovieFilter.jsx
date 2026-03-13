import React from 'react';
import './MovieFilter.css';

export default function MovieFilter({ movies, activeMovie, onSelect }) {
    return (
        <div className="movie-filter">
            <select
                id="movie-select"
                value={activeMovie || ''}
                onChange={(e) => onSelect(e.target.value || null)}
                className="movie-select-dropdown"
            >
                {movies.map((title) => (
                    <option key={title} value={title}>
                        {title}
                    </option>
                ))}
            </select>
        </div>
    );
}