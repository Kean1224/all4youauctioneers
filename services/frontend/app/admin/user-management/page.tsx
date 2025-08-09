'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminAuthWrapper from '../../../components/AdminAuthWrapper'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  idNumber: string
  address: string
  city: string
  postalCode: string
  status: 'pending' | 'approved' | 'rejected'
  ficaStatus: 'pending' | 'approved' | 'rejected'
  createdAt: string
  documents?: {
    idDocument?: string
    proofOfAddress?: string
    bankStatement?: string
  }
}

function UserManagementContent() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}`,
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      setError('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const updateUserStatus = async (userId: string, status: string, ficaStatus?: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}`,
        },
        body: JSON.stringify({ 
          status,
          ...(ficaStatus && { ficaStatus })
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      const data = await response.json()
      setSuccessMessage(data.message || 'User status updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      
      // Refresh users list
      fetchUsers()
      setSelectedUser(null)
    } catch (error) {
      console.error('Error updating user:', error)
      setError('Failed to update user status')
      setTimeout(() => setError(''), 3000)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete user')
      }

      setSuccessMessage('User deleted successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
      
      // Refresh users list
      fetchUsers()
      setSelectedUser(null)
    } catch (error) {
      console.error('Error deleting user:', error)
      setError('Failed to delete user')
      setTimeout(() => setError(''), 3000)
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus
    const matchesSearch = searchTerm === '' || 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.idNumber?.includes(searchTerm)
    
    return matchesFilter && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const downloadDocument = async (userId: string, documentType: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/${userId}/documents/${documentType}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_jwt')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to download document')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${userId}_${documentType}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading document:', error)
      setError('Failed to download document')
      setTimeout(() => setError(''), 3000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage user registrations and FICA verification status
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{users.length}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                    <dd className="text-lg font-medium text-gray-900">{users.length}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {users.filter(u => u.status === 'pending').length}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.status === 'pending').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {users.filter(u => u.status === 'approved').length}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.status === 'approved').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {users.filter(u => u.status === 'rejected').length}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Rejected</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {users.filter(u => u.status === 'rejected').length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Search Users
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by name, email, or ID number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                Filter by Status
              </label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Users</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Users ({filteredUsers.length})
            </h3>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        FICA Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registered
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">ID: {user.idNumber}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.ficaStatus || 'pending')}`}>
                            {user.ficaStatus || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="text-blue-600 hover:text-blue-900 mr-3"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* User Details Modal */}
        {selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    User Details: {selectedUser.firstName} {selectedUser.lastName}
                  </h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Personal Information */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Personal Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {selectedUser.firstName} {selectedUser.lastName}
                      </div>
                      <div>
                        <span className="font-medium">ID Number:</span> {selectedUser.idNumber}
                      </div>
                      <div>
                        <span className="font-medium">Email:</span> {selectedUser.email}
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span> {selectedUser.phone}
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Address:</span> {selectedUser.address}, {selectedUser.city}, {selectedUser.postalCode}
                      </div>
                    </div>
                  </div>

                  {/* FICA Documents */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">FICA Documents</h4>
                    <div className="space-y-2">
                      {selectedUser.documents?.idDocument && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm">ID Document</span>
                          <button
                            onClick={() => downloadDocument(selectedUser.id, 'idDocument')}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Download
                          </button>
                        </div>
                      )}
                      {selectedUser.documents?.proofOfAddress && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Proof of Address</span>
                          <button
                            onClick={() => downloadDocument(selectedUser.id, 'proofOfAddress')}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Download
                          </button>
                        </div>
                      )}
                      {selectedUser.documents?.bankStatement && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Bank Statement</span>
                          <button
                            onClick={() => downloadDocument(selectedUser.id, 'bankStatement')}
                            className="text-blue-600 hover:text-blue-900 text-sm"
                          >
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Actions */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Update Status</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Account Status
                        </label>
                        <div className="space-y-2">
                          <button
                            onClick={() => updateUserStatus(selectedUser.id, 'approved')}
                            className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            Approve Account
                          </button>
                          <button
                            onClick={() => updateUserStatus(selectedUser.id, 'rejected')}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          >
                            Reject Account
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          FICA Status
                        </label>
                        <div className="space-y-2">
                          <button
                            onClick={() => updateUserStatus(selectedUser.id, selectedUser.status, 'approved')}
                            className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                          >
                            Approve FICA
                          </button>
                          <button
                            onClick={() => updateUserStatus(selectedUser.id, selectedUser.status, 'rejected')}
                            className="w-full px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                          >
                            Reject FICA
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminUserManagementPage() {
  return (
    <AdminAuthWrapper>
      <UserManagementContent />
    </AdminAuthWrapper>
  )
}
