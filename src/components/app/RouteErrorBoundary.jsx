import { Component } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card } from '../index.js'

export class RouteErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Route rendering failed', error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return <main className="page-content"><Card className="empty-card" role="alert"><h2>Halaman ini mengalami kendala.</h2><p>{this.state.error.message || 'Terjadi kesalahan saat menampilkan halaman.'}</p><div className="route-error-actions"><Button variant="outline" onClick={() => this.setState({ error: null })}>Coba tampilkan lagi</Button><Button as={Link} to="/">Kembali ke Dashboard</Button></div></Card></main>
  }
}
