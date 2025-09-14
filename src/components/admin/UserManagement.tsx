import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { PlusCircle, Edit, Trash2, AlertCircle, MoreVertical } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface User {
  id: number;
  email: string;
  role: 'admin' | 'sales_person';
  created_at: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
}

const UserManagement: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    role: 'sales_person' as 'admin' | 'sales_person',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const validateUser = (user: { email: string; password?: string }, isNew: boolean) => {
    const errors: ValidationErrors = {};
    if (!user.email.trim() || !/\S+@\S+\.\S+/.test(user.email)) {
      errors.email = 'A valid email is required';
    }
    if (isNew && (!user.password || user.password.length < 6)) {
      errors.password = 'Password must be at least 6 characters long';
    }
    return errors;
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.api.user.getAll(token);
      if (response.success) {
        setUsers(response.users);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  const handleAddUser = async () => {
    const errors = validateUser(newUserData, true);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    try {
      const response = await window.api.user.create(token, newUserData.email, newUserData.password, newUserData.role);
      if (response.success) {
        fetchUsers();
        setIsAddDialogOpen(false);
        setNewUserData({ email: '', password: '', role: 'sales_person' });
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add user');
    }
  };

  const handleUpdateUser = async () => {
    if (!currentUser) return;

    const errors = validateUser(currentUser, false);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    try {
      const response = await window.api.user.update(token, currentUser.id, currentUser.email, currentUser.role);
      if (response.success) {
        fetchUsers();
        setIsEditDialogOpen(false);
        setCurrentUser(null);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async () => {
    if (!currentUser) return;
    try {
      const response = await window.api.user.delete(token, currentUser.id);
      if (response.success) {
        fetchUsers();
        setIsDeleteDialogOpen(false);
        setCurrentUser(null);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>User Management</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => { setIsAddDialogOpen(isOpen); setValidationErrors({}); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" value={newUserData.email} onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })} className="col-span-3" />
                {validationErrors.email && <p className="col-span-4 text-red-500 text-sm text-right">{validationErrors.email}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">Password</Label>
                <Input id="password" type="password" value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} className="col-span-3" />
                {validationErrors.password && <p className="col-span-4 text-red-500 text-sm text-right">{validationErrors.password}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="role" className="text-right">Role</Label>
                <Select value={newUserData.role} onValueChange={(value) => setNewUserData({ ...newUserData, role: value as 'admin' | 'sales_person' })}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales_person">Sales Person</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddUser} disabled={Object.keys(validateUser(newUserData, true)).length > 0}>Add User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {/* Table for larger screens */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setCurrentUser(user); setIsEditDialogOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setCurrentUser(user); setIsDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Cards for smaller screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
          {users.map((user) => (
            <Card key={user.id} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{user.email}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => { setCurrentUser(user); setIsEditDialogOpen(true); }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setCurrentUser(user); setIsDeleteDialogOpen(true); }} className="text-red-500">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.role}</p>
                <p className="text-sm">Joined: {new Date(user.created_at).toLocaleDateString()}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setIsEditDialogOpen(isOpen); setValidationErrors({}); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            {currentUser && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-email" className="text-right">Email</Label>
                  <Input id="edit-email" type="email" value={currentUser.email} onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })} className="col-span-3" />
                  {validationErrors.email && <p className="col-span-4 text-red-500 text-sm text-right">{validationErrors.email}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-role" className="text-right">Role</Label>
                  <Select value={currentUser.role} onValueChange={(value) => setCurrentUser({ ...currentUser, role: value as 'admin' | 'sales_person' })}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales_person">Sales Person</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                 <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleUpdateUser} disabled={currentUser ? Object.keys(validateUser(currentUser, false)).length > 0 : false}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => !isOpen && setIsDeleteDialogOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete User</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete the user "{currentUser?.email}"?</p>
            <DialogFooter>
               <DialogClose asChild>
                 <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDeleteUser}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
};

export default UserManagement;