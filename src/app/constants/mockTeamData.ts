import { TeamMember } from '../dashboard/team-members/types';

// Pre-calculated dates to avoid repeated calculations
const currentDate = new Date();
const oneMonthAgo = new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000);
const threeMonthsFromNow = new Date(currentDate.getTime() + 90 * 24 * 60 * 60 * 1000);
const sixMonthsFromNow = new Date(currentDate.getTime() + 180 * 24 * 60 * 60 * 1000);

export const mockTeamMembers: TeamMember[] = [
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
    joinedAt: '2023-04-18T00:00:00.000Z',
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
    joinedAt: '2023-09-05T00:00:00.000Z',
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
    role: 'viewer',
    status: 'active',
    joinedAt: '2023-10-12T00:00:00.000Z',
    position: 'Quality Assurance',
    department: 'Quality',
    company: 'thinkcompl.ai',
    phone: '+1 (555) 012-3456',
    employeeId: 'EMP010'
  }
];

export const mockInvites: TeamMember[] = [
  {
    id: 'invite-1',
    email: 'alex.rodriguez@contractor.com',
    name: 'Alex Rodriguez',
    role: 'technician',
    status: 'invited',
    invitedAt: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    position: 'Electrical Contractor',
    company: 'Bright Spark Construction'
  },
  {
    id: 'invite-2',
    email: 'maria.gonzalez@subcontractor.com',
    name: 'Maria Gonzalez',
    role: 'engineer',
    status: 'pending',
    invitedAt: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    joinedAt: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    position: 'Project Engineer',
    company: 'Advanced Engineering Solutions'
  }
];

