export interface TeamMember {
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

export interface InviteRequest {
  email: string;
  role: 'admin' | 'engineer' | 'technician' | 'viewer';
  message?: string;
}