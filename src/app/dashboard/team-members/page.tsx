"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { HiUserGroup, HiPlus, HiMail, HiUser, HiShieldCheck, HiClock, HiCheckCircle, HiExclamationCircle, HiX, HiViewList, HiChartBar, HiPencil, HiCog, HiEye, HiCheck, HiSortDescending } from 'react-icons/hi';
import { useAuth } from '@/lib/hooks/useAuth';
import TeamHierarchy from '@/app/components/TeamHierarchy';

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

interface InviteRequest {
  email: string;
  role: 'admin' | 'engineer' | 'technician' | 'viewer';
  message?: string;
}

// Profile Details Modal Component
const ProfileDetailsModal = ({ 
  member, 
  isOpen, 
  onClose 
}: { 
  member: TeamMember | null; 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch full profile data when modal opens
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!isOpen || !member) return;
      
      setLoading(true);
      try {
        // If this is the current user, fetch their full profile data
        const { getUserProfile } = await import('@/lib/firebase/firebaseUtils');
        const userProfile = await getUserProfile();
        
        if (userProfile && userProfile.email === member.email) {
          setProfileData(userProfile);
        } else {
          setProfileData(null);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setProfileData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [isOpen, member]);

  if (!isOpen || !member) return null;

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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'engineer':
        return 'Editor';
      case 'technician':
        return 'Field Worker';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending';
      case 'invited':
        return 'Invited';
      default:
        return status;
    }
  };

  const getExpirationStatus = (expiryDate: string | undefined) => {
    if (!expiryDate) return 'valid';
    const expiry = new Date(expiryDate);
    const today = new Date();
    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    
    if (expiry < today) return 'expired';
    if (expiry <= oneMonthFromNow) return 'expiring-soon';
    return 'valid';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Profile Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 h-16 w-16">
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt={member.name || member.email}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-white font-medium text-lg">
                      {getInitials(member.name, member.email)}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {member.name || member.email.split('@')[0]}
                </h3>
                <p className="text-gray-600">{member.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {getRoleLabel(member.role)}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {getStatusText(member.status)}
                  </span>
                </div>
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Position</label>
                <p className="mt-1 text-sm text-gray-900">{member.position || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company</label>
                <p className="mt-1 text-sm text-gray-900">{member.company || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Department</label>
                <p className="mt-1 text-sm text-gray-900">{member.department || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{member.phone || 'N/A'}</p>
              </div>
            </div>

            {/* Licenses and Certifications */}
            {profileData && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Licenses</h4>
                  {profileData.licenses && profileData.licenses.length > 0 ? (
                    <div className="space-y-2">
                      {profileData.licenses.map((license: any) => (
                        <div key={license.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{license.name}</p>
                              <p className="text-sm text-gray-600">#{license.number}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getExpirationStatus(license.expiryDate) === 'valid' 
                                ? 'bg-green-100 text-green-800'
                                : getExpirationStatus(license.expiryDate) === 'expiring-soon'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {getExpirationStatus(license.expiryDate) === 'valid' ? 'Valid' : 
                               getExpirationStatus(license.expiryDate) === 'expiring-soon' ? 'Expiring Soon' : 'Expired'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No licenses found</p>
                  )}
                </div>

                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Certifications</h4>
                  {profileData.certifications && profileData.certifications.length > 0 ? (
                    <div className="space-y-2">
                      {profileData.certifications.map((cert: any) => (
                        <div key={cert.id} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{cert.name}</p>
                              <p className="text-sm text-gray-600">#{cert.number}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              getExpirationStatus(cert.expiryDate) === 'valid' 
                                ? 'bg-green-100 text-green-800'
                                : getExpirationStatus(cert.expiryDate) === 'expiring-soon'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {getExpirationStatus(cert.expiryDate) === 'valid' ? 'Valid' : 
                               getExpirationStatus(cert.expiryDate) === 'expiring-soon' ? 'Expiring Soon' : 'Expired'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No certifications found</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default function TeamMembersPage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [invites, setInvites] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'table' | 'visual'>('table');
  const [inviteForm, setInviteForm] = useState<InviteRequest>({
    email: '',
    role: 'technician',
    message: ''
  });
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userProfiles, setUserProfiles] = useState<{[key: string]: any}>({});
  const [sortKey, setSortKey] = useState<'none' | 'licenses' | 'certifications' | 'expired' | 'expiring'>('none');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [sortMode, setSortMode] = useState<'hierarchy' | 'valid' | 'expired'>('hierarchy');
  const [showCertSortMenu, setShowCertSortMenu] = useState(false);
  const [activeSortBy, setActiveSortBy] = useState<'none' | 'company' | 'status' | 'valid' | 'expired'>('none');
  const [companySortDir, setCompanySortDir] = useState<'asc' | 'desc'>('asc');
  const [statusSortPref, setStatusSortPref] = useState<'active' | 'pending' | 'invited'>('active');
  const [licenseFilter, setLicenseFilter] = useState<'all' | 'valid' | 'expiring' | 'expired'>('all');
  const [certFilter, setCertFilter] = useState<'all' | 'valid' | 'expiring' | 'expired'>('all');

  // Flexible date parsing (supports 'YYYY-MM-DD' and 'DD/MM/YYYY')
  const parseDateFlexible = (value?: string): Date | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Try ISO first
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed);
      return isNaN(d.getTime()) ? null : d;
    }
    // Try DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split('/').map(Number);
      const d = new Date(year, month - 1, day);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  };

  // Determine individual item status (license/cert)
  const getItemStatus = (item: any): 'valid' | 'expiring-soon' | 'expired' => {
    // Prefer explicit status if provided
    if (item?.status === 'expired') return 'expired';
    if (item?.status === 'expiring-soon') return 'expiring-soon';
    // Compute from expiry date
    const expiry = parseDateFlexible(item?.expiryDate);
    if (!expiry) return 'valid';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const oneMonthFromNow = new Date(today);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    if (expiry < today) return 'expired';
    if (expiry <= oneMonthFromNow) return 'expiring-soon';
    return 'valid';
  };

  // Determine overall status for a list (expired > expiring-soon > valid)
  const getOverallStatus = (items: any[]): 'valid' | 'expiring-soon' | 'expired' => {
    if (!items || items.length === 0) return 'valid';
    let hasExpiring = false;
    for (const it of items) {
      const st = getItemStatus(it);
      if (st === 'expired') return 'expired';
      if (st === 'expiring-soon') hasExpiring = true;
    }
    return hasExpiring ? 'expiring-soon' : 'valid';
  };

  // Aggregates for summary chips
  const totals = React.useMemo(() => {
    let licExpired = 0, licExpSoon = 0, certExpired = 0, certExpSoon = 0;
    for (const member of teamMembers) {
      const profile = userProfiles[member.email];
      const licenses = profile?.licenses || [];
      const certs = profile?.certifications || [];
      for (const l of licenses) {
        const st = getItemStatus(l);
        if (st === 'expired') licExpired++;
        else if (st === 'expiring-soon') licExpSoon++;
      }
      for (const c of certs) {
        const st = getItemStatus(c);
        if (st === 'expired') certExpired++;
        else if (st === 'expiring-soon') certExpSoon++;
      }
    }
    return { licExpired, licExpSoon, certExpired, certExpSoon };
  }, [teamMembers, userProfiles]);

  // Load team members on component mount
  useEffect(() => {
    loadTeamMembers();
  }, [user]);

  // Load team members on component mount
  const loadTeamMembers = useCallback(async () => {
    try {
      setLoading(true);
      
      // For now, we'll use mock data since the API might not be set up
      let allTeamMembers: TeamMember[] = [];
      let allInvites: TeamMember[] = [];

      // Load user's profile data and add it to the team members
      if (user) {
        try {
          const { getUserProfile } = await import('@/lib/firebase/firebaseUtils');
          const userProfile = await getUserProfile();
          
          if (userProfile) {
            // Determine role based on position or default to admin
            let role = 'technician'; // default to field staff
            if (userProfile.position) {
              const position = userProfile.position.toLowerCase();
              if (position.includes('admin') || position.includes('manager') || position.includes('director') || position.includes('supervisor') || position.includes('coordinator')) {
                role = 'admin';
              } else if (position.includes('engineer') || position.includes('editor') || position.includes('designer') || position.includes('architect') || position.includes('consultant')) {
                role = 'engineer'; // Maps to "Editor" in display
              } else if (position.includes('technician') || position.includes('worker') || position.includes('operator') || position.includes('specialist') || position.includes('assistant') || position.includes('electrician') || position.includes('plumber') || position.includes('carpenter') || position.includes('mechanic')) {
                role = 'technician'; // Maps to "Field Staff" in display
              } else if (position.includes('viewer') || position.includes('client') || position.includes('guest')) {
                role = 'viewer';
              }
            }

            const currentUserMember = {
              id: userProfile.uid || 'current-user',
              email: userProfile.email,
              name: userProfile.fullName,
              role: role as 'admin' | 'engineer' | 'technician' | 'viewer',
              status: 'active' as const,
              joinedAt: userProfile.startDate ? new Date(userProfile.startDate).toISOString() : new Date().toISOString(),
              position: userProfile.position || 'Electrician',
              department: userProfile.department,
              company: userProfile.company,
              phone: userProfile.phone,
              employeeId: userProfile.employeeId,
              photoURL: userProfile.photoURL || user?.photoURL || undefined
            };

            // Check if current user already exists in the list
            const existingIndex = allTeamMembers.findIndex((member: TeamMember) => member.email === userProfile.email);
            if (existingIndex >= 0) {
              // Update existing entry with profile data
              allTeamMembers[existingIndex] = { ...allTeamMembers[existingIndex], ...currentUserMember };
            } else {
              // Add current user to the list
              allTeamMembers.unshift(currentUserMember);
            }
          }
        } catch (profileError) {
          console.log('Could not load user profile:', profileError);
          // If profile loading fails, still show the user with basic info
          const currentUserMember = {
            id: user.uid || 'current-user',
            email: user.email || '',
            name: user.displayName || user.email?.split('@')[0] || 'User',
            role: 'admin' as const,
            status: 'active' as const,
            joinedAt: new Date().toISOString(),
            position: 'Administrator',
            company: 'thinkcompl.ai',
            photoURL: user.photoURL || undefined
          };

          const existingIndex = allTeamMembers.findIndex((member: TeamMember) => member.email === user.email);
          if (existingIndex >= 0) {
            allTeamMembers[existingIndex] = { ...allTeamMembers[existingIndex], ...currentUserMember };
          } else {
            allTeamMembers.unshift(currentUserMember);
          }
        }
      }
      
      // Add mock data for demonstration
      const mockTeamMembers: TeamMember[] = [
        {
          id: 'mike-chen',
          email: 'mike.chen@thinkcompl.ai',
          name: 'Mike Chen',
          role: 'engineer',
          status: 'active',
          joinedAt: '2023-01-15T00:00:00.000Z',
          position: 'Electrical Engineer',
          department: 'Engineering',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 123-4567',
          employeeId: 'EMP001'
        },
        {
          id: 'sarah-johnson',
          email: 'sarah.johnson@thinkcompl.ai',
          name: 'Sarah Johnson',
          role: 'technician',
          status: 'active',
          joinedAt: '2023-03-20T00:00:00.000Z',
          position: 'Electrician',
          department: 'Operations',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 234-5678',
          employeeId: 'EMP002'
        },
        {
          id: 'david-wilson',
          email: 'david.wilson@thinkcompl.ai',
          name: 'David Wilson',
          role: 'admin',
          status: 'active',
          joinedAt: '2022-11-10T00:00:00.000Z',
          position: 'Project Manager',
          department: 'Management',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 345-6789',
          employeeId: 'EMP003'
        },
        {
          id: 'lisa-garcia',
          email: 'lisa.garcia@thinkcompl.ai',
          name: 'Lisa Garcia',
          role: 'viewer',
          status: 'active',
          joinedAt: '2023-06-05T00:00:00.000Z',
          position: 'Client Relations',
          department: 'Sales',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 456-7890',
          employeeId: 'EMP004'
        },
        {
          id: 'john-smith',
          email: 'john.smith@thinkcompl.ai',
          name: 'John Smith',
          role: 'technician',
          status: 'active',
          joinedAt: '2023-08-15T00:00:00.000Z',
          position: 'Plumber',
          department: 'Operations',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 567-8901',
          employeeId: 'EMP005'
        },
        {
          id: 'emma-davis',
          email: 'emma.davis@thinkcompl.ai',
          name: 'Emma Davis',
          role: 'engineer',
          status: 'active',
          joinedAt: '2023-05-10T00:00:00.000Z',
          position: 'Civil Engineer',
          department: 'Engineering',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 678-9012',
          employeeId: 'EMP006'
        },
        {
          id: 'michael-brown',
          email: 'michael.brown@thinkcompl.ai',
          name: 'Michael Brown',
          role: 'technician',
          status: 'active',
          joinedAt: '2023-07-22T00:00:00.000Z',
          position: 'HVAC Technician',
          department: 'Operations',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 789-0123',
          employeeId: 'EMP007'
        },
        {
          id: 'jessica-lee',
          email: 'jessica.lee@thinkcompl.ai',
          name: 'Jessica Lee',
          role: 'engineer',
          status: 'active',
          joinedAt: '2023-04-12T00:00:00.000Z',
          position: 'Mechanical Engineer',
          department: 'Engineering',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 890-1234',
          employeeId: 'EMP008'
        },
        {
          id: 'robert-taylor',
          email: 'robert.taylor@thinkcompl.ai',
          name: 'Robert Taylor',
          role: 'technician',
          status: 'active',
          joinedAt: '2023-09-01T00:00:00.000Z',
          position: 'Carpenter',
          department: 'Operations',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 901-2345',
          employeeId: 'EMP009'
        },
        {
          id: 'amanda-white',
          email: 'amanda.white@thinkcompl.ai',
          name: 'Amanda White',
          role: 'engineer',
          status: 'active',
          joinedAt: '2023-02-28T00:00:00.000Z',
          position: 'Structural Engineer',
          department: 'Engineering',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 012-3456',
          employeeId: 'EMP010'
        },
        {
          id: 'thomas-anderson',
          email: 'thomas.anderson@thinkcompl.ai',
          name: 'Thomas Anderson',
          role: 'technician',
          status: 'active',
          joinedAt: '2023-10-15T00:00:00.000Z',
          position: 'Welder',
          department: 'Operations',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 123-4567',
          employeeId: 'EMP011'
        },
        {
          id: 'rachel-green',
          email: 'rachel.green@thinkcompl.ai',
          name: 'Rachel Green',
          role: 'viewer',
          status: 'active',
          joinedAt: '2023-11-01T00:00:00.000Z',
          position: 'Client Manager',
          department: 'Sales',
          company: 'thinkcompl.ai',
          phone: '+1 (555) 234-5678',
          employeeId: 'EMP012'
        }
      ];

      // Add mock members to the team members list
      allTeamMembers = [...allTeamMembers, ...mockTeamMembers];
      
      setTeamMembers(allTeamMembers);
      setInvites(allInvites);
      
      // Create mock profile data with licenses and certifications
      const profilesMap: {[key: string]: any} = {};
      
      // Add current user's profile if available
      if (user) {
        try {
          const { getUserProfile } = await import('@/lib/firebase/firebaseUtils');
          const userProfile = await getUserProfile();
          if (userProfile) {
            profilesMap[userProfile.email] = userProfile;
          }
        } catch (error) {
          console.log('Could not load current user profile:', error);
        }
      }

      // Add mock profile data for other team members
      const currentDate = new Date();
      const oneMonthAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const threeMonthsFromNow = new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000);
      const sixMonthsFromNow = new Date(currentDate.getTime() + 180 * 24 * 60 * 60 * 1000);

      profilesMap['mike.chen@thinkcompl.ai'] = {
        uid: 'mike-chen',
        email: 'mike.chen@thinkcompl.ai',
        fullName: 'Mike Chen',
        licenses: [
          {
            id: 'license-1',
            name: 'Professional Engineer License',
            number: 'PE-12345',
            class: 'Professional',
            issuedDate: '2022-01-15',
            expiryDate: '2025-01-15', // Valid
            issuingAuthority: 'State Board of Engineers',
            status: 'valid',
            notes: 'Electrical engineering certification'
          },
          {
            id: 'license-2',
            name: 'Electrical Contractor License',
            number: 'EC-67890',
            class: 'Contractor',
            issuedDate: '2023-06-01',
            expiryDate: '2025-06-01', // Valid
            issuingAuthority: 'Electrical Safety Board',
            status: 'valid',
            notes: 'Electrical contracting and installation'
          }
        ],
        certifications: [
          {
            id: 'cert-1',
            name: 'IEEE Electrical Safety Certification',
            number: 'IEEE-001',
            class: 'Safety',
            issuedDate: '2023-03-01',
            expiryDate: '2026-03-01', // Valid
            issuingAuthority: 'Institute of Electrical and Electronics Engineers',
            status: 'valid',
            notes: 'Electrical safety standards'
          }
        ]
      };

      profilesMap['sarah.johnson@thinkcompl.ai'] = {
        uid: 'sarah-johnson',
        email: 'sarah.johnson@thinkcompl.ai',
        fullName: 'Sarah Johnson',
        licenses: [
          {
            id: 'license-3',
            name: 'Journeyman Electrician License',
            number: 'JEL-45678',
            class: 'Journeyman',
            issuedDate: '2023-08-15',
            expiryDate: '2026-08-15', // Valid
            issuingAuthority: 'Electrical Licensing Board',
            status: 'valid',
            notes: 'Electrical installation and maintenance'
          }
        ],
        certifications: [
          {
            id: 'cert-2',
            name: 'Electrical Safety Training',
            number: 'EST-002',
            class: 'Safety',
            issuedDate: '2023-09-01',
            expiryDate: '2025-09-01', // Valid
            issuingAuthority: 'Electrical Safety Institute',
            status: 'valid',
            notes: 'Electrical safety and code compliance'
          },
          {
            id: 'cert-3',
            name: 'High Voltage Certification',
            number: 'HVC-003',
            class: 'Specialized',
            issuedDate: '2023-07-01',
            expiryDate: '2025-07-01', // Valid
            issuingAuthority: 'High Voltage Safety Board',
            status: 'valid',
            notes: 'High voltage electrical work'
          }
        ]
      };

      profilesMap['david.wilson@thinkcompl.ai'] = {
        uid: 'david-wilson',
        email: 'david.wilson@thinkcompl.ai',
        fullName: 'David Wilson',
        licenses: [
          {
            id: 'license-4',
            name: 'Project Management Professional',
            number: 'PMP-78901',
            class: 'Management',
            issuedDate: '2022-05-01',
            expiryDate: '2025-05-01', // Valid
            issuingAuthority: 'Project Management Institute',
            status: 'valid',
            notes: 'Project management certification'
          }
        ],
        certifications: [
          {
            id: 'cert-4',
            name: 'Six Sigma Black Belt',
            number: 'SSBB-004',
            class: 'Quality',
            issuedDate: '2023-01-01',
            expiryDate: '2026-01-01', // Valid
            issuingAuthority: 'American Society for Quality',
            status: 'valid',
            notes: 'Process improvement methodology'
          }
        ]
      };

      profilesMap['lisa.garcia@thinkcompl.ai'] = {
        uid: 'lisa-garcia',
        email: 'lisa.garcia@thinkcompl.ai',
        fullName: 'Lisa Garcia',
        licenses: [],
        certifications: [
          {
            id: 'cert-5',
            name: 'Sales Certification',
            number: 'SC-005',
            class: 'Sales',
            issuedDate: '2023-02-01',
            expiryDate: '2025-02-01', // Valid
            issuingAuthority: 'Sales Institute',
            status: 'valid',
            notes: 'Professional sales techniques'
          }
        ]
      };

      profilesMap['john.smith@thinkcompl.ai'] = {
        uid: 'john-smith',
        email: 'john.smith@thinkcompl.ai',
        fullName: 'John Smith',
        licenses: [
          {
            id: 'license-5',
            name: 'Master Plumber License',
            number: 'MPL-12345',
            class: 'Master',
            issuedDate: '2023-01-15',
            expiryDate: '2026-01-15', // Valid
            issuingAuthority: 'Plumbing Licensing Board',
            status: 'valid',
            notes: 'Plumbing installation and repair'
          }
        ],
        certifications: [
          {
            id: 'cert-6',
            name: 'Plumbing Safety Training',
            number: 'PST-006',
            class: 'Safety',
            issuedDate: '2023-03-01',
            expiryDate: '2025-03-01', // Valid
            issuingAuthority: 'Plumbing Safety Board',
            status: 'valid',
            notes: 'Plumbing safety and code compliance'
          }
        ]
      };

      profilesMap['emma.davis@thinkcompl.ai'] = {
        uid: 'emma-davis',
        email: 'emma.davis@thinkcompl.ai',
        fullName: 'Emma Davis',
        licenses: [
          {
            id: 'license-6',
            name: 'Professional Engineer License',
            number: 'PEL-67890',
            class: 'Professional',
            issuedDate: '2023-02-01',
            expiryDate: '2026-02-01', // Valid
            issuingAuthority: 'State Board of Engineers',
            status: 'valid',
            notes: 'Civil engineering certification'
          }
        ],
        certifications: [
          {
            id: 'cert-7',
            name: 'Structural Analysis Certification',
            number: 'SAC-007',
            class: 'Technical',
            issuedDate: '2023-04-01',
            expiryDate: '2026-04-01', // Valid
            issuingAuthority: 'Structural Engineering Institute',
            status: 'valid',
            notes: 'Structural analysis and design'
          }
        ]
      };

      profilesMap['michael.brown@thinkcompl.ai'] = {
        uid: 'michael-brown',
        email: 'michael.brown@thinkcompl.ai',
        fullName: 'Michael Brown',
        licenses: [
          {
            id: 'license-7',
            name: 'HVAC Technician License',
            number: 'HTL-11111',
            class: 'Technician',
            issuedDate: '2023-06-01',
            expiryDate: '2026-06-01', // Valid
            issuingAuthority: 'HVAC Licensing Board',
            status: 'valid',
            notes: 'HVAC installation and maintenance'
          }
        ],
        certifications: [
          {
            id: 'cert-8',
            name: 'Refrigeration Certification',
            number: 'RC-008',
            class: 'Technical',
            issuedDate: '2023-08-01',
            expiryDate: '2026-08-01', // Valid
            issuingAuthority: 'Refrigeration Safety Board',
            status: 'valid',
            notes: 'Refrigeration systems and safety'
          }
        ]
      };

      profilesMap['jessica.lee@thinkcompl.ai'] = {
        uid: 'jessica-lee',
        email: 'jessica.lee@thinkcompl.ai',
        fullName: 'Jessica Lee',
        licenses: [
          {
            id: 'license-8',
            name: 'Professional Engineer License',
            number: 'PEL-22222',
            class: 'Professional',
            issuedDate: '2022-03-15',
            expiryDate: '2025-03-15', // Valid
            issuingAuthority: 'State Board of Engineers',
            status: 'valid',
            notes: 'Mechanical engineering certification'
          },
          {
            id: 'license-9',
            name: 'Mechanical Contractor License',
            number: 'MCL-33333',
            class: 'Contractor',
            issuedDate: '2023-01-10',
            expiryDate: '2026-01-10', // Valid
            issuingAuthority: 'Mechanical Contractors Board',
            status: 'valid',
            notes: 'Mechanical systems installation'
          }
        ],
        certifications: [
          {
            id: 'cert-9',
            name: 'ASME Boiler and Pressure Vessel Code',
            number: 'ASME-009',
            class: 'Technical',
            issuedDate: '2023-05-01',
            expiryDate: '2026-05-01', // Valid
            issuingAuthority: 'American Society of Mechanical Engineers',
            status: 'valid',
            notes: 'Boiler and pressure vessel design'
          }
        ]
      };

      profilesMap['robert.taylor@thinkcompl.ai'] = {
        uid: 'robert-taylor',
        email: 'robert.taylor@thinkcompl.ai',
        fullName: 'Robert Taylor',
        licenses: [
          {
            id: 'license-10',
            name: 'Master Carpenter License',
            number: 'MCL-44444',
            class: 'Master',
            issuedDate: '2022-08-01',
            expiryDate: '2025-08-01', // Valid
            issuingAuthority: 'Carpentry Licensing Board',
            status: 'valid',
            notes: 'Carpentry and woodworking'
          }
        ],
        certifications: [
          {
            id: 'cert-10',
            name: 'Woodworking Safety Certification',
            number: 'WSC-010',
            class: 'Safety',
            issuedDate: '2023-06-15',
            expiryDate: '2025-06-15', // Valid
            issuingAuthority: 'Woodworking Safety Institute',
            status: 'valid',
            notes: 'Woodworking safety and techniques'
          }
        ]
      };

      profilesMap['amanda.white@thinkcompl.ai'] = {
        uid: 'amanda-white',
        email: 'amanda.white@thinkcompl.ai',
        fullName: 'Amanda White',
        licenses: [
          {
            id: 'license-11',
            name: 'Professional Engineer License',
            number: 'PEL-55555',
            class: 'Professional',
            issuedDate: '2023-02-01',
            expiryDate: '2026-02-01', // Valid
            issuingAuthority: 'State Board of Engineers',
            status: 'valid',
            notes: 'Structural engineering certification'
          }
        ],
        certifications: [
          {
            id: 'cert-11',
            name: 'Seismic Design Certification',
            number: 'SDC-011',
            class: 'Technical',
            issuedDate: '2023-03-01',
            expiryDate: '2026-03-01', // Valid
            issuingAuthority: 'Seismic Design Institute',
            status: 'valid',
            notes: 'Seismic design and analysis'
          },
          {
            id: 'cert-12',
            name: 'Building Code Certification',
            number: 'BCC-012',
            class: 'Regulatory',
            issuedDate: '2022-12-01',
            expiryDate: '2025-12-01', // Valid
            issuingAuthority: 'Building Code Institute',
            status: 'valid',
            notes: 'Building code compliance'
          }
        ]
      };

      profilesMap['thomas.anderson@thinkcompl.ai'] = {
        uid: 'thomas-anderson',
        email: 'thomas.anderson@thinkcompl.ai',
        fullName: 'Thomas Anderson',
        licenses: [
          {
            id: 'license-12',
            name: 'Certified Welder License',
            number: 'CWL-66666',
            class: 'Certified',
            issuedDate: '2023-09-01',
            expiryDate: '2026-09-01', // Valid
            issuingAuthority: 'Welding Certification Board',
            status: 'valid',
            notes: 'Welding and fabrication'
          }
        ],
        certifications: [
          {
            id: 'cert-13',
            name: 'Welding Safety Certification',
            number: 'WSC-013',
            class: 'Safety',
            issuedDate: '2023-10-01',
            expiryDate: '2026-10-01', // Valid
            issuingAuthority: 'Welding Safety Institute',
            status: 'valid',
            notes: 'Welding safety and procedures'
          }
        ]
      };

      profilesMap['rachel.green@thinkcompl.ai'] = {
        uid: 'rachel-green',
        email: 'rachel.green@thinkcompl.ai',
        fullName: 'Rachel Green',
        licenses: [],
        certifications: [
          {
            id: 'cert-14',
            name: 'Client Relationship Management',
            number: 'CRM-014',
            class: 'Sales',
            issuedDate: '2023-11-01',
            expiryDate: '2025-11-01', // Valid
            issuingAuthority: 'Sales Institute',
            status: 'valid',
            notes: 'Client relationship and management'
          }
        ]
      };

      setUserProfiles(profilesMap);
      
    } catch (error) {
      console.error('Error loading team members:', error);
      showNotification('error', 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Sorting helpers
  // Combined metric: more problems = higher value
  const getMemberMetric = (member: TeamMember): number => {
    const profile = userProfiles[member.email] || {};
    const licenses: any[] = profile.licenses || [];
    const certs: any[] = profile.certifications || [];
    if (activeSortBy === 'company') {
      // String-based; use dir outside
      return 0;
    }
    if (activeSortBy === 'status') {
      // Rank: active > pending > invited (or reverse if needed)
      const rank = (s: TeamMember['status']) => (s === 'active' ? 3 : s === 'pending' ? 2 : 1);
      return rank(member.status);
    }
    // Combined metric for valid/expired: expired weighted highest, then expiring-soon
    const expired = licenses.filter(l => getItemStatus(l) === 'expired').length + certs.filter(c => getItemStatus(c) === 'expired').length;
    const soon = licenses.filter(l => getItemStatus(l) === 'expiring-soon').length + certs.filter(c => getItemStatus(c) === 'expiring-soon').length;
    if (activeSortBy === 'expired') return expired * 100 + soon;
    if (activeSortBy === 'valid') return -(expired * 100 + soon);
    // Fallback for legacy sortKey usage
    if (sortKey === 'expired') return expired;
    if (sortKey === 'expiring') return soon + expired; // problems overall
    if (sortKey === 'licenses') return licenses.length;
    if (sortKey === 'certifications') return certs.length;
    return 0;
  };

  const sortMembers = (list: TeamMember[]): TeamMember[] => {
    // Column-specific sort takes precedence
    if (activeSortBy !== 'none') {
      if (activeSortBy === 'company') {
        const sorted = [...list].sort((a, b) => {
          const an = (a.company || '').toLowerCase();
          const bn = (b.company || '').toLowerCase();
          if (an < bn) return companySortDir === 'asc' ? -1 : 1;
          if (an > bn) return companySortDir === 'asc' ? 1 : -1;
          return 0;
        });
        return sorted;
      }
      if (activeSortBy === 'status') {
        const rank = (s: TeamMember['status']) => (s === 'active' ? 3 : s === 'pending' ? 2 : 1);
        const sorted = [...list].sort((a, b) => rank(b.status) - rank(a.status));
        return sorted;
      }
      const sorted = [...list].sort((a, b) => {
        const va = getMemberMetric(a);
        const vb = getMemberMetric(b);
        // Higher value first by default
        return vb - va;
      });
      return sorted;
    }
    if (sortKey === 'none') return list;
    const sorted = [...list].sort((a, b) => {
      const va = getMemberMetric(a);
      const vb = getMemberMetric(b);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return sorted;
  };

  // Filtering helpers
  const filterMembers = (list: TeamMember[]): TeamMember[] => {
    return list.filter((member) => {
      const profile = userProfiles[member.email] || {};
      const licStatus = getOverallStatus(profile.licenses || []);
      const certStatus = getOverallStatus(profile.certifications || []);
      const normalize = (f: 'all'|'valid'|'expiring'|'expired') => f === 'expiring' ? 'expiring-soon' : f;
      const licenseOk = licenseFilter === 'all' || licStatus === (normalize(licenseFilter) as any);
      const certOk = certFilter === 'all' || certStatus === (normalize(certFilter) as any);
      return licenseOk && certOk;
    });
  };

  // UI indicator helper for status circles
  const renderStatusIndicator = (status: 'valid' | 'expiring-soon' | 'expired') => {
    const bg = status === 'valid' ? 'bg-green-500' : status === 'expiring-soon' ? 'bg-orange-500' : 'bg-red-500';
    const label = status === 'valid' ? 'Valid' : status === 'expiring-soon' ? 'Expires Soon' : 'Expired';
    const labelColor = status === 'valid' ? 'text-green-600' : status === 'expiring-soon' ? 'text-orange-600' : 'text-red-600';
    const Icon = status === 'valid' ? HiCheck : status === 'expiring-soon' ? HiClock : HiX;
    return (
      <span className="inline-flex items-center ml-1">
        <span className={`w-3 h-3 rounded-full inline-flex items-center justify-center ${bg}`}>
          <Icon className="w-2 h-2 text-white" />
        </span>
        <span className={`text-xs font-medium ml-1 ${labelColor}`}>{label}</span>
      </span>
    );
  };

  // Handle member click to show profile details
  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setShowProfileModal(true);
  };

  // Handle invite submit
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteForm.email || !inviteForm.email.includes('@')) {
      showNotification('error', 'Please enter a valid email address');
      return;
    }

    try {
      setInviteLoading(true);
      
      const response = await fetch('/api/team-members/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }

      const result = await response.json();
      
      // Add to invites list
      const newInvite: TeamMember = {
        id: result.invitation?.id || Date.now().toString(),
        email: inviteForm.email,
        role: inviteForm.role,
        status: 'invited',
        invitedAt: new Date().toISOString()
      };

      setInvites(prev => [...prev, newInvite]);
      
      // Reset form
      setInviteForm({
        email: '',
        role: 'technician',
        message: ''
      });
      
      setShowInviteModal(false);
      
      // Show appropriate notification based on mode
      if (result.developmentMode) {
        showNotification('info', `Invitation created successfully! (Development mode - check console for email details)`);
      } else {
        showNotification('success', `Invitation sent to ${inviteForm.email}`);
      }
      
    } catch (error) {
      console.error('Error sending invitation:', error);
      showNotification('error', error instanceof Error ? error.message : 'Failed to send invitation. Please try again.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResendInvite = async (inviteId: string, email: string) => {
    try {
      const response = await fetch(`/api/team-members/${inviteId}/resend`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to resend invitation');
      }

      showNotification('success', `Invitation resent to ${email}`);
    } catch (error) {
      console.error('Error resending invitation:', error);
      showNotification('error', 'Failed to resend invitation');
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <HiShieldCheck className="w-4 h-4 text-red-600" />;
      case 'engineer':
        return <HiUser className="w-4 h-4 text-blue-600" />;
      case 'technician':
        return <HiUser className="w-4 h-4 text-emerald-600" />;
      case 'viewer':
        return <HiUser className="w-4 h-4 text-slate-600" />;
      default:
        return <HiUser className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'engineer':
        return 'Editor';
      case 'technician':
        return 'Field Worker';
      case 'viewer':
        return 'Viewer';
      default:
        return role;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <HiCheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <HiClock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'invited':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Invited
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
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

  const getAvatarColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-600';
      case 'engineer':
        return 'bg-blue-600';
      case 'technician':
        return 'bg-emerald-600';
      case 'viewer':
        return 'bg-slate-600';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="flex h-full">
      <motion.div
        className="flex-1 flex flex-col h-full bg-blue-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="px-6 pt-1 pb-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <HiUserGroup className="w-8 h-8 text-white" />
                <h1 className="text-2xl font-bold text-white">Team Members</h1>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {/* TODO: Implement edit members functionality */}}
                className="bg-white text-blue-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg flex items-center gap-1.5"
              >
                <HiPencil className="w-4 h-4" />
                Edit Members
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-white text-blue-600 hover:bg-gray-50 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg flex items-center gap-1.5"
              >
                <HiPlus className="w-4 h-4" />
                Invite Member
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
              <div className="flex space-x-1">
                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'table'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <HiViewList className="w-4 h-4" />
                  <span>Table View</span>
                </button>
                <button
                  onClick={() => setActiveTab('visual')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'visual'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <HiChartBar className="w-4 h-4" />
                  <span>Visual Hierarchy</span>
                </button>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* Combined summary for expired soon and expired items - only show when in table view */}
                {activeTab === 'table' && (
                  <div className="flex items-center gap-4 bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Summary:</span>
                    </div>
                    
                    {/* Expired Soon */}
                    {(totals.licExpSoon + totals.certExpSoon) > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-orange-500 px-3 py-1.5 rounded-full shadow-sm">
                          <HiClock className="w-3 h-3 text-white" />
                          <span className="text-xs font-medium text-white">
                            Expires Soon {(totals.licExpSoon + totals.certExpSoon)}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {/* Expired */}
                    {(totals.licExpired + totals.certExpired) > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-full shadow-sm">
                          <HiX className="w-3 h-3 text-white" />
                          <span className="text-xs font-medium text-white">
                            Expired {(totals.licExpired + totals.certExpired)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'table' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MEMBER
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        JOB TITLE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        COMPANY
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ROLE
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        STATUS
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        LICENSES
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center justify-between">
                          <span>CERTIFICATIONS</span>
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <button
                                onClick={() => setShowCertSortMenu(!showCertSortMenu)}
                                className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs font-medium transition-colors"
                              >
                                <span>Sort by</span>
                                <HiSortDescending className="w-3 h-3" />
                              </button>
                              {showCertSortMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                                  <div className="py-1">
                                    {['Hierarchy', 'Company', 'Status', 'Valid', 'Expired'].map((option) => (
                                      <button
                                        key={option}
                                        onClick={() => {
                                          setActiveSortBy(option.toLowerCase() as any);
                                          setShowCertSortMenu(false);
                                        }}
                                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                      >
                                        {option}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortMembers(filterMembers(teamMembers)).map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleMemberClick(member)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {member.photoURL ? (
                                <img
                                  src={member.photoURL}
                                  alt={member.name || member.email}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className={`h-10 w-10 rounded-full ${getAvatarColor(member.role)} flex items-center justify-center`}>
                                  <span className="text-sm font-medium text-white">
                                    {getInitials(member.name, member.email)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {member.name || member.email.split('@')[0]}
                              </div>
                              <div className="text-xs text-gray-500">
                                {member.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.position || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{member.company || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getRoleIcon(member.role)}
                            <span className="ml-2 text-sm text-gray-900">{getRoleLabel(member.role)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(member.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const profile = userProfiles[member.email];
                            const licenses = profile?.licenses || [];
                            const licStatus = getOverallStatus(licenses);
                            return (
                              <div className="flex items-center">
                                <span className="text-sm text-gray-600">Licenses: <span className="font-semibold text-gray-900">{licenses.length}</span>
                                  {licenses.length > 0 && renderStatusIndicator(licStatus)}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const profile = userProfiles[member.email];
                            const certifications = profile?.certifications || [];
                            const certStatus = getOverallStatus(certifications);
                            return (
                              <div className="flex items-center">
                                <span className="text-sm text-gray-600">Certifications: <span className="font-semibold text-gray-900">{certifications.length}</span>
                                  {certifications.length > 0 && renderStatusIndicator(certStatus)}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <TeamHierarchy teamMembers={teamMembers} invites={invites} />
            )}
          </div>
        </div>
      </motion.div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Invite Team Member</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="colleague@company.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                >
                  <option value="technician">Field Worker</option>
                  <option value="engineer">Editor</option>
                  <option value="admin">Administrator</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  id="message"
                  value={inviteForm.message}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  rows={3}
                  placeholder="Add a personal message to your invitation..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {inviteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <HiMail className="w-4 h-4" />
                      <span>Send Invitation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Profile Details Modal */}
      <ProfileDetailsModal
        member={selectedMember}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}