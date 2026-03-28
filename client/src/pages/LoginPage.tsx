import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch {
      setError('Credenziali non valide');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.ornament}>⚔</div>
        <h1 style={styles.title}>Metin2 Guild Manager</h1>
        <p style={styles.subtitle}>Accedi al portale della gilda</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="username" style={styles.label}>Username</label>
            <input id="username" type="text" value={username}
              onChange={(e) => setUsername(e.target.value)} required
              autoComplete="username" style={styles.input}
              placeholder="Il tuo username" />
          </div>
          <div style={styles.field}>
            <label htmlFor="password" style={styles.label}>Password</label>
            <input id="password" type="password" value={password}
              onChange={(e) => setPassword(e.target.value)} required
              autoComplete="current-password" style={styles.input}
              placeholder="••••••••" />
          </div>
          {error && <p style={styles.error} role="alert">{error}</p>}
          <button type="submit" disabled={isSubmitting} style={{
            ...styles.button,
            opacity: isSubmitting ? 0.7 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}>
            {isSubmitting ? 'Accesso in corso…' : '⚔ Accedi ⚔'}
          </button>
        </form>
      </div>
    </div>
  );
}


const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at center, #1a0f00 0%, #0d0d0d 70%)',
  },
  card: {
    background: 'linear-gradient(145deg, #1a1a1a 0%, #111 100%)',
    padding: '2.5rem 2rem',
    borderRadius: '8px',
    border: '1px solid #3a2a1a',
    boxShadow: '0 0 30px rgba(201, 168, 76, 0.1), 0 4px 20px rgba(0,0,0,0.5)',
    width: '100%', maxWidth: '400px',
    textAlign: 'center' as const,
  },
  ornament: {
    fontSize: '2.5rem', marginBottom: '0.5rem',
    filter: 'drop-shadow(0 0 8px rgba(201, 168, 76, 0.4))',
  },
  title: {
    fontFamily: "'Cinzel', serif",
    fontSize: '1.6rem', fontWeight: 700,
    color: '#c9a84c',
    marginBottom: '0.25rem',
    textShadow: '0 0 10px rgba(201, 168, 76, 0.3)',
  },
  subtitle: {
    fontSize: '0.85rem', color: '#a89060',
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex', flexDirection: 'column' as const, gap: '1rem',
    textAlign: 'left' as const,
  },
  field: {
    display: 'flex', flexDirection: 'column' as const, gap: '0.3rem',
  },
  label: {
    fontSize: '0.8rem', fontWeight: 600,
    color: '#a89060', textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  input: {
    padding: '0.6rem 0.75rem',
    background: '#2a2a2a',
    border: '1px solid #3a2a1a',
    borderRadius: '4px',
    fontSize: '0.95rem',
    color: '#e8d48b',
    outline: 'none',
  },
  error: {
    color: '#e74c3c', fontSize: '0.85rem',
    margin: 0, textAlign: 'center' as const,
    padding: '0.4rem', background: 'rgba(231, 76, 60, 0.1)',
    borderRadius: '4px', border: '1px solid rgba(231, 76, 60, 0.3)',
  },
  button: {
    padding: '0.7rem',
    background: 'linear-gradient(135deg, #8b6914 0%, #c9a84c 50%, #8b6914 100%)',
    color: '#1a0a00', border: 'none', borderRadius: '4px',
    fontSize: '1rem', fontWeight: 700,
    fontFamily: "'Cinzel', serif",
    letterSpacing: '0.05em',
    marginTop: '0.5rem',
    textShadow: '0 1px 0 rgba(255,255,255,0.2)',
  },
};
