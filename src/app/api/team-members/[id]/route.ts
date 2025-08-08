import { NextRequest, NextResponse } from 'next/server';

// Mock data - replace with actual database calls
let mockTeamMembers = [
  {
    id: '1',
    email: 'john.doe@example.com',
    name: 'John Doe',
    role: 'admin',
    status: 'active',
    joinedAt: '2024-01-15T10:00:00Z'
  },
  {
    id: '2',
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    role: 'engineer',
    status: 'active',
    joinedAt: '2024-01-20T14:30:00Z'
  },
  {
    id: '3',
    email: 'bob.wilson@example.com',
    name: 'Bob Wilson',
    role: 'technician',
    status: 'pending',
    invitedAt: '2024-02-01T09:00:00Z'
  }
];

let mockInvites = [
  {
    id: '4',
    email: 'alice.johnson@example.com',
    role: 'viewer',
    status: 'invited',
    invitedAt: '2024-02-05T11:00:00Z'
  }
];

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if it's a team member
    const memberIndex = mockTeamMembers.findIndex(member => member.id === id);
    if (memberIndex !== -1) {
      const removedMember = mockTeamMembers[memberIndex];
      mockTeamMembers.splice(memberIndex, 1);
      
      return NextResponse.json({
        success: true,
        message: `Team member ${removedMember.email} has been removed`
      });
    }

    // Check if it's an invite
    const inviteIndex = mockInvites.findIndex(invite => invite.id === id);
    if (inviteIndex !== -1) {
      const removedInvite = mockInvites[inviteIndex];
      mockInvites.splice(inviteIndex, 1);
      
      return NextResponse.json({
        success: true,
        message: `Invitation for ${removedInvite.email} has been cancelled`
      });
    }

    return NextResponse.json(
      { error: 'Team member or invitation not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json(
      { error: 'Failed to remove team member' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { role, status } = body;

    // Check if it's a team member
    const memberIndex = mockTeamMembers.findIndex(member => member.id === id);
    if (memberIndex !== -1) {
      if (role) {
        mockTeamMembers[memberIndex].role = role;
      }
      if (status) {
        mockTeamMembers[memberIndex].status = status;
      }
      
      return NextResponse.json({
        success: true,
        message: 'Team member updated successfully',
        member: mockTeamMembers[memberIndex]
      });
    }

    // Check if it's an invite
    const inviteIndex = mockInvites.findIndex(invite => invite.id === id);
    if (inviteIndex !== -1) {
      if (role) {
        mockInvites[inviteIndex].role = role;
      }
      if (status) {
        mockInvites[inviteIndex].status = status;
      }
      
      return NextResponse.json({
        success: true,
        message: 'Invitation updated successfully',
        invite: mockInvites[inviteIndex]
      });
    }

    return NextResponse.json(
      { error: 'Team member or invitation not found' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    );
  }
} 