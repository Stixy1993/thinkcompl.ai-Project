export default function TestEnvPage() {
  const envVars = {
    SHAREPOINT_TENANT_ID: process.env.SHAREPOINT_TENANT_ID,
    SHAREPOINT_CLIENT_ID: process.env.SHAREPOINT_CLIENT_ID,
    SHAREPOINT_CLIENT_SECRET: process.env.SHAREPOINT_CLIENT_SECRET ? '***SET***' : 'NOT SET',
    SHAREPOINT_SITE_URL: process.env.SHAREPOINT_SITE_URL,
    SHAREPOINT_DEFAULT_SITE_ID: process.env.SHAREPOINT_DEFAULT_SITE_ID,
    SHAREPOINT_DEFAULT_DRIVE_ID: process.env.SHAREPOINT_DEFAULT_DRIVE_ID,
    SHAREPOINT_CONFIG_SAVED: process.env.SHAREPOINT_CONFIG_SAVED,
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      <div className="space-y-2">
        {Object.entries(envVars).map(([key, value]) => (
          <div key={key} className="flex">
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded mr-2 min-w-[200px]">
              {key}
            </span>
            <span className="font-mono text-sm">
              {value || 'NOT SET'}
            </span>
          </div>
        ))}
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Configuration Status</h2>
        <div className="space-y-1">
          <div>✅ Tenant ID: {envVars.SHAREPOINT_TENANT_ID ? 'Set' : 'Missing'}</div>
          <div>✅ Client ID: {envVars.SHAREPOINT_CLIENT_ID ? 'Set' : 'Missing'}</div>
          <div>✅ Client Secret: {envVars.SHAREPOINT_CLIENT_SECRET === '***SET***' ? 'Set' : 'Missing'}</div>
          <div>✅ Site URL: {envVars.SHAREPOINT_SITE_URL ? 'Set' : 'Missing'}</div>
          <div>✅ Site ID: {envVars.SHAREPOINT_DEFAULT_SITE_ID ? 'Set' : 'Missing'}</div>
          <div>✅ Drive ID: {envVars.SHAREPOINT_DEFAULT_DRIVE_ID ? 'Set' : 'Missing'}</div>
        </div>
      </div>
    </div>
  );
} 