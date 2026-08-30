import React, { lazy, Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Context Providers
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { CategoryProvider } from "./context/CategoryContext";
import { TransactionProvider } from "./context/TransactionContext";
import { BudgetProvider } from "./context/BudgetContext";
import { ChatProvider } from "./context/ChatContext";

// Layout (small, loads eagerly — needed immediately for auth check)
import AppLayout from "./layouts/AppLayout";

// Auth pages (small, eager — user lands here first when logged out)
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";

// All other pages are lazy-loaded: their JS is fetched only when navigated to
const Dashboard = lazy(() => import("./pages/Dashboard/Dashboard"));
const Transactions = lazy(() => import("./pages/Transactions/Transactions"));
const Budgets = lazy(() => import("./pages/Budgets/Budgets"));
const Reports = lazy(() => import("./pages/Reports/Reports"));
const Profile = lazy(() => import("./pages/Profile/Profile"));
const Settings = lazy(() => import("./pages/Settings/Settings"));
const Insights = lazy(() => import("./pages/Insights/Insights"));

// Shared page-level loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
  </div>
);

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

                    {/* Protected routes — pages are code-split */}
                    <Route path="/" element={<AppLayout />}>
                      <Route
                        index
                        element={<Navigate to="/dashboard" replace />}
                      />
                      <Route
                        path="dashboard"
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <Dashboard />
                          </Suspense>
                        }
                      />
                      <Route
                        path="transactions"
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <Transactions />
                          </Suspense>
                        }
                      />
                      <Route
                        path="budgets"
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <Budgets />
                          </Suspense>
                        }
                      />
                      <Route
                        path="reports"
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <Reports />
                          </Suspense>
                        }
                      />
                      <Route
                        path="analytics"
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <Insights />
                          </Suspense>
                        }
                      />
                      <Route
                        path="profile"
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <Profile />
                          </Suspense>
                        }
                      />
                      <Route
                        path="settings"
                        element={
                          <Suspense fallback={<PageLoader />}>
                            <Settings />
                          </Suspense>
                        }
                      />
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
