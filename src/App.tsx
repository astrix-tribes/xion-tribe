import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext';
import MainLayout from './components/MainLayout';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import TribePage from './pages/TribePage';
import CreateTribePage from './pages/CreateTribePage';
import TribesPage from './components/TribesPage';
import './index.css';

function App() {
  return (
    <WalletProvider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/tribes" element={<TribesPage />} />
            <Route path="/tribe/:id" element={<TribePage />} />
            <Route path="/tribe/create" element={<CreateTribePage />} />
            <Route path="/tribe/edit/:id" element={<TribesPage editMode={true} />} />
          </Routes>
        </MainLayout>
      </Router>
    </WalletProvider>
  );
}

export default App; 