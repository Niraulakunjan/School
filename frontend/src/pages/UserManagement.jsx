import React, { useState, useEffect } from 'react';
import axios from '../api/axios';
import { UserPlus, Mail, Shield, X, Loader2, Search, User } from 'lucide-react';

const roleBadge = {
  SUPERUSER: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  ADMIN:     'bg-violet-500/10 text-violet-400 border-violet-500/20',
  TEACHER:   'bg-blue-500/10   text-blue-400   border-blue-500/20',
  STUDENT:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [newUser, setNewUser] = useState({ username: '', email: '', first_name: '', last_name: '', role: 'STUDENT', password: '' });

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/users/');
      setUsers(res.data);
    } catch { } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await axios.post('/users/', newUser);
      setShowModal(false);
      setNewUser({ username: '', email: '', first_name: '', last_name: '', role: 'STUDENT', password: '' });
      fetchUsers();
    } catch { alert('Error creating user. Username or email might be taken.'); }
    finally { setSubmitting(false); }
  };

  const filtered = users.filter(u =>
    `${u.username} ${u.email} ${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const Input = ({ label, ...props }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <input {...props}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
      />
    </div>
  );

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white">User Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage students, teachers, and staff members.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
        >
          <UserPlus size={16} /> Add User
        </button>
      </div>

      {/* Search */}
      <div className="relative w-full max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">User</th>
                <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user, i) => (
                <tr key={user.id} className={`hover:bg-slate-800/50 transition-colors ${i < filtered.length - 1 ? 'border-b border-slate-800' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(user.first_name || user.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{user.first_name || 'Anonymous'} {user.last_name}</p>
                        <p className="text-xs text-slate-500">@{user.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm text-slate-400">
                      <Mail size={13} className="text-slate-600" />
                      {user.email || '—'}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${roleBadge[user.role] || roleBadge.STUDENT}`}>
                      <Shield size={10} /> {user.role}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-12 text-center text-slate-500 text-sm">No users found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-black text-white">Register New User</h2>
                <p className="text-slate-400 text-xs mt-0.5">Fill in the details below</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all border-none bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" type="text" placeholder="John" value={newUser.first_name} onChange={e => setNewUser({...newUser, first_name: e.target.value})} />
                <Input label="Last Name" type="text" placeholder="Doe" value={newUser.last_name} onChange={e => setNewUser({...newUser, last_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Username" type="text" required placeholder="johndoe" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                <Input label="Email" type="email" required placeholder="john@example.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-3.5 text-white text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  >
                    <option value="STUDENT">Student</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="STAFF">Staff</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <Input label="Password" type="password" required placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-all text-sm shadow-lg shadow-indigo-500/20"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <><UserPlus size={16} /> Register User</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
