import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';
import AdminDashboardPage from '../pages/AdminDashboardPage';
import SalesReceiptPage from '../pages/SalesReceiptPage';
import ManualReceiptPage from '../pages/ManualReceiptPage';

const ProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && allowedRoles.includes(user.role)) {
    return <Outlet />;
  }

  // Redirect to a default page if role doesn't match
  if (user && user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user && user.role === 'sales_person') {
    return <Navigate to="/sales/receipt" replace />;
  }

  return <Navigate to="/login" replace />;
};

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Default route always goes to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

      <Route 
        path="/" 
        element={!isAuthenticated ? <Navigate to="/login" /> : (user?.role === 'admin' ? <Navigate to="/admin/dashboard" /> : <Navigate to="/sales/receipt" />)} 
      />
      
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
      </Route>
      
      <Route element={<ProtectedRoute allowedRoles={['sales_person', 'admin']} />}>
        <Route path="/sales/receipt" element={<ManualReceiptPage />} />
      </Route>
        
    </Routes>
  );
};

export default AppRoutes;
