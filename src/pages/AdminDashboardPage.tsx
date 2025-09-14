import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UserManagement from '../components/admin/UserManagement';
import ProductManagement from '../components/admin/ProductManagement';
import Reports from '../components/admin/Reports';
import ReprintReceiptReport from '../components/admin/ReprintReceiptReport';
import PrinterSettings from '../components/admin/PrinterSettings';
import CompanyProfile from '../components/admin/CompanyProfile';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import ManualReceiptsReport from '../components/admin/ManualReceiptsReport';
import GoogleDriveBackup from '../components/admin/GoogleDriveBackup'; // NEW IMPORT
import { Users, ShoppingCart, BarChart2, Printer, Settings, LogOut, Building, ReceiptText, Menu } from 'lucide-react';
import EmailBackup from '../components/admin/EmailBackup'; // NEW IMPORT

const AdminDashboardPage = () => {
  const { logout } = useAuth();
  const [activeSection, setActiveSection] = useState('users');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const sections = {
    users: { component: <UserManagement />, label: 'User Management', icon: Users, disabled: false },
    products: { component: <ProductManagement />, label: 'Product Management', icon: ShoppingCart, disabled: true },
    reports: { component: <Reports />, label: 'View Reports', icon: BarChart2, disabled: true },
    reprintReceipt: { component: <ReprintReceiptReport />, label: 'Reprint Receipt', icon: Printer, disabled: true },
    printerSettings: { component: <PrinterSettings />, label: 'Printer Settings', icon: Settings, disabled: true },
    companyProfile: { component: <CompanyProfile />, label: 'Company Profile', icon: Building, disabled: false },
    manualReceiptsReport: { component: <ManualReceiptsReport />, label: 'Manual Receipts Report', icon: ReceiptText, disabled: false },
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-100 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className={`w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 ${isSidebarOpen ? "flex" : "hidden"} md:flex`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Panel</h2>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {Object.entries(sections).map(([key, { label, icon: Icon, disabled }]) => (
            <Button
              key={key}
              variant={activeSection === key ? 'secondary' : 'ghost'}
              className="w-full justify-start text-base font-normal transition-all duration-200 ease-in-out transform hover:scale-105"
              onClick={() => { setActiveSection(key); setIsSidebarOpen(false); }} // Close sidebar on item click
              disabled={disabled}
            >
              <Icon className="mr-3 h-5 w-5" />
              {label}
            </Button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Button onClick={logout} className="w-full justify-start text-base font-normal" variant="ghost">
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto"> {/* Adjusted padding for small screens */}
        <div className="flex items-center justify-between mb-4 md:hidden"> {/* Hamburger menu for small screens */}
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
        </div>
        <Card className="p-6 bg-white dark:bg-gray-900 shadow-lg rounded-xl">
          <div
            key={activeSection}
            className="animate-fade-in-up"
          >
            {sections[activeSection].component}
            <EmailBackup /> {/* NEW COMPONENT */}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboardPage;