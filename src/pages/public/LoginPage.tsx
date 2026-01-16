import { Link } from '@tanstack/react-router'

export function LoginPage() {
  return (
    <div>
      <h3>Login</h3>
      <p>Welcome to Harmony</p>

      {/* For demo: link directly to app since we're not implementing real auth */}
      <Link
        to="/trade-activity/block-level"
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
        Enter App →
      </Link>
    </div>
  )
}
