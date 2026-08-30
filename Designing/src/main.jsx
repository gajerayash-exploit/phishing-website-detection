import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
// Design system first: component stylesheets are imported via App's module graph,
// so they must land AFTER index.css to win single-class ties against the
// global primitives (.btn, .card, .input). Reversing this silently neuters
// component overrides like .btn-view.
import './index.css';
import App from './App.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
