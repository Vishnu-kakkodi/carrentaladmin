import React from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import AdminLayout from './components/AdminLayout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Vehicles from './pages/Vehicles';
import Bookings from './pages/Bookings';
import AdminBannerManager from './pages/AdminBannerManager';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Staff from './pages/Staff';
import PrivateRoute from './components/PrivateRoute'; // import your new private route
import MaintenanceSettings from './pages/Maintanence';
import PremiumDeposits from './pages/PremiumDeposits';
import PaymentLogs from './pages/PaymentLogs';
import Owners from './pages/Owners';
import OwnerVehicles from './pages/OwnerVehicles';
import OwnerBookings from './pages/OwnerBookings';
import OwnerCars from './pages/OwnerCars';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<AdminLogin />} />
        {/* <Route path="/register" element={<AdminRegister />} /> */}

        {/* Protected/Admin Routes */}
        <Route path="/admin" element={<PrivateRoute />}>
          {/* PrivateRoute will render Outlet, which is AdminLayout here */}
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={<Users />} />
            <Route path="staff" element={<Staff />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="banners" element={<AdminBannerManager />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="maintanence" element={<MaintenanceSettings />} />
            <Route path="premium-deposits" element={<PremiumDeposits />} />
            <Route path="settings" element={<Settings />} />
             <Route path="paymentlogs" element={<PaymentLogs />} />
            <Route path="owners" element={<Owners />} />
            <Route path="owner-vehicles" element={<OwnerVehicles />} />
            <Route path="owner-cars" element={<OwnerCars />} />
            <Route path="owner-bookings" element={<OwnerBookings />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
