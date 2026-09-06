import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageCircle, Send, Search, Paperclip, Phone } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { conversations, chatThread, quickReplies, type Message } from '@/modules/Organization/messages';
import { clsx } from 'clsx';

export function MessagesPage() {
  const { hasAccess } = useDataAccess('messages');
  const [channel, setChannel] = useState<'All' | 'Email' | 'WhatsApp'>('All');

  const displayConversations = hasAccess ? conversations : [];
  const displayChatThread = hasAccess ? chatThread : [];

  const [selected, setSelected] = useState<Message | null>(displayConversations[0] || null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');

  const filtered = displayConversations.filter(
    (c) => (channel === 'All' || c.channel === channel) && c.contact.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <PageHeader title="Messages" subtitle="Unified inbox for Email and WhatsApp communications." />

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid h-[calc(100vh-12rem)] grid-cols-1 overflow-hidden rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 lg:grid-cols-[320px_1fr]">
        {/* Conversation list */}
        <div className="flex flex-col border-r border-ink-200 dark:border-ink-800">
          {/* Channel tabs */}
          <div className="flex gap-1 border-b border-ink-200 p-3 dark:border-ink-800">
            {(['All', 'WhatsApp', 'Email'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={clsx(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  channel === ch ? 'bg-brand-600 text-white' : 'text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800',
                )}
              >
                {ch === 'WhatsApp' && <MessageCircle className="h-3.5 w-3.5" />}
                {ch === 'Email' && <Mail className="h-3.5 w-3.5" />}
                {ch}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative p-3">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." className="h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-xs dark:border-ink-700 dark:bg-ink-800" />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={clsix(
                  'flex w-full items-start gap-3 border-b border-ink-100 p-3 text-left transition-colors dark:border-ink-800/60',
                  selected?.id === c.id ? 'bg-brand-50 dark:bg-brand-500/10' : 'hover:bg-ink-50 dark:hover:bg-ink-800/40',
                )}
              >
                <div className={clsix('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white',
                  c.channel === 'WhatsApp' ? 'bg-emerald-500' : 'bg-brand-500')}>
                  {c.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="truncate text-sm font-semibold text-ink-900 dark:text-ink-50">{c.contact}</p>
                    <span className="text-[10px] text-ink-400">{c.time}</span>
                  </div>
                  <p className="truncate text-xs text-ink-500 dark:text-ink-400">{c.preview}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={clsix('flex items-center gap-1 text-[10px]', c.channel === 'WhatsApp' ? 'text-emerald-600 dark:text-emerald-400' : 'text-brand-600 dark:text-brand-400')}>
                      {c.channel === 'WhatsApp' ? <MessageCircle className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                      {c.channel}
                    </span>
                    {c.unread && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat view */}
        <div className="flex flex-col">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-ink-200 p-4 dark:border-ink-800">
            <div className={clsix('flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white',
              selected.channel === 'WhatsApp' ? 'bg-emerald-500' : 'bg-brand-500')}>
              {selected.avatar}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">{selected.contact}</p>
              <p className="text-xs text-ink-400">{selected.channel} — Active now</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50/50 p-4 dark:bg-ink-950/30 scrollbar-thin">
            <AnimatePresence>
              {displayChatThread.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={clsix('flex', msg.sender === 'me' ? 'justify-end' : 'justify-start')}
                >
                  <div className={clsix(
                    'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
                    msg.sender === 'me'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-ink-800 shadow-card dark:bg-ink-800 dark:text-ink-100',
                  )}>
                    <p>{msg.text}</p>
                    <p className={clsix('mt-1 text-[10px]', msg.sender === 'me' ? 'text-brand-100' : 'text-ink-400')}>{msg.time}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Quick replies */}
          <div className="flex gap-2 overflow-x-auto border-t border-ink-100 px-4 py-2 dark:border-ink-800 scrollbar-thin">
            {quickReplies.map((qr) => (
              <button key={qr} onClick={() => setDraft(qr)} className="shrink-0 rounded-full bg-ink-100 px-3 py-1 text-xs text-ink-600 transition-colors hover:bg-brand-100 hover:text-brand-700 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-brand-500/20">
                {qr}
              </button>
            ))}
          </div>

          {/* Composer */}
          <div className="flex items-center gap-2 border-t border-ink-200 p-3 dark:border-ink-800">
            <button className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"><Paperclip className="h-5 w-5" /></button>
            <button className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"><Phone className="h-5 w-5" /></button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message..."
              className="h-10 flex-1 rounded-xl border border-ink-200 bg-ink-50 px-4 text-sm dark:border-ink-700 dark:bg-ink-800"
              onKeyDown={(e) => { if (e.key === 'Enter') setDraft(''); }}
            />
            <button onClick={() => setDraft('')} className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white transition-all hover:bg-brand-700 active:scale-95">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function clsix(...args: any[]) { return clsx(...args); }
