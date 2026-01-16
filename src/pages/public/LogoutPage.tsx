import { Link } from '@tanstack/react-router'

export function LogoutPage() {
  return (
    <div>
      <h3>Logged Out</h3>
      <p>You have been logged out successfully.</p>
      <Link
        to="/login"
        style={{
          display: 'inline-block',
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#646cff',
          color: 'white',
          borderRadius: '4px',
          textDecoration: 'none',
        }}
      >
        ← Back to Login
      </Link>
    </div>
  )
}
