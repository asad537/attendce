import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../services/api';
import { Conversation, InboxMessage, MessageUser, messageService } from '../../services/messageService';
import { useCall } from '../../hooks/useCall';

const initials = (name = '') => name.split(' ').slice(0, 2).map(word => word[0]).join('').toUpperCase();
const colors = ['from-[#34d399] to-[#047857]', 'from-[#6a9f91] to-[#245b4f]', 'from-[#d6a24e] to-[#97691d]', 'from-[#7b8fb6] to-[#435577]'];

function Avatar({ user, index = 0, large = false }: { user: MessageUser; index?: number; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  const src = user.avatar_url || user.avatar;
  return src && !failed
    ? <img src={src} alt="" onError={() => setFailed(true)} className={`${large ? 'h-11 w-11' : 'h-10 w-10'} shrink-0 rounded-full object-cover ring-4 ring-[#d1fae5]`} />
    : <span className={`${large ? 'h-11 w-11' : 'h-10 w-10'} grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${colors[index % colors.length]} text-xs font-bold text-white ring-4 ring-[#d1fae5]`}>{initials(user.name)}</span>;
}

function DoubleCheck({ className = '' }: { className?: string }) {
  return <svg viewBox="0 0 16 15" className={`inline-block h-[15px] w-[16px] shrink-0 ${className}`} fill="currentColor" aria-hidden="true">
    <path d="M15.01 3.316l-.478-.372a.365.365 0 0 0-.51.063L8.666 9.879a.32.32 0 0 1-.484.033l-.358-.325a.319.319 0 0 0-.484.032l-.378.483a.418.418 0 0 0 .036.541l1.32 1.266c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.063-.51z"/>
    <path d="M10.91 3.316l-.478-.372a.365.365 0 0 0-.51.063L4.566 9.879a.32.32 0 0 1-.484.033L1.89 7.769a.366.366 0 0 0-.515.006l-.423.433a.364.364 0 0 0 .006.514l3.258 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"/>
  </svg>;
}

function TypingIndicator({ user }: { user: MessageUser }) {
  return <div aria-label={`${user.name} is typing`} className="absolute bottom-16 left-5 z-10 flex items-end gap-2">
    <Avatar user={user} />
    <span className="flex h-9 items-center gap-1 rounded-2xl rounded-bl-none bg-white px-3 shadow-sm">
      <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500" />
      <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
      <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
    </span>
  </div>;
}

function VideoIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-[21px] w-[21px]" aria-hidden="true"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>;
}
function PhoneIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-[19px] w-[19px]" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1.02l-2.2 2.2z"/></svg>;
}
function MenuIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" className="h-[20px] w-[20px]" aria-hidden="true"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>;
}
function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-[19px] w-[19px]" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
}
function ClipIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[22px] w-[22px]" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;
}
function FileIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>;
}
function ChevronDown() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>;
}

