import { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './components/Dashboard';
import SVGDefs from './components/SVGDefs';
import MovieFilter from './components/MovieFilter';
import { useDashboardData } from './hooks/useDashboardData';

const colors = {
  default: { positive: '#9ECE6A', negative: '#F7768E' },
  selected: { positive: '#BB9AF7', negative: '#BB9AF7' }
};

function App() {
  const dashboard = useDashboardData();

  return (
    <div className='app-container'>
      <SVGDefs colors={colors} />
      <header>
        <h1>Film Critique Sentiment</h1>
        <MovieFilter
          movies={dashboard.movieTitles}
          activeMovie={dashboard.activeMovie}
          onSelect={dashboard.handleSelectMovie}
        />
      </header>
      <main>
        <Dashboard colors={colors} dashboard={dashboard} />
      </main>
    </div>
  )
}

export default App

