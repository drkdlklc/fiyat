import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Edit2, Trash2, Save, X, Users } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    is_admin: false,
    permissions: {
      can_access_calculator: true,
      can_access_machines: false,
      can_access_papers: false,
      can_access_extras: false,
      can_see_input_prices: false
    },
    price_multiplier: 1.0
  });
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      is_admin: false,
      permissions: {
        can_access_calculator: true,
        can_access_machines: false,
        can_access_papers: false,
        can_access_extras: false,
        can_see_input_prices: false
      },
      price_multiplier: 1.0
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || (!editingId && !formData.password)) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingId) {
        // Update user
        const updateData = {
          username: formData.username,
          is_admin: formData.is_admin,
          permissions: formData.permissions,
          price_multiplier: formData.price_multiplier
        };
        
        // Only include password if it's provided
        if (formData.password) {
          updateData.password = formData.password;
        }

        await axios.put(`${process.env.REACT_APP_BACKEND_URL}/api/users/${editingId}`, updateData);
        toast({
          title: "Success",
          description: "User updated successfully"
        });
      } else {
        // Create user
        await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/users`, formData);
        toast({
          title: "Success",
          description: "User created successfully"
        });
      }

      resetForm();
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to save user",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (user) => {
    setFormData({
      username: user.username,
      password: '', // Don't populate password for security
      is_admin: user.is_admin,
      permissions: user.permissions,
      price_multiplier: user.price_multiplier
    });
    setEditingId(user.id);
    setIsAdding(true);
  };

  const handleDelete = async (userId, username) => {
    if (username === 'Emre') {
      toast({
        title: "Error",
        description: "Cannot delete the default admin user",
        variant: "destructive"
      });
      return;
    }

    if (userId === currentUser.id) {
      toast({
        title: "Error",
        description: "Cannot delete your own account",
        variant: "destructive"
      });
      return;
    }

    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      try {
        await axios.delete(`${process.env.REACT_APP_BACKEND_URL}/api/users/${userId}`);
        toast({
          title: "Success",
          description: "User deleted successfully"
        });
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        toast({
          title: "Error",
          description: error.response?.data?.detail || "Failed to delete user",
          variant: "destructive"
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Users size={18} className="sm:size-5" />
              <span>User Management</span>
            </CardTitle>
            <Button onClick={() => setIsAdding(true)} disabled={isAdding} className="w-full sm:w-auto">
              <Plus size={14} className="mr-1 sm:mr-2" />
              <span>Add User</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isAdding && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-semibold mb-3">
                {editingId ? 'Edit User' : 'Add New User'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter username"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="password">
                    Password {editingId ? '(leave blank to keep current)' : '*'}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter password"
                    required={!editingId}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="price_multiplier">Price Multiplier</Label>
                  <Input
                    id="price_multiplier"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.price_multiplier}
                    onChange={(e) => setFormData({ ...formData, price_multiplier: parseFloat(e.target.value) || 1.0 })}
                    placeholder="1.0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    All prices for this user will be multiplied by this factor
                  </p>
                </div>

                <div className="flex items-center space-x-2 mt-6">
                  <Checkbox
                    id="is_admin"
                    checked={formData.is_admin}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_admin: checked })}
                  />
                  <Label htmlFor="is_admin">Administrator</Label>
                </div>
              </div>

              <div className="mb-4">
                <Label className="text-base font-semibold">Permissions</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can_access_calculator"
                      checked={formData.permissions.can_access_calculator}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, can_access_calculator: checked }
                      })}
                    />
                    <Label htmlFor="can_access_calculator">Calculator Access</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can_access_machines"
                      checked={formData.permissions.can_access_machines}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, can_access_machines: checked }
                      })}
                    />
                    <Label htmlFor="can_access_machines">Machines Management</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can_access_papers"
                      checked={formData.permissions.can_access_papers}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, can_access_papers: checked }
                      })}
                    />
                    <Label htmlFor="can_access_papers">Paper Types Management</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="can_access_extras"
                      checked={formData.permissions.can_access_extras}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, can_access_extras: checked }
                      })}
                    />
                    <Label htmlFor="can_access_extras">Extras Management</Label>
                  </div>

                  <div className="flex items-center space-x-2 col-span-2">
                    <Checkbox
                      id="can_see_input_prices"
                      checked={formData.permissions.can_see_input_prices}
                      onCheckedChange={(checked) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, can_see_input_prices: checked }
                      })}
                    />
                    <Label htmlFor="can_see_input_prices">Can See Input Prices</Label>
                    <p className="text-xs text-gray-500 ml-2">
                      (If disabled, user only sees final results)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button type="submit" className="w-full sm:w-auto">
                  <Save size={14} className="mr-1" />
                  {editingId ? 'Update' : 'Create'} User
                </Button>
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetForm}>
                  <X size={14} className="mr-1" />
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {users.map((user) => (
              <div key={user.id} className="p-3 sm:p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="font-semibold text-base sm:text-lg truncate">{user.username}</h4>
                      {user.is_admin && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full whitespace-nowrap">
                          Admin
                        </span>
                      )}
                      {user.username === 'Emre' && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full whitespace-nowrap">
                          Default Admin
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      Price Multiplier: <strong>{user.price_multiplier}x</strong>
                    </p>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {user.permissions.can_access_calculator && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Calculator</span>
                      )}
                      {user.permissions.can_access_machines && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Machines</span>
                      )}
                      {user.permissions.can_access_papers && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Papers</span>
                      )}
                      {user.permissions.can_access_extras && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">Extras</span>
                      )}
                      {user.permissions.can_see_input_prices && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">Input Prices</span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      Created: {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(user)}
                      className="flex items-center justify-center gap-1 w-full sm:w-auto"
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(user.id, user.username)}
                      className="flex items-center justify-center gap-1 w-full sm:w-auto"
                      disabled={user.username === 'Emre' || user.id === currentUser.id}
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found. Add a user to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManager;