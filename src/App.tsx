import { useState } from 'react'
import HistoryPage from './features/history/HistoryPage'
import TransferDetail from './features/history/TransferDetail'
import RecipientsPage from './features/recipients/RecipientsPage'
import SendPage from './features/send/SendPage'
import { useAppData } from './state/AppData'
import type { Transfer } from './types'

type Tab = 'send' | 'recipients' | 'history'

type Page = { name: Tab; addingRecipient?: boolean } | { name: 'transfer'; id: string; justSent?: boolean }

const NAV_ITEMS: { name: Tab; label: string }[] = [
  { name: 'send', label: 'Send money' },
  { name: 'recipients', label: 'Recipients' },
  { name: 'history', label: 'Activity' },
]

export default function App() {
  const [page, setPage] = useState<Page>({ name: 'send' })
  const { loading, error, reload } = useAppData()

  const activeTab = page.name === 'transfer' ? 'history' : page.name

  function handleSent(transfer: Transfer) {
    setPage({ name: 'transfer', id: transfer.id, justSent: true })
  }

  function renderPage() {
    switch (page.name) {
      case 'send':
        return <SendPage onSent={handleSent} onAddRecipient={() => setPage({ name: 'recipients', addingRecipient: true })} />
      case 'recipients':
        return <RecipientsPage startAdding={page.addingRecipient ?? false} />
      case 'history':
        return <HistoryPage onOpen={(id) => setPage({ name: 'transfer', id })} />
      case 'transfer':
        return (
          <TransferDetail
            transferId={page.id}
            justSent={page.justSent ?? false}
            onBack={() => setPage({ name: 'history' })}
          />
        )
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <span className="brand">
            <span className="brand__mark" aria-hidden="true">S</span>
            Sendwell
          </span>
          <nav className="nav" aria-label="Main">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.name}
                type="button"
                className={`nav__item${activeTab === item.name ? ' nav__item--active' : ''}`}
                aria-current={activeTab === item.name ? 'page' : undefined}
                onClick={() => setPage({ name: item.name })}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main">
        {loading ? (
          <p className="muted">Loading your account…</p>
        ) : error ? (
          <div className="alert alert--error">
            <p>{error}</p>
            <button type="button" className="button button--secondary" onClick={reload}>
              Try again
            </button>
          </div>
        ) : (
          renderPage()
        )}
      </main>
    </div>
  )
}
