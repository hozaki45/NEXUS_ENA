import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import DataSources from './pages/DataSources';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import './App.css';

const App: React.FC = () => {
  return (
    <div className="App">
      <AuthProvider>
        <DataProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/data-sources" element={<DataSources />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<Settings />} />
                      </Routes>
                    </Layout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </DataProvider>
      </AuthProvider>
    </div>
  );
};

export default App;