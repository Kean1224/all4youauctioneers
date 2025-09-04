'use client';

export default function AdminDashboardPage() {
  console.log('🚀 EMERGENCY DASHBOARD LOADED');
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-yellow-600 text-center">
          Admin Dashboard - LIVE
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/users', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">👥 Manage Users</h2>
            <p className="text-gray-600 mt-2">View and manage user accounts</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/auctions', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">🏷️ Manage Auctions</h2>
            <p className="text-gray-600 mt-2">Create and manage auctions</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/lots', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">📦 Manage Lots</h2>
            <p className="text-gray-600 mt-2">Add and edit auction items</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/invoices', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">📄 Invoices</h2>
            <p className="text-gray-600 mt-2">Generate and manage invoices</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/payments', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">💰 Payment Management</h2>
            <p className="text-gray-600 mt-2">Track payments and refunds</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition cursor-pointer"
               onClick={() => window.open('/admin/offers', '_blank')}>
            <h2 className="text-xl font-semibold text-gray-800">💵 Item Offers</h2>
            <p className="text-gray-600 mt-2">Review direct offers</p>
          </div>
          
          <div className="bg-red-500 text-white rounded-lg shadow p-6 hover:bg-red-600 transition cursor-pointer"
               onClick={() => {
                 localStorage.clear();
                 window.location.href = '/admin/login';
               }}>
            <h2 className="text-xl font-semibold">🚪 Logout</h2>
            <p className="mt-2">Sign out of admin panel</p>
          </div>
          
        </div>
        
        <div className="mt-8 bg-green-50 border border-green-200 rounded p-4">
          <div className="flex items-center">
            <span className="text-green-600 text-2xl mr-2">✅</span>
            <div>
              <p className="font-semibold text-green-800">System Status: LIVE</p>
              <p className="text-green-600 text-sm">Admin dashboard operational - Ready for auctions</p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}