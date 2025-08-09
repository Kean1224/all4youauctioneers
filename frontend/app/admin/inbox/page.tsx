
import AdminPageWrapper from '../../../components/AdminPageWrapper';

export default function AdminInboxPage() {
  return (
    <AdminPageWrapper>
      <main className="max-w-3xl mx-auto p-6 bg-white rounded shadow mt-8">
        <h1 className="text-3xl font-bold text-yellow-700 mb-6">Admin Inbox</h1>
        <p>This is the admin inbox page. Implement your admin inbox UI here.</p>
        
        {/* Security Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 2.676-1.332 6-6.031 6-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Secure Admin Area</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>All admin actions are logged and monitored</li>
                <li>Session automatically expires after 4 hours</li>
                <li>Access is restricted to authorized personnel only</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </AdminPageWrapper>
  );
}
