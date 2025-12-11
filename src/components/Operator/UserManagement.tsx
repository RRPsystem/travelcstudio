import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Shield, User, Building, Users, Key } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  role: string;
  brand_id: string | null;
  created_at: string;
  brand_name?: string;
}

interface Brand {
  id: string;
  name: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewUserForm, setShowNewUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [orphanedUsers, setOrphanedUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [showOrphanedUsers, setShowOrphanedUsers] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'brand',
    brand_id: ''
  });

  useEffect(() => {
    loadUsers();
    loadBrands();
    checkOrphanedUsers();
  }, []);

  const checkOrphanedUsers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/check-orphaned-users`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setOrphanedUsers(result.orphanedUsers || []);
      }
    } catch (error) {
      console.error('Error checking orphaned users:', error);
    }
  };

  const cleanupOrphanedUser = async (userId: string, email: string) => {
    if (!confirm(`Weet je zeker dat je ${email} wilt verwijderen uit het authenticatiesysteem?`)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Je moet ingelogd zijn');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/cleanup-orphaned-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ user_id: userId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Fout bij opruimen gebruiker');
      }

      alert('Gebruiker succesvol verwijderd uit authenticatiesysteem!');
      checkOrphanedUsers();
    } catch (error: any) {
      console.error('Error cleaning up user:', error);
      alert('Fout bij opruimen gebruiker: ' + error.message);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        brands(name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setUsers(data.map(user => ({
        ...user,
        brand_name: user.brands?.name
      })));
    }
    setLoading(false);
  };

  const loadBrands = async () => {
    const { data } = await supabase
      .from('brands')
      .select('id, name')
      .order('name');

    if (data) {
      setBrands(data);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Je moet ingelogd zijn');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role,
          brand_id: formData.role === 'brand' ? formData.brand_id : null
        })
      });

      const result = await response.json();

      if (!response.ok) {
        let errorMessage = result.error || 'Fout bij aanmaken gebruiker';
        if (errorMessage.includes('already been registered')) {
          errorMessage = 'Dit email adres is al in gebruik. De gebruiker bestaat mogelijk al in het systeem maar is niet zichtbaar. Neem contact op met de systeembeheerder.';
        }
        throw new Error(errorMessage);
      }

      alert('Gebruiker succesvol aangemaakt!');
      setShowNewUserForm(false);
      setFormData({ email: '', password: '', role: 'brand', brand_id: '' });
      loadUsers();
      checkOrphanedUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      alert('Fout bij aanmaken gebruiker: ' + error.message);
    }
  };

  const handleUpdateUser = async (userId: string, updates: Partial<UserData>) => {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId);

    if (error) {
      alert('Fout bij bijwerken gebruiker: ' + error.message);
    } else {
      alert('Gebruiker bijgewerkt!');
      setEditingUser(null);
      loadUsers();
      checkOrphanedUsers();
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Weet je zeker dat je ${userEmail} wilt verwijderen?`)) {
      return;
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      alert('Fout bij verwijderen gebruiker: ' + error.message);
    } else {
      alert('Gebruiker verwijderd!');
      loadUsers();
      checkOrphanedUsers();
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;

    if (newPassword.length < 6) {
      alert('Wachtwoord moet minimaal 6 karakters zijn');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Je moet ingelogd zijn');
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/update-user-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_id: resetPasswordUser.id,
          new_password: newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Fout bij resetten wachtwoord');
      }

      alert('Wachtwoord succesvol gereset!');
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      alert('Fout bij resetten wachtwoord: ' + error.message);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="w-5 h-5 text-red-600" />;
      case 'operator':
        return <Shield className="w-5 h-5 text-orange-600" />;
      case 'brand':
        return <Building className="w-5 h-5 text-blue-600" />;
      case 'agent':
        return <User className="w-5 h-5 text-green-600" />;
      default:
        return <User className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'operator':
        return 'bg-orange-100 text-orange-700';
      case 'brand':
        return 'bg-blue-100 text-blue-700';
      case 'agent':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Laden...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        {orphanedUsers.length > 0 && (
          <button
            onClick={() => setShowOrphanedUsers(!showOrphanedUsers)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <Shield className="w-5 h-5" />
            Orphaned Users ({orphanedUsers.length})
          </button>
        )}
        <button
          onClick={() => setShowNewUserForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nieuwe Gebruiker
        </button>
      </div>

      {showOrphanedUsers && orphanedUsers.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-orange-900 mb-4">Orphaned Users</h3>
          <p className="text-sm text-orange-800 mb-4">
            Deze gebruikers bestaan in het authenticatiesysteem maar niet in de applicatie database.
            Verwijder ze om nieuwe gebruikers met deze email adressen aan te kunnen maken.
          </p>
          <div className="space-y-2">
            {orphanedUsers.map(user => (
              <div key={user.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                <span className="text-gray-900">{user.email}</span>
                <button
                  onClick={() => cleanupOrphanedUser(user.id, user.email)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                >
                  Verwijderen
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNewUserForm && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Nieuwe Gebruiker Aanmaken</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Wachtwoord *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="brand">Brand</option>
                  <option value="agent">Agent</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {formData.role === 'brand' && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand *
                  </label>
                  <select
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selecteer een brand</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Aanmaken
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewUserForm(false);
                  setFormData({ email: '', password: '', role: 'brand', brand_id: '' });
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gebruiker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Brand
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aangemaakt
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acties
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {getRoleIcon(user.role)}
                      <span className="font-medium text-gray-900">{user.email.split('@')[0]}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {user.brand_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-sm">
                    {new Date(user.created_at).toLocaleDateString('nl-NL')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Bewerken"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setResetPasswordUser({ id: user.id, email: user.email })}
                        className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                        title="Reset Wachtwoord"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Gebruiker Bewerken</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="brand">Brand</option>
                  <option value="agent">Agent</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {editingUser.role === 'brand' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <select
                    value={editingUser.brand_id || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, brand_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecteer een brand</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleUpdateUser(editingUser.id, {
                    role: editingUser.role,
                    brand_id: editingUser.role === 'brand' ? editingUser.brand_id : null
                  })}
                  className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Opslaan
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {resetPasswordUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Wachtwoord Resetten</h3>
            <p className="text-gray-600 mb-4">
              Nieuw wachtwoord voor: <strong>{resetPasswordUser.email}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nieuw Wachtwoord *
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Minimaal 6 karakters"
                  minLength={6}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleResetPassword}
                  className="flex-1 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  disabled={!newPassword || newPassword.length < 6}
                >
                  Reset Wachtwoord
                </button>
                <button
                  onClick={() => {
                    setResetPasswordUser(null);
                    setNewPassword('');
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Rollen Uitleg</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>Admin:</strong> Volledige toegang tot alle systemen</li>
              <li><strong>Operator:</strong> Beheer van systeem instellingen en content</li>
              <li><strong>Brand:</strong> Beheer van eigen merk website en content</li>
              <li><strong>Agent:</strong> Toegang tot reisagent functionaliteit</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}