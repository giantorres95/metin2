import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import AddAccountForm from '../components/AddAccountForm';

interface GameAccount {
  id: string;
  username: string;
  password: string;
  status: 'online' | 'offline';
  activity: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

const ACTIVITIES = ['Girando', 'Expando', 'Dungeon'];

export default function AccountList() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<GameAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [notesTimers, setNotesTimers] = useState<Record<string, ReturnType<typeof setTimeout>>>({});
  const [copiedId, setCopiedId] = useState('');

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }, []);

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1500);
    }).catch(() => showToast('Errore nella copia.'));
  }

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get<GameAccount[]>('/game-accounts'); setAccounts(data); }
      catch { setError('Errore nel caricamento degli account.'); }
      finally { setLoading(false); }
    })();
  }, []);

  async function handleToggle(acc: GameAccount) {
    const prev = { status: acc.status, activity: acc.activity };
    const newStatus = acc.status === 'online' ? 'offline' : 'online';
    const newActivity = newStatus === 'offline' ? '' : acc.activity;

    setAccounts((a) => a.map((x) => (x.id === acc.id ? { ...x, status: newStatus, activity: newActivity } : x)));
    try {
      await api.patch(`/game-accounts/${acc.id}/status`, { activity: newActivity });
    } catch {
      setAccounts((a) => a.map((x) => (x.id === acc.id ? { ...x, status: prev.status, activity: prev.activity } : x)));
      showToast('Errore nel cambio di stato.');
    }
  }

  async function handleActivityChange(acc: GameAccount, activity: string) {
    const prevActivity = acc.activity;
    setAccounts((a) => a.map((x) => (x.id === acc.id ? { ...x, activity } : x)));
    try {
      await api.patch(`/game-accounts/${acc.id}/activity`, { activity });
    } catch {
      setAccounts((a) => a.map((x) => (x.id === acc.id ? { ...x, activity: prevActivity } : x)));
      showToast('Errore nel cambio attività.');
    }
  }

  function handleNotesChange(acc: GameAccount, notes: string) {
    setAccounts((a) => a.map((x) => (x.id === acc.id ? { ...x, notes } : x)));
    // Debounce: salva dopo 500ms di inattività
    if (notesTimers[acc.id]) clearTimeout(notesTimers[acc.id]);
    const timer = setTimeout(async () => {
      try {
        await api.patch(`/game-accounts/${acc.id}/notes`, { notes });
      } catch {
        showToast('Errore nel salvataggio delle note.');
      }
    }, 500);
    setNotesTimers((prev) => ({ ...prev, [acc.id]: timer }));
  }

  async function handleDelete(acc: GameAccount) {
    if (!window.confirm(`Eliminare l'account "${acc.username}"?`)) return;
    try {
      await api.delete(`/game-accounts/${acc.id}`);
      setAccounts((a) => a.filter((x) => x.id !== acc.id));
    } catch { showToast('Errore durante l\'eliminazione.'); }
  }

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: '#a89060' }}>Caricamento…</div>;
  if (error) return <div style={{ padding: 48, textAlign: 'center', color: '#e74c3c' }}>{error}</div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontFamily: "'Cinzel', serif", color: '#c9a84c', fontSize: '1.4rem' }}>⚔ Account di Gioco</h1>
        <button onClick={() => setShowForm(true)} style={btnGold}>+ Aggiungi Account</button>
      </div>

      {accounts.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666', padding: 32 }}>Nessun account presente.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #3a2a1a' }}>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Password</th>
                <th style={thStyle}>Stato</th>
                <th style={thStyle}>Attività</th>
                <th style={thStyle}>Note</th>
                {user?.role === 'admin' && <th style={thStyle}>Azioni</th>}
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{acc.username}</span>
                      <button
                        onClick={() => handleCopy(acc.username, acc.id + '-user')}
                        title="Copia username"
                        style={copyBtn}
                      >
                        {copiedId === acc.id + '-user' ? '✓' : '📋'}
                      </button>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{acc.password}</span>
                      <button
                        onClick={() => handleCopy(acc.password, acc.id + '-pass')}
                        title="Copia password"
                        style={copyBtn}
                      >
                        {copiedId === acc.id + '-pass' ? '✓' : '📋'}
                      </button>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => handleToggle(acc)} style={{
                      ...toggleBtn,
                      background: acc.status === 'online'
                        ? 'linear-gradient(135deg, #1a6b35 0%, #27ae60 100%)'
                        : 'linear-gradient(135deg, #8b1a1a 0%, #c0392b 100%)',
                      boxShadow: acc.status === 'online'
                        ? '0 0 10px rgba(39, 174, 96, 0.4)'
                        : '0 0 10px rgba(192, 57, 43, 0.4)',
                    }}>
                      <span style={{
                        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                        background: acc.status === 'online' ? '#2ecc71' : '#e74c3c',
                        marginRight: 6, boxShadow: `0 0 6px ${acc.status === 'online' ? '#2ecc71' : '#e74c3c'}`,
                      }} />
                      {acc.status === 'online' ? 'Online' : 'Offline'}
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={acc.activity || ''}
                      onChange={(e) => handleActivityChange(acc, e.target.value)}
                      disabled={acc.status === 'offline'}
                      style={{
                        ...selectStyle,
                        opacity: acc.status === 'offline' ? 0.4 : 1,
                        cursor: acc.status === 'offline' ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <option value="">—</option>
                      {ACTIVITIES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={acc.notes || ''}
                      onChange={(e) => handleNotesChange(acc, e.target.value)}
                      placeholder="—"
                      maxLength={100}
                      style={notesInputStyle}
                    />
                  </td>
                  {user?.role === 'admin' && (
                    <td style={tdStyle}>
                      <button onClick={() => handleDelete(acc)} style={btnDanger}>Elimina</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toastMsg && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: '#e8d48b', padding: '10px 24px',
          borderRadius: 6, fontSize: 14, zIndex: 2000,
          border: '1px solid #3a2a1a', boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        }}>
          {toastMsg}
        </div>
      )}

      {showForm && (
        <AddAccountForm onClose={() => setShowForm(false)} onAccountAdded={(a) => setAccounts((p) => [...p, { ...a, activity: '', notes: '' }])} />
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', color: '#a89060', fontSize: '0.8rem',
  textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
};
const tdStyle: React.CSSProperties = { padding: '10px 14px', color: '#e8d48b', fontSize: '0.9rem' };
const toggleBtn: React.CSSProperties = {
  padding: '5px 16px', borderRadius: 14, border: 'none',
  color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 13,
  display: 'flex', alignItems: 'center',
};
const selectStyle: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 4, border: '1px solid #3a2a1a',
  background: '#2a2a2a', color: '#e8d48b', fontSize: 13, outline: 'none',
};
const notesInputStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 4, border: '1px solid #3a2a1a',
  background: '#2a2a2a', color: '#e8d48b', fontSize: 13, outline: 'none',
  width: '100%', minWidth: 80,
};
const copyBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  fontSize: 14, padding: '2px 4px', borderRadius: 3,
  opacity: 0.7, lineHeight: 1,
};
const btnGold: React.CSSProperties = {
  padding: '8px 18px', borderRadius: 4, border: '1px solid #5a4020',
  background: 'linear-gradient(135deg, #8b6914 0%, #c9a84c 100%)',
  color: '#1a0a00', cursor: 'pointer', fontWeight: 600,
  fontFamily: "'Cinzel', serif", fontSize: '0.85rem',
};
const btnDanger: React.CSSProperties = {
  padding: '4px 14px', borderRadius: 4, border: '1px solid rgba(192, 57, 43, 0.5)',
  background: 'rgba(192, 57, 43, 0.2)', color: '#e74c3c', cursor: 'pointer', fontSize: 13, fontWeight: 500,
};
