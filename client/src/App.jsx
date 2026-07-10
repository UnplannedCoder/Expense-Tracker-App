import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CategoryProvider } from './context/CategoryContext';
import { TransactionProvider } from './context/TransactionContext';
import { BudgetProvider } from './context/BudgetContext';
import { ChatProvider } from './context/ChatContext';

// Layouts & Pages
import AppLayout from './layouts/AppLayout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import Transactions from './pages/Transactions/Transactions';
import Budgets from './pages/Budgets/Budgets';
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import Insights from './pages/Insights/Insights';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CategoryProvider>
          <TransactionProvider>
            <BudgetProvider>
              <ChatProvider>
                <Router>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected routes */}
                      <Route path="/" element={<AppLayout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="transactions" element={<Transactions />} />
                        <Route path="budgets" element={<Budgets />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="analytics" element={<Insights />} />
                        <Route path="profile" element={<Profile />} />
                        <Route path="settings" element={<Settings />} />
                      </Route>

                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Router>
              </ChatProvider>
            </BudgetProvider>
          </TransactionProvider>
        </CategoryProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
