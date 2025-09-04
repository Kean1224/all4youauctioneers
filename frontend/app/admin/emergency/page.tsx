'use client';

export default function EmergencyAdminPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-red-600 text-center">
          EMERGENCY ADMIN ACCESS - LIVE NOW
        </h1>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <a href="/admin/users" target="_blank" 
             className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition block no-underline">
            <h2 className="text-xl font-semibold text-gray-800">👥 Manage Users</h2>
            <p className="text-gray-600 mt-2">View and manage user accounts</p>
          </a>
          
          <a href="/admin/auctions" target="_blank"
             className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition block no-underline">
            <h2 className="text-xl font-semibold text-gray-800">🏷️ Manage Auctions</h2>
            <p className="text-gray-600 mt-2">Create and manage auctions</p>
          </a>
          
          <a href="/admin/lots" target="_blank"
             className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition block no-underline">
            <h2 className="text-xl font-semibold text-gray-800">📦 Manage Lots</h2>
            <p className="text-gray-600 mt-2">Add and edit auction items</p>
          </a>
          
          <a href="/admin/invoices" target="_blank"
             className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition block no-underline">
            <h2 className="text-xl font-semibold text-gray-800">📄 Invoices</h2>
            <p className="text-gray-600 mt-2">Generate and manage invoices</p>
          </a>
          
          <a href="/admin/payments" target="_blank"
             className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition block no-underline">
            <h2 className="text-xl font-semibold text-gray-800">💰 Payment Management</h2>
            <p className="text-gray-600 mt-2">Track payments and refunds</p>
          </a>
          
          <a href="/admin/offers" target="_blank"
             className="bg-white rounded-lg shadow p-6 hover:shadow-xl transition block no-underline">
            <h2 className="text-xl font-semibent text-gray-800">💵 Item Offers</h2>
            <p className="text-gray-600 mt-2">Review direct offers</p>
          </a>
          
        </div>
        
        <div className="mt-8 bg-green-50 border border-green-200 rounded p-4">
          <div className="flex items-center">
            <span className="text-green-600 text-2xl mr-2">✅</span>
            <div>
              <p className="font-semibold text-green-800">EMERGENCY ACCESS ACTIVE</p>
              <p className="text-green-600 text-sm">All admin functions accessible - Ready for live auctions</p>
              <p className="text-blue-600 text-sm mt-1">Go to: https://www.all4youauctions.co.za/admin/emergency</p>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}