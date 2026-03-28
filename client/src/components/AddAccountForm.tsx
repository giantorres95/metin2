import { useState, type FormEvent } from 'react';
import api from '../api/axios';

interface GameAccount {
  id: string; username: string; password: string;
  status: 'online' | 'offline'; createdBy: string; createdAt: string;
}

interface Props {
  onClose: () => void;
  onAccountAdded: (account: GameAccount) => void;
}

export default function AddAccountForm({ onClose, onAccountAdded }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: { username?: string; password?: string } = {};
    if (!username.trim()) next.username = 'Username obbligatorio';
    if (!password.trim()) next.password = 'Password obbligatoria';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post<GameAccount>('/game-accounts', { username, password });
      onAccountAdded(data);
      onClose();
    } catch { setApiError('Errore durante la creazione. Riprova.'); }
    finally { setSubmitting(false); }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(145deg, #1a1a1a 0%, #111 100%)',
        borderRadius: 8, padding: 28, minWidth: 360, maxWidth: 440, width: '90%',
        border: '1px solid #3a2a1a', boxShadow: '0 0 30px rgba(201, 168, 76, 0.1)',
      }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: '0 0 18px', fontFamily: "'Cinzel', serif", color: '#c9a84c', fontSize: '1.2rem' }}>
          Aggiungi Account
        </h2>
        {apiError && <div style={{ color: '#e74c3c', marginBottom: 12, fontSize: 14,
          padding: '6px 10px', background: 'rgba(231,76,60,0.1)', borderRadius: 4,
          border: '1px solid rgba(231,76,60,0.3)' }}>{apiError}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label htmlFor="acc-username" style={labelStyle}>Username</label>
            <input id="acc-username" type="text" value={username}
              onChange={(e) => setUsername(e.target.value)} style={{
                ...inputStyle, border: errors.username ? '2px solid #e74c3c' : '1px solid #3a2a1a',
              }} />
            {errors.username && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 2 }}>{errors.username}</div>}
          </div>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="acc-password" style={labelStyle}>Password</label>
            <input id="acc-password" type="text" value={password}
              onChange={(e) => setPassword(e.target.value)} style={{
                ...inputStyle, border: errors.password ? '2px solid #e74c3c' : '1px solid #3a2a1a',
              }} />
            {errors.password && <div style={{ color: '#e74c3c', fontSize: 12, marginTop: 2 }}>{errors.password}</div>}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 18px', borderRadius: 4, border: '1px solid #3a2a1a',
              background: 'transparent', color: '#a89060', cursor: 'pointer',
            }}>Annulla</button>
            <button type="submit" disabled={submitting} style={{
              padding: '8px 18px', borderRadius: 4, border: 'none',
              background: 'linear-gradient(135deg, #8b6914 0%, #c9a84c 100%)',
              color: '#1a0a00', cursor: submitting ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontFamily: "'Cinzel', serif",
              opacity: submitting ? 0.7 : 1,
            }}>{submitting ? 'Salvataggio…' : 'Salva'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 4, fontWeight: 600,
  color: '#a89060', fontSize: '0.8rem',
  textTransform: 'uppercase', letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', boxSizing: 'border-box',
  background: '#2a2a2a', borderRadius: 4, color: '#e8d48b',
  fontSize: '0.95rem', outline: 'none',
};
