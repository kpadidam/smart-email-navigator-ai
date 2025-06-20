import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Mail, Activity, AlertCircle, CheckCircle, Clock, Search, RefreshCw } from "lucide-react";
import Header from "../components/Header";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface AdminStats {
  users: {
    total: number;
    active: number;
    gmailConnected: number;
    connectionRate: string;
  };
  emails: {
    total: number;
    today: number;
  };
  sync: {
    totalAccounts: number;
    activeAccounts: number;
    avgLastSync: string | null;
  };
  recentErrors: any[];
}

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  gmailConnected: boolean;
  createdAt: string;
  emailStats: {
    totalEmails: number;
    unreadEmails: number;
    lastEmailDate: string | null;
  };
}

interface SyncStatus {
  summary: {
    total: number;
    healthy: number;
    warning: number;
    error: number;
    noData: number;
  };
  accounts: {
    healthy: any[];
    warning: any[];
    error: any[];
    noData: any[];
  };
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const { toast } = useToast();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const statsResponse = await authService.makeAuthenticatedRequest(`${API_URL}/api/admin/dashboard`);
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load users
      const usersResponse = await authService.makeAuthenticatedRequest(`${API_URL}/api/admin/users?limit=50`);
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users);
      }

      // Load sync status
      const syncResponse = await authService.makeAuthenticatedRequest(`${API_URL}/api/admin/sync-status`);
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        setSyncStatus(syncData);
      }

    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Error",
        description: "Failed to load admin dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUserStatusUpdate = async (userId: string, updates: any) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: authService.getAuthHeaders(),
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "User updated successfully",
        });
        loadAdminData(); // Reload data
      } else {
        throw new Error('Failed to update user');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleForceSync = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/sync`, {
        method: 'POST',
        headers: authService.getAuthHeaders(),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Sync initiated for user",
        });
      } else {
        throw new Error('Failed to initiate sync');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate sync",
        variant: "destructive",
      });
    }
  };

  const getSyncStatusBadge = (status: string, count: number) => {
    const variants = {
      healthy: { variant: "default" as const, color: "text-green-600" },
      warning: { variant: "secondary" as const, color: "text-yellow-600" },
      error: { variant: "destructive" as const, color: "text-red-600" },
      noData: { variant: "outline" as const, color: "text-gray-600" }
    };

    const config = variants[status as keyof typeof variants];
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading admin dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Monitor users, sync status, and system health</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'users', label: 'Users' },
              { id: 'sync', label: 'Sync Status' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Users</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.users.total}</p>
                      <p className="text-sm text-gray-500">{stats.users.active} active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Mail className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Emails</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.emails.total}</p>
                      <p className="text-sm text-gray-500">{stats.emails.today} today</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Activity className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Gmail Connected</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.users.gmailConnected}</p>
                      <p className="text-sm text-gray-500">{stats.users.connectionRate}% rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Recent Errors</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.recentErrors.length}</p>
                      <p className="text-sm text-gray-500">Last 24h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Errors */}
            {stats.recentErrors.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Sync Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {stats.recentErrors.map((error, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium">{error.firstName} {error.lastName}</p>
                          <p className="text-sm text-gray-500">{error.email}</p>
                        </div>
                        <Badge variant="destructive">Error</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Created Date</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="firstName">Name</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={loadAdminData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Users Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Gmail</TableHead>
                      <TableHead>Emails</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users
                      .filter(user => 
                        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((user) => (
                        <TableRow key={user._id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{user.firstName} {user.lastName}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? 'default' : 'secondary'}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              {user.gmailConnected ? (
                                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                              )}
                              {user.gmailConnected ? 'Connected' : 'Not Connected'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm">{user.emailStats.totalEmails} total</p>
                              <p className="text-sm text-gray-500">{user.emailStats.unreadEmails} unread</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUserStatusUpdate(user._id, { isActive: !user.isActive })}
                              >
                                {user.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                              {user.gmailConnected && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleForceSync(user._id)}
                                >
                                  Sync
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sync Status Tab */}
        {activeTab === 'sync' && syncStatus && (
          <div className="space-y-6">
            {/* Sync Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {getSyncStatusBadge('healthy', syncStatus.summary.healthy)}
                  {getSyncStatusBadge('warning', syncStatus.summary.warning)}
                  {getSyncStatusBadge('error', syncStatus.summary.error)}
                  {getSyncStatusBadge('noData', syncStatus.summary.noData)}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Sync Status */}
            {Object.entries(syncStatus.accounts).map(([status, accounts]) => (
              accounts.length > 0 && (
                <Card key={status}>
                  <CardHeader>
                    <CardTitle className="capitalize">{status} Accounts ({accounts.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {accounts.slice(0, 10).map((account: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{account.userId?.firstName} {account.userId?.lastName}</p>
                            <p className="text-sm text-gray-500">{account.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">
                              {account.lastSyncAt 
                                ? new Date(account.lastSyncAt).toLocaleString()
                                : 'Never synced'
                              }
                            </p>
                            <Badge variant={
                              status === 'healthy' ? 'default' :
                              status === 'warning' ? 'secondary' :
                              status === 'error' ? 'destructive' : 'outline'
                            }>
                              {status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 