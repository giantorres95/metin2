import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const linkStyle = (path: string): React.CSSProperties => ({
    color: location.pathname === path ? '#c9a84c' : '#a89060',
    textDecoration: 'none',
    fontFamily: "'Cinzel', serif",
    fontWeight: location.pathname === path ? 700 : 500,
    fontSize: '0.9rem',
    letterSpacing: '0.04em',
    padding: '0.3rem 0',
    borderBottom: location.pathname === path ? '2px solid #c9a84c' : '2px solid transparent',
    transition: 'all 0.2s',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d' }}>
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1.5rem',
        background: 'linear-gradient(180deg, #1a0a00 0%, #0d0d0d 100%)',
        borderBottom: '1px solid #3a2a1a',
        boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <span style={{
            fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.15rem',
            color: '#c9a84c',
            textShadow: '0 0 8px rgba(201, 168, 76, 0.3)',
          }}>
            ⚔ Metin2 Guild
          </span>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <Link to="/accounts" style={linkStyle('/accounts')}>Account</Link>
            {user?.role === 'admin' && (
              <Link to="/admin" style={linkStyle('/admin')}>Admin</Link>
            )}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#666' }}>
            {user?.name || user?.email}
          </span>
          <button onClick={() => void logout()} style={{
            background: 'transparent',
            border: '1px solid #3a2a1a',
            color: '#a89060', padding: '0.3rem 0.75rem',
            borderRadius: '4px', cursor: 'pointer',
            fontSize: '0.8rem', fontFamily: "'Cinzel', serif",
          }}>
            Logout
          </button>
        </div>
      </header>
      <main style={{ padding: '1.5rem' }}>
        <Outlet />
      </main>
    </div>
  );
}
