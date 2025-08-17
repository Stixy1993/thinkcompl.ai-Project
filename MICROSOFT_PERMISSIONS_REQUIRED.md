# Microsoft Integration Permissions Required

## Overview
The ComplAI Microsoft integration requires additional Azure app permissions beyond the basic SharePoint setup to enable Teams and Outlook Calendar functionality.

## Required Permissions

### 📁 SharePoint & Files
| Permission | Type | Purpose |
|------------|------|---------|
| `Sites.Read.All` | Delegated | Read SharePoint sites and site collections |
| `Sites.ReadWrite.All` | Delegated | Read and write SharePoint sites and site collections |
| `Files.Read.All` | Delegated | Read files in SharePoint document libraries |
| `Files.ReadWrite.All` | Delegated | Read and write files in SharePoint document libraries |

### 💬 Microsoft Teams
| Permission | Type | Purpose |
|------------|------|---------|
| `Team.ReadBasic.All` | Delegated | Read team names and descriptions |
| `Channel.ReadBasic.All` | Delegated | Read channel names and descriptions |
| `ChannelMessage.Send` | Delegated | Send messages to Teams channels |
| `Chat.ReadWrite` | Delegated | Read and write chat messages |

### 📅 Outlook Calendar
| Permission | Type | Purpose |
|------------|------|---------|
| `Calendars.ReadWrite` | Delegated | Read and write calendar events |
| `OnlineMeetings.ReadWrite` | Delegated | Create and manage Teams meetings |
| `Mail.Send` | Delegated | Send email invitations and notifications |

### 👤 User & Profile
| Permission | Type | Purpose |
|------------|------|---------|
| `User.Read` | Delegated | Read signed-in user's profile |
| `User.ReadBasic.All` | Delegated | Read basic profiles of all users |

## Permission Usage in ComplAI

### SharePoint Integration
- **Document Management**: Upload, download, move, and delete project documents
- **Folder Organization**: Create and manage project folder structures
- **File Sharing**: Share documents with team members and external stakeholders
- **Version Control**: Access SharePoint's built-in version history

### Teams Integration
- **Project Notifications**: Send automated notifications for:
  - ITR completions and updates
  - Punch list item assignments
  - Task reminders and deadlines
  - Report availability
  - Approval requirements
- **Team Communication**: Send messages to specific project channels
- **Meeting Creation**: Create Teams meetings for project discussions

### Calendar Integration
- **Project Scheduling**: Create calendar events for:
  - Project kickoff meetings
  - Equipment inspections
  - ITR review sessions
  - Weekly progress meetings
  - Milestone deadlines
- **Meeting Management**: Schedule and manage recurring project meetings
- **Inspection Planning**: Schedule equipment testing with detailed information
- **Team Coordination**: Check team availability and find optimal meeting times

## How Users Grant Permissions

### Multi-Tenant Setup
1. **No Admin Pre-approval Required**: Users can grant permissions on first login
2. **User Consent**: Each user consents to permissions when they first access the integration
3. **Organizational Flexibility**: Works across different organizations without IT setup
4. **Secure by Design**: Uses Microsoft's OAuth2 security standards

### Permission Flow
1. User clicks "Connect to Microsoft" in ComplAI
2. Redirected to Microsoft's secure login page
3. User signs in with their Microsoft account
4. Microsoft shows permission consent screen
5. User grants permissions for ComplAI to access their data
6. User is redirected back to ComplAI with access tokens
7. ComplAI can now interact with Microsoft services on the user's behalf

## Security & Privacy

### Data Access
- **User-Specific**: ComplAI only accesses data the authenticated user has access to
- **Delegated Permissions**: ComplAI acts on behalf of the user, not as a separate application
- **Scope Limited**: Only the minimum required permissions for functionality
- **Token Expiration**: Access tokens expire regularly and must be refreshed

### Data Usage
- **Project Context**: Data is used only for project management and collaboration
- **No Data Storage**: ComplAI doesn't store Microsoft data beyond necessary caching
- **Audit Trail**: All actions are logged in Microsoft's audit systems
- **User Control**: Users can revoke permissions at any time in their Microsoft account

## Updated Setup Process

The setup wizard at `/setup-microsoft` now includes:

1. **Step 1**: Create Multi-Tenant Azure App
2. **Step 2**: Configure All Required Permissions (expanded list)
3. **Step 3**: Get Application Credentials  
4. **Step 4**: Test Complete Integration

## Benefits of Complete Integration

### For Project Managers
- **Unified Communication**: Teams notifications keep everyone informed
- **Automated Scheduling**: Calendar integration for all project milestones
- **Document Workflow**: Seamless SharePoint document management
- **Progress Tracking**: Real-time updates across all Microsoft tools

### For QA Engineers  
- **Inspection Scheduling**: Calendar events with equipment details
- **ITR Notifications**: Teams alerts for completion and approval workflow
- **Document Access**: Direct SharePoint integration for test reports
- **Team Coordination**: Meeting scheduling for reviews and discussions

### For Team Members
- **Familiar Tools**: Native Microsoft ecosystem integration
- **Real-time Updates**: Teams notifications for project changes
- **Easy Scheduling**: Calendar integration for meetings and inspections
- **Document Collaboration**: SharePoint-based file sharing and versioning

The additional permissions enable a complete Microsoft ecosystem integration that transforms ComplAI from a standalone tool into a fully integrated part of your team's existing Microsoft workflow.