export const mockUserProfiles: {[key: string]: any} = {
  'mike.chen@thinkcompl.ai': {
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
        expiryDate: '2025-01-15',
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
        expiryDate: '2025-06-01',
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
        expiryDate: '2026-03-01',
        issuingAuthority: 'Institute of Electrical and Electronics Engineers',
        status: 'valid',
        notes: 'Electrical safety standards'
      }
    ]
  },

  'sarah.johnson@thinkcompl.ai': {
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
        expiryDate: '2026-08-15',
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
        expiryDate: '2025-09-01',
        issuingAuthority: 'Electrical Safety Institute',
        status: 'valid',
        notes: 'Electrical safety and code compliance'
      },
      {
        id: 'cert-3',
        name: 'High Voltage Certification',
        number: 'HVC-003',
        class: 'Specialized',
        issuedDate: '2023-02-15',
        expiryDate: oneMonthAgo.toISOString().split('T')[0],
        issuingAuthority: 'High Voltage Safety Council',
        status: 'expired',
        notes: 'High voltage electrical work certification'
      }
    ]
  },

  'david.wilson@thinkcompl.ai': {
    uid: 'david-wilson',
    email: 'david.wilson@thinkcompl.ai',
    fullName: 'David Wilson',
    licenses: [
      {
        id: 'license-4',
        name: 'Project Management Professional',
        number: 'PMP-789012',
        class: 'Professional',
        issuedDate: '2022-03-01',
        expiryDate: new Date(currentDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        issuingAuthority: 'Project Management Institute',
        status: 'expiring-soon',
        notes: 'Project management certification'
      }
    ],
    certifications: [
      {
        id: 'cert-4',
        name: 'Construction Management Certification',
        number: 'CMC-004',
        class: 'Management',
        issuedDate: '2023-01-10',
        expiryDate: '2026-01-10',
        issuingAuthority: 'Construction Management Association',
        status: 'valid',
        notes: 'Construction project management'
      }
    ]
  },

  'lisa.garcia@thinkcompl.ai': {
    uid: 'lisa-garcia',
    email: 'lisa.garcia@thinkcompl.ai',
    fullName: 'Lisa Garcia',
    licenses: [],
    certifications: [
      {
        id: 'cert-5',
        name: 'Customer Service Excellence',
        number: 'CSE-005',
        class: 'Service',
        issuedDate: '2023-06-15',
        expiryDate: '2025-06-15',
        issuingAuthority: 'Customer Service Institute',
        status: 'valid',
        notes: 'Customer relations and service excellence'
      }
    ]
  },

  'john.smith@thinkcompl.ai': {
    uid: 'john-smith',
    email: 'john.smith@thinkcompl.ai',
    fullName: 'John Smith',
    licenses: [
      {
        id: 'license-5',
        name: 'Plumbing License',
        number: 'PL-345678',
        class: 'Journeyman',
        issuedDate: '2023-05-01',
        expiryDate: '2026-05-01',
        issuingAuthority: 'State Plumbing Board',
        status: 'valid',
        notes: 'Residential and commercial plumbing'
      }
    ],
    certifications: [
      {
        id: 'cert-6',
        name: 'Water System Safety',
        number: 'WSS-006',
        class: 'Safety',
        issuedDate: '2023-07-01',
        expiryDate: oneMonthAgo.toISOString().split('T')[0],
        issuingAuthority: 'Water Safety Council',
        status: 'expired',
        notes: 'Water system safety and compliance'
      }
    ]
  },

  'emma.davis@thinkcompl.ai': {
    uid: 'emma-davis',
    email: 'emma.davis@thinkcompl.ai',
    fullName: 'Emma Davis',
    licenses: [
      {
        id: 'license-6',
        name: 'Professional Engineer License',
        number: 'PE-456789',
        class: 'Professional',
        issuedDate: '2023-02-01',
        expiryDate: '2026-02-01',
        issuingAuthority: 'State Board of Engineers',
        status: 'valid',
        notes: 'Civil engineering certification'
      }
    ],
    certifications: [
      {
        id: 'cert-7',
        name: 'Structural Engineering Certification',
        number: 'SEC-007',
        class: 'Specialized',
        issuedDate: '2023-04-01',
        expiryDate: '2025-04-01',
        issuingAuthority: 'Structural Engineering Institute',
        status: 'valid',
        notes: 'Structural design and analysis'
      }
    ]
  },

  'michael.brown@thinkcompl.ai': {
    uid: 'michael-brown',
    email: 'michael.brown@thinkcompl.ai',
    fullName: 'Michael Brown',
    licenses: [
      {
        id: 'license-7',
        name: 'HVAC Technician License',
        number: 'HVAC-567890',
        class: 'Technical',
        issuedDate: '2023-01-15',
        expiryDate: '2026-01-15',
        issuingAuthority: 'HVAC Licensing Board',
        status: 'valid',
        notes: 'Heating, ventilation, and air conditioning'
      }
    ],
    certifications: [
      {
        id: 'cert-8',
        name: 'Refrigeration Safety',
        number: 'RS-008',
        class: 'Safety',
        issuedDate: '2023-03-15',
        expiryDate: oneMonthAgo.toISOString().split('T')[0],
        issuingAuthority: 'Refrigeration Safety Council',
        status: 'expired',
        notes: 'Refrigeration system safety'
      },
      {
        id: 'cert-9',
        name: 'Energy Efficiency Certification',
        number: 'EEC-009',
        class: 'Specialized',
        issuedDate: '2023-08-01',
        expiryDate: '2025-08-01',
        issuingAuthority: 'Energy Efficiency Institute',
        status: 'valid',
        notes: 'Energy-efficient HVAC systems'
      }
    ]
  },

  'jessica.lee@thinkcompl.ai': {
    uid: 'jessica-lee',
    email: 'jessica.lee@thinkcompl.ai',
    fullName: 'Jessica Lee',
    licenses: [
      {
        id: 'license-8',
        name: 'Mechanical Engineering License',
        number: 'ME-678901',
        class: 'Professional',
        issuedDate: '2022-12-01',
        expiryDate: '2025-12-01',
        issuingAuthority: 'State Board of Engineers',
        status: 'valid',
        notes: 'Mechanical engineering and design'
      }
    ],
    certifications: [
      {
        id: 'cert-10',
        name: 'AutoCAD Certification',
        number: 'AC-010',
        class: 'Technical',
        issuedDate: '2023-01-20',
        expiryDate: oneMonthAgo.toISOString().split('T')[0],
        issuingAuthority: 'Autodesk',
        status: 'expired',
        notes: 'Computer-aided design software'
      },
      {
        id: 'cert-11',
        name: 'SolidWorks Professional',
        number: 'SW-011',
        class: 'Technical',
        issuedDate: '2023-06-01',
        expiryDate: '2025-06-01',
        issuingAuthority: 'Dassault Systèmes',
        status: 'valid',
        notes: '3D CAD design software'
      }
    ]
  },

  'robert.taylor@thinkcompl.ai': {
    uid: 'robert-taylor',
    email: 'robert.taylor@thinkcompl.ai',
    fullName: 'Robert Taylor',
    licenses: [
      {
        id: 'license-9',
        name: 'Carpentry License',
        number: 'CP-789012',
        class: 'Trade',
        issuedDate: '2023-04-01',
        expiryDate: '2026-04-01',
        issuingAuthority: 'State Carpentry Board',
        status: 'valid',
        notes: 'Residential and commercial carpentry'
      }
    ],
    certifications: [
      {
        id: 'cert-12',
        name: 'Construction Safety',
        number: 'CS-012',
        class: 'Safety',
        issuedDate: '2023-05-15',
        expiryDate: '2025-05-15',
        issuingAuthority: 'Construction Safety Institute',
        status: 'valid',
        notes: 'Construction site safety protocols'
      }
    ]
  },

  'amanda.white@thinkcompl.ai': {
    uid: 'amanda-white',
    email: 'amanda.white@thinkcompl.ai',
    fullName: 'Amanda White',
    licenses: [],
    certifications: [
      {
        id: 'cert-13',
        name: 'Quality Management System',
        number: 'QMS-013',
        class: 'Management',
        issuedDate: '2023-08-01',
        expiryDate: '2025-08-01',
        issuingAuthority: 'Quality Management Institute',
        status: 'valid',
        notes: 'ISO 9001 quality management systems'
      }
    ]
  }
};