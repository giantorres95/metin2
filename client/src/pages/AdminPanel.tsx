import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import type { AxiosError } from 'axios';

interface UserDTO { id: string; name: string; email: string; role: 'admin' | 'user'; createdAt: string; }
interface CreateUserForm { name: string; email: string; password: string; role: 'admin' | 'user'; }
interface EditUserForm { name: string; email: string; password: string; role: 'admin' | 'user'; }
interface ApiErrorResponse { error?: { code?: string; message?: string }; }

const emptyCreate: CreateUserForm = { name: '', email: '', password: '', role: 'user' };

function getErrMsg(err: unknown): string {
  const ax = err as AxiosError<ApiErrorResponse>;
  const code = ax.response?.data?.error?.code;
  if (ax.response?.status === 409 || code === 'DUPLICATE_EMAIL') return 'Email già in uso';
  if (ax.response?.status === 404 || code === 'NOT_FOUND') return 'Utente non trovato';
  return 'Errore durante l\'operazione. Riprova.';
}

export default function AdminPanel() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreate);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({ name: '', email: '', password: '', role: 'user' });
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const showToast = useCallback((msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); }, []);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get<UserDTO[]>('/users'); setUsers(data); }
      catch { setFetchError('Errore nel caricamento degli utenti.'); }
      finally { setLoading(false); }
    })();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setCreateError(''); setCreating(true);
    try {
      const { data } = await api.post<UserDTO>('/users', createForm);
      setUsers((p) => [...p, data]); setCreateForm(emptyCreate); showToast('Utente creato');
    } catch (err) { setCreateError(getErrMsg(err)); }
    finally { setCreating(false); }
  }

  function startEdit(u: UserDTO) { setEditingId(u.id); setEditForm({ name: u.name, email: u.email, password: '', role: u.role }); setEditError(''); }

  async function handleSave(id: string, orig: UserDTO) {
    setEditError(''); setSaving(true);
    const p: Record<string, string> = {};
    if (editForm.name !== orig.name) p.name = editForm.name;
    if (editForm.email !== orig.email) p.email = editForm.email;
    if (editForm.password) p.password = editForm.password;
    if (editForm.role !== orig.role) p.role = editForm.role;
    if (!Object.keys(p).length) { setEditingId(null); setSaving(false); return; }
    try {
      const { data } = await api.patch<UserDTO>(`/users/${id}`, p);
      setUsers((prev) => prev.map((u) => (u.id === id ? data : u)));
      setEditingId(null); showToast('Utente aggiornato');
    } catch (err) { setEditError(getErrMsg(err)); }
    finally { setSaving(false); }
  }

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#a89060' }}>Caricamento…</div>;
  if (fetchError) return <div style={{ padding: 48, textAlign: 'center', color: '#e74c3c' }}>{fetchError}</div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 24px', fontFamily: "'Cinzel', serif", color: '#c9a84c', fontSize: '1.4rem' }}>
        ⚔ Pannello Admin
      </h1>

      {/* Create User */}
      <section style={{ marginBottom: 32, padding: 20, border: '1px solid #3a2a1a', borderRadius: 6, background: '#1a1a1a' }}>
        <h2 style={{ marginTop: 0, fontFamily: "'Cinzel', serif", color: '#c9a84c', fontSize: '1.1rem', marginBottom: 16 }}>Crea Utente</h2>
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
          <input type="text" placeholder="Nome" required value={createForm.name}
            onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} style={inputStyle} />
          <input type="email" placeholder="Email" required value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))} style={inputStyle} />
          <input type="password" placeholder="Password (min 6 caratteri)" required minLength={6}
            value={createForm.password} onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))} style={inputStyle} />
          <select value={createForm.role} onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value as 'admin' | 'user' }))} style={inputStyle}>
            <option value="user">Utente</option>
            <option value="admin">Admin</option>
          </select>
          {createError && <div style={errStyle}>{createError}</div>}
          <button type="submit" disabled={creating} style={{ ...btnGold, alignSelf: 'flex-start', opacity: creating ? 0.7 : 1 }}>
            {creating ? 'Creazione…' : 'Crea Utente'}
          </button>
        </form>
      </section>

      {/* User List */}
      <section>
        <h2 style={{ fontFamily: "'Cinzel', serif", color: '#c9a84c', fontSize: '1.1rem', marginBottom: 16 }}>Utenti</h2>
        {users.length === 0 ? (
          <p style={{ color: '#666' }}>Nessun utente presente.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #3a2a1a' }}>
                <th style={thStyle}>Nome</th><th style={thStyle}>Email</th>
                <th style={thStyle}>Ruolo</th><th style={thStyle}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => editingId === u.id ? (
                <tr key={u.id} style={{ borderBottom: '1px solid #2a2a2a', background: '#151515' }}>
                  <td style={tdStyle}><input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, width: '100%' }} /></td>
                  <td style={tdStyle}><input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} style={{ ...inputStyle, width: '100%' }} /></td>
                  <td style={tdStyle}><select value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as 'admin' | 'user' }))} style={inputStyle}><option value="user">Utente</option><option value="admin">Admin</option></select></td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input type="password" placeholder="Nuova password (opz.)" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} style={inputStyle} />
                      {editError && <div style={{ color: '#e74c3c', fontSize: 12 }}>{editError}</div>}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleSave(u.id, u)} disabled={saving} style={{ ...btnGold, fontSize: 12, padding: '4px 12px' }}>{saving ? 'Salvataggio…' : 'Salva'}</button>
                        <button onClick={() => setEditingId(null)} style={{ padding: '4px 12px', borderRadius: 4, border: '1px solid #3a2a1a', background: 'transparent', color: '#a89060', cursor: 'pointer', fontSize: 12 }}>Annulla</button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={tdStyle}>{u.name}</td>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>
                    <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: u.role === 'admin' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)',
                      color: u.role === 'admin' ? '#c9a84c' : '#666',
                      border: u.role === 'admin' ? '1px solid rgba(201,168,76,0.3)' : '1px solid #333',
                    }}>{u.role === 'admin' ? 'Admin' : 'Utente'}</span>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => startEdit(u)} style={{ padding: '4px 14px', borderRadius: 4, border: '1px solid #5a4020', background: 'rgba(201,168,76,0.1)', color: '#c9a84c', cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>Modifica</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#e8d48b', padding: '10px 24px', borderRadius: 6,
          fontSize: 14, zIndex: 2000, border: '1px solid #3a2a1a', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
          {toastMsg}
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 4, border: '1px solid #3a2a1a',
  background: '#2a2a2a', color: '#e8d48b', fontSize: '0.9rem', outline: 'none',
};
const thStyle: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', color: '#a89060', fontSize: '0.8rem',
  textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
};
const tdStyle: React.CSSProperties = { padding: '10px 14px', color: '#e8d48b', fontSize: '0.9rem' };
const btnGold: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 4, border: 'none',
  background: 'linear-gradient(135deg, #8b6914 0%, #c9a84c 100%)',
  color: '#1a0a00', cursor: 'pointer', fontWeight: 600,
  fontFamily: "'Cinzel', serif", fontSize: '0.85rem',
};
const errStyle: React.CSSProperties = {
  color: '#e74c3c', fontSize: 14, padding: '6px 10px',
  background: 'rgba(231,76,60,0.1)', borderRadius: 4, border: '1px solid rgba(231,76,60,0.3)',
};
