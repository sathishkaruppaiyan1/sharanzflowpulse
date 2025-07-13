import React from 'react';
import Header from '@/components/layout/Header';
import MobileSidebar from '@/components/layout/MobileSidebar';

interface TrackingProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  user: { email: string; role: string; name: string };
  onLogout: () => void;
}

const Tracking = ({ onMenuClick, isMobileMenuOpen, setIsMobileMenuOpen, user, onLogout }: TrackingProps) => {
  return (
    <>
      <MobileSidebar 
        user={user}
        onLogout={onLogout}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Tracking" onMenuClick={onMenuClick} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-bold mb-4">Tracking Management</h2>
            <p className="text-gray-600">Tracking page content will be implemented here.</p>
          </div>
        </main>
      </div>
    </>
  );
};

export default Tracking;