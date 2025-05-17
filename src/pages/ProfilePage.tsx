import React from 'react';
import ProfileComponent from '../components/ProfilePage';

const ProfilePage: React.FC = () => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Profile</h1>
      </div>
      
      <ProfileComponent />
    </div>
  );
};

export default ProfilePage; 