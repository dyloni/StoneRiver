import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { ChatMessage, Agent, Admin } from '../types';
import Card from '../components/ui/Card';
import ChatInterface from '../components/chat/ChatInterface';
import { messagingService } from '../services/messagingService';
import { supabase } from '../utils/supabase';

type ChatPartner = Pick<Agent, 'id' | 'firstName' | 'surname'> | { id: 'admin', firstName: string, surname: string };

const MessagesPage: React.FC = () => {
    const { user } = useAuth();
    const { state, dispatch } = useData();
    const location = useLocation();

    const [activeChatPartnerId, setActiveChatPartnerId] = useState<number | 'admin' | null>(null);
    const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = React.useRef<NodeJS.Timeout>();

    const currentUserId = user?.type === 'agent' ? user.id : 'admin';

    useEffect(() => {
        if (user?.type === 'agent') {
            setActiveChatPartnerId('admin');
        } else if (location.state?.agentId) {
            setActiveChatPartnerId(location.state.agentId);
        }
    }, [user, location.state]);

    useEffect(() => {
        if (!currentUserId) return;

        const parseId = (id: string): number | 'admin' | 'broadcast' => {
            if (id === 'admin' || id === 'broadcast') return id;
            const parsed = parseInt(id, 10);
            return isNaN(parsed) ? id as any : parsed;
        };

        const channel = supabase
            .channel('messages-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `recipient_id=eq.${currentUserId}`,
                },
                (payload) => {
                    const newMessage: ChatMessage = {
                        id: payload.new.id,
                        senderId: parseId(payload.new.sender_id),
                        senderName: payload.new.sender_name,
                        recipientId: parseId(payload.new.recipient_id),
                        text: payload.new.text,
                        timestamp: payload.new.timestamp,
                        status: payload.new.status,
                    };
                    dispatch({ type: 'SEND_MESSAGE', payload: newMessage });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                },
                (payload) => {
                    const updatedMessage: ChatMessage = {
                        id: payload.new.id,
                        senderId: parseId(payload.new.sender_id),
                        senderName: payload.new.sender_name,
                        recipientId: parseId(payload.new.recipient_id),
                        text: payload.new.text,
                        timestamp: payload.new.timestamp,
                        status: payload.new.status,
                    };
                    dispatch({
                        type: 'UPDATE_DATA',
                        payload: {
                            customers: state.customers,
                            requests: state.requests,
                            messages: state.messages.map(m => m.id === updatedMessage.id ? updatedMessage : m),
                            payments: state.payments,
                        },
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUserId, dispatch, state.customers, state.requests, state.payments]);

    useEffect(() => {
        if (activeChatPartnerId && currentUserId) {
            const conversationId = [currentUserId, activeChatPartnerId].sort().join('-');

            messagingService.subscribeToTypingIndicators(
                conversationId,
                (userId, typing) => {
                    if (String(userId) !== String(currentUserId)) {
                        setTypingUsers(prev => {
                            const next = new Set(prev);
                            if (typing) {
                                next.add(userId);
                            } else {
                                next.delete(userId);
                            }
                            return next;
                        });
                    }
                }
            );

            return () => {
                messagingService.unsubscribeFromTyping();
            };
        }
    }, [activeChatPartnerId, currentUserId]);

    useEffect(() => {
        if (activeChatPartnerId && currentUserId) {
            const hasUnread = state.messages.some(m => m.senderId === activeChatPartnerId && m.recipientId === currentUserId && m.status === 'unread');
            if (hasUnread) {
                messagingService.markConversationAsRead(String(activeChatPartnerId), String(currentUserId));
                dispatch({ type: 'MARK_MESSAGES_AS_READ', payload: { chatPartnerId: activeChatPartnerId, currentUserId } });
            }
        }
    }, [activeChatPartnerId, currentUserId, state.messages, dispatch]);

    const handleSendMessage = async (text: string) => {
        if (!user || !activeChatPartnerId) return;

        const recipientId = typeof activeChatPartnerId === 'number' ? activeChatPartnerId : activeChatPartnerId;
        const senderId = user.type === 'agent' ? user.id : user.id;

        const newMessage: ChatMessage = {
            id: 0,
            senderId: senderId,
            senderName: `${user.firstName} ${user.surname}`,
            recipientId: recipientId,
            text: text,
            timestamp: new Date().toISOString(),
            status: 'unread',
        };

        try {
            await messagingService.sendMessage(newMessage);

            if (isTyping) {
                const conversationId = [currentUserId, activeChatPartnerId].sort().join('-');
                await messagingService.setTypingIndicator(String(currentUserId), conversationId, false);
                setIsTyping(false);
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const handleTyping = useCallback(() => {
        if (!activeChatPartnerId || !currentUserId) return;

        const conversationId = [currentUserId, activeChatPartnerId].sort().join('-');

        if (!isTyping) {
            setIsTyping(true);
            messagingService.setTypingIndicator(String(currentUserId), conversationId, true);
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            messagingService.setTypingIndicator(String(currentUserId), conversationId, false);
        }, 3000);
    }, [activeChatPartnerId, currentUserId, isTyping]);

    const getConversationList = (): ChatPartner[] => {
        const agentUsers: ChatPartner[] = state.agents.map(agent => ({
            id: agent.id,
            firstName: agent.firstName,
            surname: agent.surname,
        }));

        const adminUsers: ChatPartner[] = state.admins.map(admin => ({
            id: admin.id,
            firstName: admin.firstName,
            surname: admin.surname,
        }));

        if (user?.type === 'agent') {
            const otherAgents = agentUsers.filter(a => a.id !== user.id);
            return [...adminUsers, ...otherAgents];
        }

        const otherAdmins = adminUsers.filter(a => a.id !== user?.id);
        return [...agentUsers, ...otherAdmins];
    };

    const conversationList = getConversationList();
    
    const activeConversationMessages = useMemo(() => {
        if (!activeChatPartnerId || !currentUserId) return [];
        return state.messages.filter(m =>
            (m.senderId === currentUserId && m.recipientId === activeChatPartnerId) ||
            (m.senderId === activeChatPartnerId && m.recipientId === currentUserId) ||
            (m.recipientId === 'broadcast' && user?.type === 'agent') // Agents see broadcasts
        ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [state.messages, currentUserId, activeChatPartnerId, user]);
    
    const activeChatPartner = conversationList.find(p => p.id === activeChatPartnerId);
    const activeChatPartnerName = activeChatPartner ? `${activeChatPartner.firstName} ${activeChatPartner.surname}`.trim() : 'Select a conversation';
    const isPartnerTyping = typingUsers.size > 0;

    return (
        <div>
            <h2 className="text-3xl font-extrabold text-brand-text-primary mb-6 md:block hidden">Messages</h2>
            <Card className="p-0 sm:p-0">
                <div className="flex h-[75vh] md:h-[75vh] h-[calc(100vh-8rem)] rounded-xl overflow-hidden">
                    <div className={`w-full md:w-1/3 border-r border-brand-border bg-brand-surface overflow-y-auto ${activeChatPartnerId && 'hidden md:block'}`}>
                        <div className="md:hidden p-4 border-b border-brand-border bg-brand-surface">
                            <h2 className="text-2xl font-extrabold text-brand-text-primary">Messages</h2>
                        </div>
                        {conversationList.map(partner => {
                            const partnerName = `${partner.firstName} ${partner.surname}`.trim();
                            const lastMessage = [...state.messages]
                                .filter(m => (m.senderId === partner.id && m.recipientId === currentUserId) || (m.senderId === currentUserId && m.recipientId === partner.id))
                                .pop();
                            const unreadCount = state.messages.filter(m => m.senderId === partner.id && m.recipientId === currentUserId && m.status === 'unread').length;
                            const partnerIsTyping = typingUsers.has(String(partner.id));

                            return (
                                <div
                                    key={partner.id}
                                    onClick={() => setActiveChatPartnerId(partner.id)}
                                    className={`p-4 cursor-pointer border-l-4 transition-colors ${activeChatPartnerId === partner.id ? 'bg-brand-pink/10 border-brand-pink' : 'border-transparent hover:bg-gray-100'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-lg">{partnerName}</p>
                                            {partnerIsTyping && activeChatPartnerId !== partner.id && (
                                                <span className="text-xs text-green-600 font-medium">typing...</span>
                                            )}
                                        </div>
                                        {unreadCount > 0 && <span className="text-xs font-bold bg-red-500 text-white rounded-full px-2 py-1">{unreadCount}</span>}
                                    </div>
                                    <p className="text-sm text-brand-text-secondary truncate">
                                        {partnerIsTyping && activeChatPartnerId === partner.id ? (
                                            <span className="text-green-600 italic">typing...</span>
                                        ) : (
                                            lastMessage?.text || 'No messages yet'
                                        )}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    <div className={`w-full md:w-2/3 flex-col ${activeChatPartnerId ? 'flex' : 'hidden md:flex'}`}>
                        {activeChatPartner ? (
                           <>
                                <div className="md:hidden flex items-center p-4 border-b border-brand-border bg-brand-surface">
                                    <button
                                        onClick={() => setActiveChatPartnerId(null)}
                                        className="mr-3 text-brand-text-secondary hover:text-brand-text-primary"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-brand-text-primary">{activeChatPartnerName}</h3>
                                        {isPartnerTyping && (
                                            <p className="text-sm text-green-600 italic animate-pulse">typing...</p>
                                        )}
                                    </div>
                                </div>
                                <ChatInterface
                                    chatPartnerName={activeChatPartnerName}
                                    messages={activeConversationMessages}
                                    currentUserId={currentUserId}
                                    onSendMessage={handleSendMessage}
                                    onTyping={handleTyping}
                                    isPartnerTyping={isPartnerTyping}
                                    showHeader={false}
                                />
                           </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-brand-text-secondary">
                                <p>Select a conversation to start messaging.</p>
                            </div>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default MessagesPage;