import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

const restoreGitHubPagesPath = () => {
    const params = new URLSearchParams(window.location.search);
    const redirectedPath = params.get('p');
    if (!redirectedPath) return;

    params.delete('p');
    const nextSearch = params.toString();
    const nextPath = redirectedPath.startsWith('/') ? redirectedPath : `/${redirectedPath}`;
    const nextUrl = `${nextPath}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
};

restoreGitHubPagesPath();

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <React.StrictMode>
        <BrowserRouter basename="/idenity">
            <App />
        </BrowserRouter>
    </React.StrictMode>
);
