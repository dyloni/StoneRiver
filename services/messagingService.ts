import { supabase } from '../utils/supabase';
import { ChatMessage } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
  updatedAt: string;
}

export class MessagingService {
  private typingChannel: RealtimeChannel | null = null;

  async sendMessage(message: ChatMessage): Promise<void> {
    const dbMessage = {
      sender_id: String(message.senderId),
      sender_name: message.senderName,
      recipient_id: String(message.recipientId),
      text: message.text,
      timestamp: message.timestamp,
      status: 'unread',
      is_delivered: true,
      is_read: false,
      delivered_at: new Date().toISOString(),
    };

    console.log('MessagingService: Inserting message into database', dbMessage);

    const { data, error } = await supabase
      .from('messages')
      .insert(dbMessage)
      .select();

    if (error) {
      console.error('MessagingService: Error sending message:', error);
      console.error('MessagingService: Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('MessagingService: Message inserted successfully', data);
  }

  async markAsRead(messageIds: number[], userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        status: 'read',
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .in('id', messageIds)
      .eq('recipient_id', String(userId));

    if (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  async markConversationAsRead(senderId: string, recipientId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        status: 'read',
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('sender_id', String(senderId))
      .eq('recipient_id', String(recipientId))
      .eq('status', 'unread');

    if (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }
  }

  async setTypingIndicator(userId: string, conversationId: string, isTyping: boolean): Promise<void> {
    const { error } = await supabase
      .from('typing_indicators')
      .upsert({
        user_id: String(userId),
        conversation_id: conversationId,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,conversation_id'
      });

    if (error) {
      console.error('Error setting typing indicator:', error);
    }
  }

  subscribeToTypingIndicators(
    conversationId: string,
    onTypingChange: (userId: string, isTyping: boolean) => void
  ): void {
    this.typingChannel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const data = payload.new as any;
          if (data) {
            onTypingChange(data.user_id, data.is_typing);
          }
        }
      )
      .subscribe();
  }

  unsubscribeFromTyping(): void {
    if (this.typingChannel) {
      supabase.removeChannel(this.typingChannel);
      this.typingChannel = null;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', String(userId))
      .eq('status', 'unread');

    if (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }

    return count || 0;
  }

  async getConversations(userId: string): Promise<Array<{ partnerId: string; partnerName: string; lastMessage: string; unreadCount: number; timestamp: string }>> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting conversations:', error);
      return [];
    }

    const conversationMap = new Map<string, any>();

    messages?.forEach((msg: any) => {
      const partnerId = msg.sender_id === String(userId) ? msg.recipient_id : msg.sender_id;
      const isFromMe = msg.sender_id === String(userId);

      let partnerName = 'Unknown';
      if (isFromMe) {
        partnerName = partnerId === 'admin' ? 'Admin' : `Agent ${partnerId}`;
      } else {
        partnerName = msg.sender_name || (msg.sender_id === 'admin' ? 'Admin' : `Agent ${msg.sender_id}`);
      }

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          partnerName,
          lastMessage: msg.text,
          timestamp: msg.timestamp,
          unreadCount: 0,
        });
      }

      if (msg.recipient_id === String(userId) && msg.status === 'unread') {
        const conv = conversationMap.get(partnerId);
        if (conv) {
          conv.unreadCount++;
        }
      }
    });

    return Array.from(conversationMap.values());
  }

  async getMessagesBetweenUsers(user1Id: string, user2Id: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user1Id},recipient_id.eq.${user2Id}),and(sender_id.eq.${user2Id},recipient_id.eq.${user1Id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting messages:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      senderId: this.parseUserId(row.sender_id),
      senderName: row.sender_name,
      recipientId: this.parseUserId(row.recipient_id),
      text: row.text,
      timestamp: row.timestamp,
      status: row.status,
    }));
  }

  private parseUserId(id: string): number | 'admin' | 'broadcast' {
    if (id === 'admin' || id === 'broadcast') return id;
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? id as any : parsed;
  }
}

export const messagingService = new MessagingService();
