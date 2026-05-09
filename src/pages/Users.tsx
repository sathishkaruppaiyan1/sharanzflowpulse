
import React from 'react';
import Header from '@/components/layout/Header';
import UserManagement from '@/components/settings/UserManagement';

const Users = () => {
  return (
    <div className="flex flex-col h-full">
      <Header title="Users" showSearch={false} />
      
      <div className="flex-1 p-6 bg-gray-50 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <UserManagement />
        </div>
      </div>
    </div>
  );
};

export default Users;
