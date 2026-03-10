import { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './components/Dashboard';
import SVGDefs from './components/SVGDefs';

const colors = {
  default: { positive: '#9ECE6A', negative: '#F7768E' },
  selected: { positive: '#BB9AF7', negative: '#BB9AF7' }
};



function App() {
  return (
    <div className='app-container'>
      <SVGDefs colors={colors} />
      <header>
        <h1>Movie Sentiment Analysis</h1>
      </header>
      <main>
        <Dashboard colors={colors} />
      </main>
    </div>
  )
}

export default App

