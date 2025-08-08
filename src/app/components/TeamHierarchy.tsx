"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { HiUser, HiShieldCheck } from 'react-icons/hi';

interface TeamMember {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'engineer' | 'technician' | 'viewer';
  status: 'active' | 'pending' | 'invited';
  invitedAt?: string;
  joinedAt?: string;
  position?: string;
  department?: string;
  company?: string;
  phone?: string;
  employeeId?: string;
  photoURL?: string;
}

interface TeamHierarchyProps {
  teamMembers: TeamMember[];
  invites: TeamMember[];
}

const TeamHierarchy: React.FC<TeamHierarchyProps> = ({ teamMembers, invites }) => {
  const allMembers = [...teamMembers, ...invites];
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-500';
      case 'engineer':
        return 'bg-blue-500';
      case 'technician':
        return 'bg-green-500';
      case 'viewer':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'active':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'pending':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      case 'invited':
        return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const nameParts = name.trim().split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0].charAt(0).toUpperCase()}${nameParts[nameParts.length - 1].charAt(0).toUpperCase()}`;
      } else {
        return name.charAt(0).toUpperCase();
      }
    } else if (email) {
      const emailParts = email.split('@')[0].split('.');
      if (emailParts.length >= 2) {
        return `${emailParts[0].charAt(0).toUpperCase()}${emailParts[emailParts.length - 1].charAt(0).toUpperCase()}`;
      } else {
        return email.charAt(0).toUpperCase();
      }
    }
    return '?';
  };

  const getRoleLabel = (role: string, position?: string) => {
    if (position) {
      return position;
    }
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'engineer':
        return 'Editor';
      case 'technician':
        return 'Field Staff';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  const admins = allMembers.filter(m => m.role === 'admin');
  const editors = allMembers.filter(m => m.role === 'engineer');
  const fieldStaff = allMembers.filter(m => m.role === 'technician');
  const viewers = allMembers.filter(m => m.role === 'viewer');

  return (
    <div className="relative min-h-[600px]">
      {/* Main Hierarchy - Centered */}
      <div className="flex justify-center">
        <div className="flex flex-col items-center space-y-8 max-w-4xl">
          {/* Admins - Top Level */}
          <div className="text-center">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Administrators</h3>
              <div className="w-32 h-1 bg-red-500 rounded-full mx-auto"></div>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {admins.map((member) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-lg p-4 min-w-[200px] border border-gray-200"
                >
                  <div className="flex items-center space-x-4">
                    {/* Left Side - Initials Circle and Status */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`w-12 h-12 rounded-full ${getRoleColor(member.role)} flex items-center justify-center`}>
                        <span className="text-white font-bold text-lg">
                          {getInitials(member.name, member.email)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIndicator(member.status)}
                        <span className="text-xs text-gray-600">
                          {member.status === 'active' ? 'Active' : member.status === 'pending' ? 'Pending' : 'Invited'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Right Side - Name, Role, Employer */}
                    <div className="flex-1 text-center">
                      <div className="text-sm font-semibold text-gray-900">
                        {member.name || member.email.split('@')[0]}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {getRoleLabel(member.role, member.position)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {member.company || 'N/A'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {admins.length === 0 && (
                <div className="bg-white rounded-lg shadow-lg p-4 min-w-[200px] border border-gray-200 border-dashed">
                  <div className="text-center">
                    <HiShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm text-gray-500">No Admins</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Editors - Second Level */}
          <div className="text-center">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Editors</h3>
              <div className="w-24 h-1 bg-blue-500 rounded-full mx-auto"></div>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {editors.map((member) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-md p-3 min-w-[180px] border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    {/* Left Side - Initials Circle and Status */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`w-10 h-10 rounded-full ${getRoleColor(member.role)} flex items-center justify-center`}>
                        <span className="text-white font-bold text-base">
                          {getInitials(member.name, member.email)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIndicator(member.status)}
                        <span className="text-xs text-gray-600">
                          {member.status === 'active' ? 'Active' : member.status === 'pending' ? 'Pending' : 'Invited'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Right Side - Name, Role, Employer */}
                    <div className="flex-1 text-center">
                      <div className="text-sm font-semibold text-gray-900">
                        {member.name || member.email.split('@')[0]}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {getRoleLabel(member.role, member.position)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {member.company || 'N/A'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {editors.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-3 min-w-[180px] border border-gray-200 border-dashed">
                  <div className="text-center">
                    <HiUser className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                    <div className="text-xs text-gray-500">No Editors</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Field Staff - Third Level */}
          <div className="text-center">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Field Staff</h3>
              <div className="w-20 h-1 bg-green-500 rounded-full mx-auto"></div>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {fieldStaff.map((member) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-md p-3 min-w-[160px] border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    {/* Left Side - Initials Circle and Status */}
                    <div className="flex flex-col items-center space-y-2">
                      <div className={`w-8 h-8 rounded-full ${getRoleColor(member.role)} flex items-center justify-center`}>
                        <span className="text-white font-bold text-sm">
                          {getInitials(member.name, member.email)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {getStatusIndicator(member.status)}
                        <span className="text-xs text-gray-600">
                          {member.status === 'active' ? 'Active' : member.status === 'pending' ? 'Pending' : 'Invited'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Right Side - Name, Role, Employer */}
                    <div className="flex-1 text-center">
                      <div className="text-sm font-semibold text-gray-900">
                        {member.name || member.email.split('@')[0]}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {getRoleLabel(member.role, member.position)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {member.company || 'N/A'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {fieldStaff.length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-3 min-w-[160px] border border-gray-200 border-dashed">
                  <div className="text-center">
                    <HiUser className="w-6 h-6 mx-auto mb-1 text-gray-400" />
                    <div className="text-xs text-gray-500">No Field Staff</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - View-Only Access (Same containers as everyone else) */}
      {viewers.length > 0 && (
        <div className="absolute right-0 top-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <HiUser className="w-5 h-5 mr-2 text-gray-600" />
            View-Only Access (Clients)
          </h3>
          <div className="space-y-3">
            {viewers.map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-lg shadow-md p-3 min-w-[160px] border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  {/* Left Side - Initials Circle and Status */}
                  <div className="flex flex-col items-center space-y-2">
                    <div className={`w-8 h-8 rounded-full ${getRoleColor(member.role)} flex items-center justify-center`}>
                      <span className="text-white font-bold text-sm">
                        {getInitials(member.name, member.email)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getStatusIndicator(member.status)}
                      <span className="text-xs text-gray-600">
                        {member.status === 'active' ? 'Active' : member.status === 'pending' ? 'Pending' : 'Invited'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Right Side - Name, Role, Employer */}
                  <div className="flex-1 text-center">
                    <div className="text-sm font-semibold text-gray-900">
                      {member.name || member.email.split('@')[0]}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {getRoleLabel(member.role, member.position)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {member.company || 'N/A'}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamHierarchy;
