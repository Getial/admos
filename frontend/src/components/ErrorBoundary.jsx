import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-foreground">Algo salió mal</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Ocurrió un error inesperado. Recarga la página o vuelve al inicio.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => this.setState({ error: null })}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Reintentar
            </button>
            <a
              href="/orders"
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Ir a órdenes
            </a>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
