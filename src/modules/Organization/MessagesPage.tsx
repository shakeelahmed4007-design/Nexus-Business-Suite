import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, MessageCircle, Send, Search, Paperclip, Phone, ArrowLeft, Globe, Facebook, Instagram, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { AccessPendingBanner } from '@/shared/components/AccessPendingBanner';
import { useDataAccess } from '@/shared/hooks/useDataAccess';
import { clsx } from 'clsx';

const API_BASE = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/api/integrations';

interface Thread {
  thread_id: string;
  shop_id: string;
  provider: 'whatsapp' | 'email' | 'facebook' | 'instagram' | 'website';
  contact_name: string;
  contact_email?: string;
  contact_phone?: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  messages: any[];
}

export function MessagesPage() {
  const { hasAccess } = useDataAccess('messages');
  const [channel, setChannel] = useState<'All' | 'WhatsApp' | 'Email'>('All');
  const [threads, setThreads] = useState<Thread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  const getHeaders = () => {
    const mockSession = btoa(JSON.stringify({ id: 'admin-001', role: 'shop_admin', shop_id: 'shop-001' }));
    return {
      'x-mock-session': mockSession,
      'Content-Type': 'application/json',
    };
  };

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const providerParam = channel === 'All' ? 'all' : channel.toLowerCase();
      const res = await fetch(`${API_BASE}/inbox/threads?provider=${providerParam}&search=${encodeURIComponent(query)}`, {
        headers: getHeaders(),
      }).then((r) => r.json());

      if (res.success && res.threads) {
        setThreads(res.threads);
        if (!selectedThreadId && res.threads.length > 0) {
          setSelectedThreadId(res.threads[0].thread_id);
        }
      }
    } catch (err) {
      console.error('Error fetching inbox threads:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThreadMessages = async (tId: string) => {
    try {
      const res = await fetch(`${API_BASE}/inbox/threads/${tId}/messages`, {
        headers: getHeaders(),
      }).then((r) => r.json());

      if (res.success) {
        setThreadMessages(res.messages || []);
      }
    } catch (err) {
      console.error('Error fetching thread messages:', err);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [channel, query]);

  useEffect(() => {
    if (selectedThreadId) {
      fetchThreadMessages(selectedThreadId);
    }
  }, [selectedThreadId]);

  const activeThread = threads.find((t) => t.thread_id === selectedThreadId);

  const handleSendMessage = async () => {
    if (!draft.trim() || !activeThread || sending) return;

    const messageText = draft.trim();
    setDraft('');
    setSending(true);

    try {
      const recipient = activeThread.contact_phone || activeThread.contact_email || activeThread.contact_name;
      const res = await fetch(`${API_BASE}/messages/send`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          thread_id: activeThread.thread_id,
          provider: activeThread.provider,
          recipient_identifier: recipient,
          message_text: messageText,
        }),
      }).then((r) => r.json());

      if (res.success) {
        fetchThreadMessages(activeThread.thread_id);
        fetchThreads();
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const getProviderIcon = (p: string) => {
    switch (p) {
      case 'whatsapp': return <MessageCircle className="h-3.5 w-3.5" />;
      case 'email': return <Mail className="h-3.5 w-3.5" />;
      case 'facebook': return <Facebook className="h-3.5 w-3.5" />;
      case 'instagram': return <Instagram className="h-3.5 w-3.5" />;
      case 'website': return <Globe className="h-3.5 w-3.5" />;
      default: return <MessageCircle className="h-3.5 w-3.5" />;
    }
  };

  const getProviderColor = (p: string) => {
    switch (p) {
      case 'whatsapp': return 'bg-emerald-500';
      case 'email': return 'bg-red-500';
      case 'facebook': return 'bg-blue-600';
      case 'instagram': return 'bg-pink-500';
      case 'website': return 'bg-brand-500';
      default: return 'bg-brand-500';
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Unified Inbox" subtitle="Real-time multi-channel communication hub across WhatsApp & Email.">
        <button
          onClick={() => fetchThreads()}
          className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-700 shadow-sm transition-all hover:bg-ink-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-200"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </PageHeader>

      {!hasAccess && <AccessPendingBanner />}

      <div className="grid h-[calc(100vh-12rem)] min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 lg:grid-cols-[340px_1fr]">
        {/* Thread list sidebar */}
        <div className={clsx('flex flex-col border-r border-ink-200 dark:border-ink-800', mobileShowChat ? 'hidden lg:flex' : 'flex')}>
          {/* Channel Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-ink-200 p-2.5 dark:border-ink-800 scrollbar-none">
            {(['All', 'WhatsApp', 'Email'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannel(ch)}
                className={clsx(
                  'flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all shrink-0',
                  channel === ch ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
                )}
              >
                {ch}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative p-3">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts or messages..."
              className="h-9 w-full rounded-xl border border-ink-200 bg-ink-50 pl-9 pr-3 text-xs dark:border-ink-700 dark:bg-ink-800"
            />
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {threads.length === 0 ? (
              <p className="p-4 text-center text-xs text-ink-400">No conversations found.</p>
            ) : (
              threads.map((t) => (
                <button
                  key={t.thread_id}
                  onClick={() => {
                    setSelectedThreadId(t.thread_id);
                    setMobileShowChat(true);
                  }}
                  className={clsx(
                    'flex w-full items-start gap-3 border-b border-ink-100 p-3.5 text-left transition-colors dark:border-ink-800/60',
                    selectedThreadId === t.thread_id ? 'bg-brand-50/80 dark:bg-brand-500/10' : 'hover:bg-ink-50 dark:hover:bg-ink-800/40'
                  )}
                >
                  <div className={clsx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm', getProviderColor(t.provider))}>
                    {t.contact_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-bold text-ink-900 dark:text-ink-50">{t.contact_name}</p>
                      <span className="text-[10px] text-ink-400">{new Date(t.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="truncate text-xs text-ink-500 dark:text-ink-400">{t.last_message}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-ink-500">
                        {getProviderIcon(t.provider)} {t.provider}
                      </span>
                      {t.unread_count > 0 && (
                        <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">
                          {t.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat view */}
        <div className={clsx('flex flex-col', !mobileShowChat ? 'hidden lg:flex' : 'flex')}>
          {activeThread ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between border-b border-ink-200 p-4 dark:border-ink-800">
                <div className="flex items-center gap-3">
                  <button onClick={() => setMobileShowChat(false)} className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div className={clsx('flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm', getProviderColor(activeThread.provider))}>
                    {activeThread.contact_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-900 dark:text-ink-50">{activeThread.contact_name}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      Channel: <span className="font-semibold uppercase text-brand-600">{activeThread.provider}</span>
                      {activeThread.contact_email ? ` • ${activeThread.contact_email}` : ''}
                      {activeThread.contact_phone ? ` • ${activeThread.contact_phone}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message timeline */}
              <div className="flex-1 space-y-3 overflow-y-auto bg-ink-50/50 p-4 dark:bg-ink-950/30 scrollbar-thin">
                <AnimatePresence>
                  {threadMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={clsx('flex', msg.direction === 'outgoing' ? 'justify-end' : 'justify-start')}
                    >
                      <div
                        className={clsx(
                          'max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-sm',
                          msg.direction === 'outgoing'
                            ? 'bg-brand-600 text-white'
                            : 'bg-white text-ink-900 dark:bg-ink-800 dark:text-ink-100 border border-ink-100 dark:border-ink-700'
                        )}
                      >
                        {msg.subject && <p className="font-bold text-xs border-b pb-1 mb-1 opacity-90">{msg.subject}</p>}
                        <p className="whitespace-pre-wrap">{msg.message_text}</p>
                        <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] opacity-75">
                          <span>{new Date(msg.created_at || msg.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.direction === 'outgoing' && <span>• {msg.status}</span>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Composer */}
              <div className="flex items-center gap-2 border-t border-ink-200 p-3 dark:border-ink-800">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Send reply via ${activeThread.provider.toUpperCase()}...`}
                  className="h-10 flex-1 rounded-xl border border-ink-200 bg-ink-50 px-4 text-xs sm:text-sm dark:border-ink-700 dark:bg-ink-800"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sending || !draft.trim()}
                  className="flex h-10 px-4 items-center gap-1.5 rounded-xl bg-brand-600 text-white font-medium text-xs transition-all hover:bg-brand-700 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Reply
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-xs text-ink-400">
              Select a conversation to view thread details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
