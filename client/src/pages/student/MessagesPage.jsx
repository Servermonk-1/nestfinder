import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, MessageCircle, ArrowLeft, Home } from 'lucide-react';
import StudentNavbar from '../../components/common/StudentNavbar';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { connectSocket } from '../../services/socket';
import { getImageUrl } from '../../utils/urlHelper';
import api from '../../services/api';
import ChatSafetyMenu, { VerifiedPill, SafetyTipsBanner, RedFlagWarning } from '../../components/chat/ChatSafety';
import { detectRedFlags } from '../../utils/safetyChecks';

function timeAgo(date) {
	const diff = Date.now() - new Date(date).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return 'now';
	if (mins < 60) return `${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h`;
	return `${Math.floor(hours / 24)}d`;
}

export default function MessagesPage() {
	const { user, isAuthenticated } = useAuth();
	const { refreshUnread } = useNotifications();
	const [searchParams, setSearchParams] = useSearchParams();
	const [conversations, setConversations] = useState([]);
	const [loadingList, setLoadingList] = useState(true);
	const [activeId, setActiveId] = useState(searchParams.get('conversation') || null);
	const [messages, setMessages] = useState([]);
	const [loadingThread, setLoadingThread] = useState(false);
	const [draft, setDraft] = useState('');
	const [sending, setSending] = useState(false);
	const bottomRef = useRef(null);

	const loadConversations = () => {
		setLoadingList(true);
		api.get('/messages/conversations')
			.then(({ data }) => setConversations(data.conversations))
			.catch(() => setConversations([]))
			.finally(() => setLoadingList(false));
	};

	useEffect(() => {
		loadConversations();
	}, []);

	useEffect(() => {
		if (!isAuthenticated) return;
		const socket = connectSocket();
		const handleNewMessage = ({ conversationId, message }) => {
			if (conversationId === activeId) {
				setMessages((prev) => [...prev, message]);
			}
			loadConversations();
		};
		socket.on('message:new', handleNewMessage);
		return () => socket.off('message:new', handleNewMessage);
	}, [isAuthenticated, activeId]);

	useEffect(() => {
		if (!activeId) return;
		setLoadingThread(true);
		api.get(`/messages/conversations/${activeId}/messages`)
			.then(({ data }) => {
				setMessages(data.messages);
				// Opening a conversation marks it read on the server — sync the badge.
				refreshUnread();
			})
			.catch(() => setMessages([]))
			.finally(() => setLoadingThread(false));
		setSearchParams({ conversation: activeId });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [activeId]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const activeConversation = conversations.find((c) => c._id === activeId);
	const isBlocked = Boolean(activeConversation?.blocked);

	// Reflect a block/unblock immediately without a full refetch.
	const applySafetyChange = ({ blocked, blockedByMe }) =>
		setConversations((prev) => prev.map((c) => (c._id === activeId ? { ...c, blocked, blockedByMe } : c)));

	const handleSend = async (e) => {
		e.preventDefault();
		const text = draft.trim();
		if (!text || !activeId || sending) return;
		setSending(true);
		setDraft('');
		try {
			const { data } = await api.post(`/messages/conversations/${activeId}/messages`, { text });
			setMessages((prev) => [...prev, data.message]);
			loadConversations();
		} catch {
			setDraft(text);
		} finally {
			setSending(false);
		}
	};

	return (
		<div className="min-h-screen bg-paper text-text">
			<StudentNavbar />

			<div className="mx-auto max-w-7xl px-4 pb-6 pt-24 md:px-8">
				<motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 font-serif text-2xl font-extrabold text-text md:text-3xl">
					Messages
				</motion.h1>

				<div className="grid overflow-hidden rounded-2xl border border-line bg-surface shadow-card md:grid-cols-[320px_1fr]" style={{ minHeight: '65vh' }}>
					{/* Conversation list */}
					<div className={`border-r border-line ${activeId ? 'hidden md:block' : 'block'}`}>
						{loadingList ? (
							<div className="p-6 text-sm text-muted">Loading conversations…</div>
						) : conversations.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center p-8 text-center">
								<MessageCircle className="h-8 w-8 text-muted" />
								<p className="mt-4 text-sm font-bold text-text">No conversations yet</p>
								<p className="mt-1 text-xs text-muted">Message a landlord from a listing to start chatting.</p>
							</div>
						) : (
							<div className="divide-y divide-line">
								{conversations.map((c) => (
									<button
										key={c._id}
										onClick={() => setActiveId(c._id)}
										className={`flex w-full items-start gap-3 p-4 text-left transition ${activeId === c._id ? 'bg-primary/10' : 'hover:bg-surface-alt'}`}
									>
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
											{c.landlord?.fullName?.charAt(0).toUpperCase() || '?'}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center justify-between gap-2">
												<p className="truncate text-sm font-bold text-text">{c.landlord?.fullName || 'Landlord'}</p>
												<span className="shrink-0 text-[13px] text-muted">{timeAgo(c.lastMessageAt)}</span>
											</div>
											{c.listing?.title && <p className="truncate text-[13px] text-primary-ink">{c.listing.title}</p>}
											<p className="mt-0.5 truncate text-xs text-muted">{c.lastMessage || 'No messages yet'}</p>
										</div>
										{c.unreadCount > 0 && (
											<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-[12px] font-bold text-white">
												{c.unreadCount}
											</span>
										)}
									</button>
								))}
							</div>
						)}
					</div>

					{/* Thread */}
					<div className={`flex flex-col ${activeId ? 'flex' : 'hidden md:flex'}`}>
						{!activeConversation ? (
							<div className="flex h-full flex-col items-center justify-center p-8 text-center">
								<MessageCircle className="h-10 w-10 text-muted" />
								<p className="mt-4 text-sm text-muted">Select a conversation to start chatting</p>
							</div>
						) : (
							<>
								<div className="flex items-center gap-3 border-b border-line p-4">
									<button onClick={() => setActiveId(null)} aria-label="Back to conversations" className="text-muted hover:text-text md:hidden">
										<ArrowLeft className="h-5 w-5" />
									</button>
									<div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">
										{activeConversation.landlord?.fullName?.charAt(0).toUpperCase() || '?'}
									</div>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-1.5">
											<p className="truncate text-sm font-bold text-text">{activeConversation.landlord?.fullName || 'Landlord'}</p>
											<VerifiedPill verified={activeConversation.landlord?.verified} />
										</div>
										{activeConversation.listing?.title && <p className="truncate text-xs text-primary-ink">{activeConversation.listing.title}</p>}
									</div>
									{activeConversation.listing?.images?.[0] && (
										<div className="hidden h-10 w-10 shrink-0 overflow-hidden rounded-lg sm:block">
											<img src={getImageUrl(activeConversation.listing.images[0])} alt="" className="h-full w-full object-cover" />
										</div>
									)}
									<ChatSafetyMenu
										conversationId={activeConversation._id}
										blocked={isBlocked}
										blockedByMe={activeConversation.blockedByMe}
										onChange={applySafetyChange}
									/>
								</div>

								<SafetyTipsBanner />

								<div className="flex-1 space-y-3 overflow-y-auto bg-paper/40 p-4">
									{loadingThread ? (
										<p className="text-sm text-muted">Loading messages…</p>
									) : messages.length === 0 ? (
										<div className="flex h-full flex-col items-center justify-center text-center">
											<Home className="h-8 w-8 text-muted" />
											<p className="mt-3 text-sm text-muted">Say hello and ask about the listing!</p>
										</div>
									) : (
										messages.map((m) => {
											const isMine = m.senderRole === user?.role;
											// Only warn about what the OTHER party sent.
											const flags = isMine ? [] : detectRedFlags(m.text);
											return (
												<motion.div key={m._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
													{/* break-words, because a pasted listing URL is one
													    unbreakable token and would otherwise widen the
													    whole thread past the phone's viewport. */}
													<div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm sm:max-w-[75%] ${isMine ? 'rounded-br-md bg-brand-gradient text-white' : 'rounded-bl-md border border-line bg-surface text-text'}`}>
														{m.text}
														<div className={`mt-1 text-[12px] ${isMine ? 'text-white/70' : 'text-muted'}`}>{timeAgo(m.createdAt)}</div>
													</div>
													<RedFlagWarning warnings={flags} />
												</motion.div>
											);
										})
									)}
									<div ref={bottomRef} />
								</div>

								{isBlocked ? (
									<div className="border-t border-line bg-surface-alt/60 p-4 text-center">
										<p className="text-sm font-semibold text-text">
											{activeConversation.blockedByMe ? 'You blocked this conversation.' : 'This conversation is closed.'}
										</p>
										<p className="mt-1 text-xs text-muted">
											{activeConversation.blockedByMe
												? 'Unblock from the shield menu to start messaging again.'
												: 'Neither of you can send messages here.'}
										</p>
									</div>
								) : (
								<form onSubmit={handleSend} className="flex items-center gap-2 border-t border-line p-4">
									<input
										type="text"
										value={draft}
										onChange={(e) => setDraft(e.target.value)}
										placeholder="Type a message…"
										className="flex-1 rounded-xl border border-line bg-surface-alt px-4 py-2.5 text-sm text-text outline-none focus:border-primary/50 focus:bg-white"
									/>
									<button
										type="submit"
										aria-label="Send message"
										disabled={!draft.trim() || sending}
										className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow-sm transition hover:shadow-glow disabled:opacity-40"
									>
										<Send className="h-4 w-4" />
									</button>
								</form>
								)}
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
