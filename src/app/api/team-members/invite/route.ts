import { NextRequest, NextResponse } from 'next/server';

// Function to refresh expired access tokens
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.SHAREPOINT_CLIENT_ID!,
      client_secret: process.env.SHAREPOINT_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Microsoft Graph API request function
async function makeGraphRequest(endpoint: string, options: RequestInit = {}, userToken?: string, request?: NextRequest): Promise<{ data: any; response?: NextResponse }> {
  if (!userToken) {
    throw new Error('User access token is required');
  }

  let currentToken = userToken;
  let updatedResponse: NextResponse | undefined;

  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${currentToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // If we get a 401, try to refresh the token
  if (response.status === 401 && request) {
    const refreshToken = request.cookies.get('sharepoint_refresh_token')?.value;
    if (refreshToken) {
      try {
        console.log('DEBUG: Access token expired, attempting to refresh...');
        const newAccessToken = await refreshAccessToken(refreshToken);
        
        // Create a response object to update the cookie
        updatedResponse = new NextResponse();
        updatedResponse.cookies.set('sharepoint_access_token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 3600
        });
        
        // Retry the request with the new token
        const retryResponse = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
          ...options,
          headers: {
            'Authorization': `Bearer ${newAccessToken}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          console.error(`Graph API error:`, retryResponse.status, retryResponse.statusText, errorText);
          throw new Error(`Graph API error: ${retryResponse.status} ${retryResponse.statusText} - ${errorText}`);
        }

        return { data: await retryResponse.json(), response: updatedResponse };
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
        // If refresh fails, throw the original 401 error
        const errorText = await response.text();
        console.error(`Graph API error:`, response.status, response.statusText, errorText);
        throw new Error(`Graph API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Graph API error:`, response.status, response.statusText, errorText);
    throw new Error(`Graph API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return { data: await response.json() };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role, message } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email address is required' },
        { status: 400 }
      );
    }

    if (!role || !['admin', 'engineer', 'technician', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Valid role is required' },
        { status: 400 }
      );
    }

    // Get user's access token from cookies
    const userToken = request.cookies.get('sharepoint_access_token')?.value;
    
    // Generate a unique invitation ID
    const invitationId = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create the invitation record
    const invitation = {
      id: invitationId,
      email,
      role,
      status: 'invited',
      invitedAt: new Date().toISOString(),
      message: message || ''
    };

    // Check if we have SharePoint authentication
    if (!userToken) {
      // Development mode: Log the email instead of sending
      console.log('🚀 DEVELOPMENT MODE: Email invitation would be sent:');
      console.log('📧 To:', email);
      console.log('👤 Role:', role);
      console.log('💬 Message:', message || 'No personal message');
      console.log('🔗 Invitation Link:', `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/team-members/accept?invitationId=${invitationId}&email=${encodeURIComponent(email)}`);
      console.log('📝 HTML Email Body:');
      
      const emailBody = `
        <html>
          <body>
            <h2>You've been invited to join thinkcompl.ai!</h2>
            <p>Hello,</p>
            <p>You've been invited to join our team on thinkcompl.ai with the role of <strong>${role.charAt(0).toUpperCase() + role.slice(1)}</strong>.</p>
            ${message ? `<p><strong>Personal message:</strong> ${message}</p>` : ''}
            <p>To accept this invitation, please click the link below:</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/team-members/accept?invitationId=${invitationId}&email=${encodeURIComponent(email)}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
            <p>If you have any questions, please contact the team administrator.</p>
            <p>Best regards,<br>The thinkcompl.ai Team</p>
          </body>
        </html>
      `;
      
      console.log(emailBody);
      console.log('✅ Invitation created successfully (development mode)');

      return NextResponse.json({
        success: true,
        message: 'Invitation created successfully (development mode - check console for email details)',
        invitation,
        developmentMode: true,
        emailDetails: {
          to: email,
          role: role,
          message: message || 'No personal message',
          invitationLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/team-members/accept?invitationId=${invitationId}&email=${encodeURIComponent(email)}`
        }
      });
    }

    // Production mode: Send email using Microsoft Graph API
    try {
      // Get the current user's email address
      const userResponse = await makeGraphRequest('/me', {}, userToken, request);
      const currentUser = userResponse.data;
      
      // Create the email message
      const emailBody = `
        <html>
          <body>
            <h2>You've been invited to join thinkcompl.ai!</h2>
            <p>Hello,</p>
            <p>You've been invited to join our team on thinkcompl.ai with the role of <strong>${role.charAt(0).toUpperCase() + role.slice(1)}</strong>.</p>
            ${message ? `<p><strong>Personal message:</strong> ${message}</p>` : ''}
            <p>To accept this invitation, please click the link below:</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://thinkcompl.ai'}/dashboard/team-members/accept?invitationId=${invitationId}&email=${encodeURIComponent(email)}" style="background-color: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a></p>
            <p>If you have any questions, please contact the team administrator.</p>
            <p>Best regards,<br>The thinkcompl.ai Team</p>
          </body>
        </html>
      `;

      // Create the email message using Microsoft Graph API
      const emailMessage = {
        subject: 'Invitation to join thinkcompl.ai',
        body: {
          contentType: 'HTML',
          content: emailBody
        },
        toRecipients: [
          {
            emailAddress: {
              address: email
            }
          }
        ]
      };

      // Send the email
      const sendEmailResponse = await makeGraphRequest('/me/sendMail', {
        method: 'POST',
        body: JSON.stringify({
          message: emailMessage,
          saveToSentItems: true
        })
      }, userToken, request);

      console.log('Email sent successfully:', sendEmailResponse);

      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully',
        invitation
      });

    } catch (emailError) {
      console.error('Error sending email:', emailError);
      
      // If email sending fails, still return success but log the error
      // This allows the invitation to be created even if email fails
      return NextResponse.json({
        success: true,
        message: 'Invitation created successfully (email may not have been sent)',
        invitation,
        warning: 'Email sending failed, but invitation was created'
      });
    }

  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
} 