function Video({ stream, muted, className }: { stream: MediaStream | null; muted?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
}

function CallScreen({ call }: { call: ReturnType<typeof useCall> }) {
  const { state, localStream, remoteStream, accept, reject, hangup, toggleMute, toggleCam } = call;
  const { peer, kind, status, muted, camOff, error } = state;
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (status !== 'connected') { setSeconds(0); return; }
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);
  if (!peer) return null;
  const isVideo = kind === 'video';
  const hasRemoteVideo = isVideo && status === 'connected';
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const label = status === 'incoming' ? `Incoming ${isVideo ? 'video' : 'voice'} call…`
    : status === 'calling' ? 'Calling…'
    : status === 'connecting' ? 'Connecting…'
    : status === 'connected' ? mmss
    : 'Call ended';
  const avatar = peer.avatar_url || peer.avatar;
  return <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#0c241b] to-[#04120d] text-white">
    {remoteStream && (hasRemoteVideo
      ? <Video stream={remoteStream} className="absolute inset-0 h-full w-full bg-black object-cover" />
      : <Video stream={remoteStream} className="hidden" />)}
    {isVideo && localStream && status !== 'incoming' && <Video stream={localStream} muted className="absolute right-4 top-4 z-10 h-40 w-28 rounded-xl border-2 border-white/25 object-cover shadow-lg sm:h-48 sm:w-36" />}

    <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-6 py-12">
      <div className="flex flex-col items-center gap-4 pt-8">
        {!hasRemoteVideo && (avatar
          ? <img src={avatar} alt="" className="h-28 w-28 rounded-full object-cover ring-4 ring-white/15"/>
          : <span className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-br from-[#34d399] to-[#047857] text-4xl font-bold ring-4 ring-white/15">{initials(peer.name)}</span>)}
        <h2 className="text-2xl font-semibold drop-shadow">{peer.name}</h2>
        <p className="flex items-center gap-2 text-sm text-white/80 drop-shadow">{(status === 'calling' || status === 'connecting') && <span className="h-2 w-2 animate-ping rounded-full bg-[#34d399]"/>}{isVideo ? 'Video call' : 'Voice call'} · {label}</p>
        {error && <p className="max-w-xs rounded-lg bg-[#e94141]/90 px-3 py-2 text-center text-xs">{error}</p>}
      </div>

      {status === 'incoming'
        ? <div className="flex items-center gap-12">
            <button onClick={reject} className="flex flex-col items-center gap-2"><span className="grid h-16 w-16 place-items-center rounded-full bg-[#e94141] shadow-lg transition hover:bg-[#d12f2f]"><span className="rotate-[135deg]"><PhoneIcon/></span></span><small className="text-white/70">Decline</small></button>
            <button onClick={accept} className="flex flex-col items-center gap-2"><span className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 shadow-lg transition hover:bg-emerald-600">{isVideo ? <VideoIcon/> : <PhoneIcon/>}</span><small className="text-white/70">Accept</small></button>
          </div>
        : <div className="flex items-center gap-5">
            <button onClick={toggleMute} className={`grid h-14 w-14 place-items-center rounded-full text-xl transition ${muted ? 'bg-white text-[#0c241b]' : 'bg-white/15 /25'}`} title={muted ? 'Unmute' : 'Mute'}>{muted ? '🔇' : '🎙'}</button>
            {isVideo && <button onClick={toggleCam} className={`grid h-14 w-14 place-items-center rounded-full transition ${camOff ? 'bg-white text-[#0c241b]' : 'bg-white/15 /25'}`} title={camOff ? 'Turn camera on' : 'Turn camera off'}><VideoIcon/></button>}
            <button onClick={hangup} className="grid h-16 w-16 place-items-center rounded-full bg-[#e94141] shadow-lg transition " title="End call"><span className="rotate-[135deg]"><PhoneIcon/></span></button>
          </div>}
    </div>
  </div>;
}

const dateLabel = (date: Date) => isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'dd MMM yyyy');
const timeLabel = (value?: string) => value ? format(new Date(value), isToday(new Date(value)) ? 'hh:mm a' : 'dd/MM/yy') : '';
const formatSize = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

export default function InboxPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'recent' | 'new'>('all');
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [showPeople, setShowPeople] = useState(true);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [menuFor, setMenuFor] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [msgSearch, setMsgSearch] = useState('');
  const [showChatMenu, setShowChatMenu] = useState(false);
  const call = useCall(me?.id);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentAt = useRef(0);
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ['chat-conversations', search], queryFn: () => messageService.conversations(search), refetchInterval: 1000,
  });
  const visibleConversations = useMemo(() => conversations.filter(conversation => {
    if (filter === 'unread') return conversation.unread_count > 0;
    if (filter === 'recent') return Boolean(conversation.last_message);
    if (filter === 'new') return !conversation.last_message;
    return true;
  }), [conversations, filter]);
  const selectedUserId = activeUserId ?? conversations[0]?.user.id ?? null;
  const { data: thread, isLoading: threadLoading } = useQuery({
    queryKey: ['chat-thread', selectedUserId], queryFn: () => messageService.thread(selectedUserId as number),
    enabled: selectedUserId !== null, refetchInterval: 500,
  });
  const { data: typingStatus } = useQuery({
    queryKey: ['chat-typing', selectedUserId], queryFn: () => messageService.typingStatus(selectedUserId as number),
    enabled: selectedUserId !== null, refetchInterval: 250,
  });

  const threadMessages = useMemo(() => thread?.messages || [], [thread?.messages]);
  const visibleMessages = useMemo(() => {
    const term = msgSearch.trim().toLowerCase();
    return term ? threadMessages.filter(item => (item.body || '').toLowerCase().includes(term)) : threadMessages;
  }, [threadMessages, msgSearch]);
  const groupedMessages = useMemo(() => {
    const groups: { label: string; messages: InboxMessage[] }[] = [];
    visibleMessages.forEach(item => {
      const label = dateLabel(new Date(item.created_at));
      const last = groups[groups.length - 1];
      if (last?.label === label) last.messages.push(item); else groups.push({ label, messages: [item] });
    });
    return groups;
  }, [visibleMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [threadMessages]);

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: ['chat-thread', selectedUserId] }); queryClient.invalidateQueries({ queryKey: ['chat-conversations'] }); };
  const send = useMutation({
    mutationFn: () => messageService.send({ recipient_id: selectedUserId as number, subject: 'Chat message', body: message, file: pendingFile }),
    onMutate: async () => {
      if (!selectedUserId || pendingFile) return undefined;

      const queryKey = ['chat-thread', selectedUserId] as const;
      await queryClient.cancelQueries({ queryKey });
      const previousThread = queryClient.getQueryData<{ user: MessageUser & { role?: string }; messages: InboxMessage[] }>(queryKey);
      const optimisticMessage: InboxMessage = {
        id: -Date.now(), subject: 'Chat message', body: message, is_draft: false, is_read: true, is_starred: false,
        sender: { id: me?.id || 0, name: me?.name || '', email: me?.email || '' }, created_at: new Date().toISOString(),
      };

      queryClient.setQueryData(queryKey, (current: typeof previousThread) => current
        ? { ...current, messages: [...current.messages, optimisticMessage] }
        : current,
      );
      return { previousThread, queryKey };
    },
    onError: (error, _variables, context) => {
      if (context?.previousThread) queryClient.setQueryData(context.queryKey, context.previousThread);
      toast.error(getErrorMessage(error));
    },
    onSuccess: () => { setMessage(''); setPendingFile(null); invalidate(); },
  });
  const remove = useMutation({
    mutationFn: ({ id, scope }: { id: number; scope?: 'everyone' }) => messageService.remove(id, scope),
    onSuccess: () => { setMenuFor(null); invalidate(); },
    onError: error => toast.error(getErrorMessage(error)),
  });
  const clearChat = useMutation({
    mutationFn: async () => { for (const item of threadMessages) { try { await messageService.remove(item.id); } catch { /* skip */ } } },
    onSuccess: () => { setShowChatMenu(false); invalidate(); },
    onError: error => toast.error(getErrorMessage(error)),
  });
  const submit = () => { if ((message.trim() || pendingFile) && selectedUserId && !send.isPending) send.mutate(); };
  const updateMessage = (value: string) => {
    setMessage(value);
    if (!selectedUserId || !value.trim() || Date.now() - lastTypingSentAt.current < 750) return;
    lastTypingSentAt.current = Date.now();
    void messageService.typing(selectedUserId);
  };
  const chooseConversation = (conversation: Conversation) => { setActiveUserId(conversation.user.id); setShowPeople(false); setMenuFor(null); setPendingFile(null); setShowSearch(false); setMsgSearch(''); setShowChatMenu(false); queryClient.invalidateQueries({ queryKey: ['chat-conversations'] }); };
  const onPickFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File is too large (max 10 MB).'); return; }
    setPendingFile(file);
  };

  return <div className="h-full min-h-[650px] bg-[#f0f2f5]">
    <div className="flex h-full min-h-[650px] overflow-hidden border-t-[3px] border-emerald-500 bg-white">
      <aside className={`${showPeople ? 'flex' : 'hidden'} w-full shrink-0 flex-col border-r border-[#e7ecea] sm:flex sm:w-80 xl:w-96`}>
        <header className="border-b border-[#e7ecea] bg-white px-3 py-3">
          <div className="flex items-center gap-3 px-1"><h1 className="text-xl font-bold">Chats</h1></div>
          <label className="relative mt-3 block"><svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f8c87]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search" className="h-9 w-full rounded-lg border border-[#dfe5e2] bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500" /></label>
          <div className="mt-3 flex gap-2 overflow-x-auto">{([['all','All'],['unread','Unread'],['recent','Recent'],['new','New']] as const).map(([key,label]) => <button key={key} onClick={() => setFilter(key)} className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${filter === key ? 'border-[#6ee7b7] bg-emerald-100 text-emerald-700' : 'border-[#dfe5e2] bg-white text-[#6d7874] hover:bg-[#f4f7f6]'}`}>{label}</button>)}</div>
        </header>

        <div className="flex-1 overflow-y-auto">{isLoading ? <div className="p-10 text-center text-sm text-[#84918c]">Loading people…</div> : visibleConversations.map((conversation, index) => <button key={conversation.user.id} onClick={() => chooseConversation(conversation)} className={`flex w-full gap-3 px-3 py-3 text-left transition hover:bg-[#f3f5f4] ${selectedUserId === conversation.user.id ? 'bg-[#f0f2f5]' : ''}`}><Avatar user={conversation.user} index={index}/><span className="min-w-0 flex-1 border-b border-[#edf1ef] pb-3"><span className="flex items-center gap-2"><b className="truncate text-sm text-[#1f2c28]">{conversation.user.name}</b><small className={`ml-auto shrink-0 text-[11px] ${conversation.unread_count ? 'text-emerald-600' : 'text-[#8a9691]'}`}>{timeLabel(conversation.last_message?.created_at)}</small></span><span className="mt-1 flex items-center gap-2"><small className={`truncate ${conversation.unread_count ? 'font-semibold text-[#33463f]' : 'text-[#87938e]'}`}>{conversation.last_message ? <>{conversation.last_message.sent_by_me && <DoubleCheck className="mr-0.5 h-[13px] w-[15px] text-[#53bdeb]"/>}{conversation.last_message.body}</> : <span className="italic">Start a conversation</span>}</small>{conversation.unread_count > 0 && <b className="ml-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-emerald-500 px-1 text-[10px] text-white">{conversation.unread_count}</b>}</span></span></button>)}{!isLoading && !visibleConversations.length && <div className="p-10 text-center text-sm text-[#84918c]">No chats in this filter.</div>}</div>
      </aside>

      <main className={`${showPeople ? 'hidden' : 'flex'} relative min-w-0 flex-1 flex-col bg-[#efeae2] sm:flex`}>
        {selectedUserId && thread ? <>
          <header className="flex h-[64px] shrink-0 items-center gap-3 border-b border-[#d8dedc] bg-[#f0f2f5] px-4">{showSearch ? <><button onClick={() => { setShowSearch(false); setMsgSearch(''); }} title="Close search" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xl text-[#546b63] hover:bg-[#e2e6e4]">←</button><input autoFocus value={msgSearch} onChange={event => setMsgSearch(event.target.value)} placeholder="Search messages…" className="h-9 flex-1 rounded-lg border border-[#dfe5e2] bg-white px-3 text-sm outline-none focus:border-[#34d399]"/><span className="shrink-0 text-xs text-[#7f8c87]">{msgSearch.trim() ? `${visibleMessages.length} found` : ''}</span></> : <><button onClick={() => setShowPeople(true)} className="rounded-full p-2 text-xl hover:bg-[#e2e6e4] sm:hidden">←</button><Avatar user={thread.user}/><div className="min-w-0"><b className="block truncate text-sm">{thread.user.name}</b>{typingStatus?.typing ? <TypingIndicator user={thread.user}/> : <small className="block truncate capitalize text-[#7f8c87]">{thread.user.role || 'Team member'}</small>}</div><div className="ml-auto flex items-center gap-1"><button onClick={() => call.start(thread.user, 'video')} title="Video call" className="grid h-9 w-9 place-items-center rounded-full text-[#546b63] hover:bg-[#e2e6e4]"><VideoIcon/></button><button onClick={() => call.start(thread.user, 'voice')} title="Voice call" className="grid h-9 w-9 place-items-center rounded-full text-[#546b63] hover:bg-[#e2e6e4]"><PhoneIcon/></button><button onClick={() => { setShowSearch(true); setShowChatMenu(false); }} title="Search" className="grid h-9 w-9 place-items-center rounded-full text-[#546b63] hover:bg-[#e2e6e4]"><SearchIcon/></button><div className="relative"><button onClick={() => setShowChatMenu(v => !v)} title="Chat options" className="grid h-9 w-9 place-items-center rounded-full text-[#546b63] hover:bg-[#e2e6e4]"><MenuIcon/></button>{showChatMenu && <><div className="fixed inset-0 z-10" onClick={() => setShowChatMenu(false)}/><div className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-lg border border-[#e2e6e4] bg-white py-1 text-left text-[13px] shadow-lg"><button onClick={() => { setShowSearch(true); setShowChatMenu(false); }} className="block w-full px-4 py-2 text-left text-[#33463f] hover:bg-[#f3f5f4]">Search messages</button><button onClick={() => { setShowChatMenu(false); if (window.confirm(`Clear all messages with ${thread.user.name}? This only removes them for you.`)) clearChat.mutate(); }} disabled={clearChat.isPending || !threadMessages.length} className="block w-full px-4 py-2 text-left text-[#c0392b] hover:bg-[#fdecea] disabled:opacity-50">Clear chat</button></div></>}</div></div></>}</header>
          <div className="flex-1 overflow-y-auto bg-[#f8fafc] bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] p-4 sm:px-7">{threadLoading ? <p className="text-center text-sm text-[#7f8c87]">Loading chat…</p> : groupedMessages.map(group => <div key={group.label}><div className="my-5 flex justify-center"><span className="rounded-full border border-slate-200 bg-white/90 px-3.5 py-1 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur-sm">{group.label}</span></div>{group.messages.map(item => { const mine = item.sender.id === me?.id; const att = item.attachment; return <div key={item.id} className={`group mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`relative max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[72%] ${mine ? 'rounded-tr-none bg-emerald-600 text-white' : 'rounded-tl-none border border-slate-200 bg-white text-slate-800'}`}>{item.is_deleted ? <p className={`flex items-center gap-1.5 py-0.5 pr-12 text-[13px] italic leading-5 ${mine ? 'text-emerald-100' : 'text-[#8996a0]'}`}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/></svg>This message was deleted</p> : <>{att && (att.is_image ? <a href={att.url} target="_blank" rel="noreferrer" className="mb-1 block"><img src={att.url} alt={att.name} className="max-h-72 max-w-[240px] rounded-lg object-cover shadow-sm"/></a> : <a href={att.url} target="_blank" rel="noreferrer" download={att.name} className={`mb-1 flex items-center gap-2 rounded-lg px-2.5 py-2 ${mine ? 'bg-emerald-700/50 text-white' : 'bg-slate-100 text-slate-800'}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500 text-white"><FileIcon/></span><span className="min-w-0"><b className="block max-w-[150px] truncate text-[12px]">{att.name}</b><small className="text-[10px] opacity-80">{formatSize(att.size)}</small></span></a>)}{item.body && <p className={`whitespace-pre-wrap break-words px-0.5 text-[13px] leading-5 ${mine ? 'text-white' : 'text-slate-800'}`}>{item.body}</p>}</>}<span className={`float-right ml-6 inline-flex items-center gap-1 text-[9px] ${mine ? 'text-emerald-100' : 'text-slate-400'}`}>{format(new Date(item.created_at), 'hh:mm a')}{mine && !item.is_deleted && <DoubleCheck className="ml-0.5 h-[13px] w-[15px] text-emerald-200"/>}</span>{!item.is_deleted && <button onClick={() => setMenuFor(menuFor === item.id ? null : item.id)} title="Message options" className={`absolute right-1 top-1 z-10 h-6 w-6 place-items-center rounded-full text-slate-500 shadow-sm backdrop-blur-sm ${att?.is_image ? 'bg-white/85' : mine ? 'bg-emerald-700/80 text-white' : 'bg-slate-100'} ${menuFor === item.id ? 'grid' : 'hidden group-hover:grid'}`}><ChevronDown/></button>}{menuFor === item.id && <><div className="fixed inset-0 z-0" onClick={() => setMenuFor(null)}/><div className={`absolute top-0 z-20 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left text-[13px] shadow-xl ${mine ? 'right-full mr-2' : 'left-full ml-2'}`}>{att && <a href={att.url} download={att.name} onClick={() => setMenuFor(null)} className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50">Download</a>}<button onClick={() => remove.mutate({ id: item.id })} disabled={remove.isPending} className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50">Delete for me</button>{mine && <button onClick={() => remove.mutate({ id: item.id, scope: 'everyone' })} disabled={remove.isPending} className="block w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50">Delete for everyone</button>}<button onClick={() => setMenuFor(null)} className="block w-full px-3 py-2 text-left text-slate-400 hover:bg-slate-50">Cancel</button></div></>}</div></div>; })}</div>)}{!threadLoading && !thread.messages.length && <div className="grid h-full place-items-center text-center py-12"><div className="rounded-2xl border border-emerald-100 bg-white/90 p-6 shadow-sm backdrop-blur-md max-w-sm"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg></div><h3 className="text-sm font-semibold text-slate-900">Start the conversation</h3><p className="mt-1 text-xs text-slate-500">Send a message below to connect with {thread.user.name}</p></div></div>}<div ref={bottomRef}/></div>
          <footer className="shrink-0 bg-[#f0f2f5] px-3 py-2">{pendingFile && <div className="mb-2 flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">{pendingFile.type.startsWith('image/') ? <img src={URL.createObjectURL(pendingFile)} alt="" className="h-11 w-11 rounded object-cover"/> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded bg-emerald-100 text-emerald-700"><FileIcon/></span>}<span className="min-w-0 flex-1"><b className="block truncate text-[13px] text-[#24342e]">{pendingFile.name}</b><small className="text-[11px] text-[#74817c]">{formatSize(pendingFile.size)}</small></span><button onClick={() => setPendingFile(null)} title="Remove" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg text-[#87938e] hover:bg-[#f0f2f5]">✕</button></div>}<div className="flex items-center gap-2"><input ref={fileInputRef} type="file" onChange={onPickFile} className="hidden"/><button onClick={() => fileInputRef.current?.click()} title="Attach" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#61716b] hover:bg-[#e2e6e4]"><ClipIcon/></button><textarea value={message} onChange={event => updateMessage(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } }} placeholder="Type a message" rows={1} className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border-0 bg-white px-4 py-2.5 text-sm outline-none"/><button onClick={submit} disabled={(!message.trim() && !pendingFile) || send.isPending} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500 text-base text-white transition  disabled:bg-[#aab7b2]">➤</button></div></footer>
        </> : <div className="grid flex-1 place-items-center bg-[#f7faf9] p-8 text-center"><div><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-emerald-100 text-5xl">💬</div><h2 className="mt-6 text-2xl font-bold">Workplace Chat</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[#7f8c87]">Select any employee from the list and start a private conversation.</p><button onClick={() => setShowPeople(true)} className="mt-5 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white sm:hidden">Choose employee</button></div></div>}
      </main>
    </div>
    {call.state.status !== 'idle' && <CallScreen call={call} />}
  </div>;
}
