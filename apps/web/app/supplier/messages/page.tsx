'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Send,
  Search,
  Building2,
  Mail,
  Clock
} from 'lucide-react';
import {
  getMessages,
  createMessage,
  markMessageAsRead,
  Message
} from '@/lib/mockDataStore';

const CURRENT_SUPPLIER_ID = 'SUP-001';
const CURRENT_SUPPLIER_NAME = 'Precision Parts Co';

export default function SupplierMessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({
    subject: '',
    message: '',
    orderId: ''
  });

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = () => {
    const allMessages = getMessages();
    // Filter messages where supplier is sender or recipient
    const supplierMessages = allMessages.filter(m => 
      (m.sender_id === CURRENT_SUPPLIER_ID && m.sender_role === 'supplier') ||
      (m.recipient_id === CURRENT_SUPPLIER_ID && m.recipient_role === 'supplier')
    );
    setMessages(supplierMessages);
  };

  // Group messages by thread
  const threads = messages.reduce((acc, msg) => {
    if (!acc[msg.thread_id]) {
      acc[msg.thread_id] = [];
    }
    acc[msg.thread_id].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  // Get thread list with latest message
  const threadList = Object.entries(threads).map(([threadId, msgs]) => {
    const sortedMsgs = [...msgs].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const latestMsg = sortedMsgs[0];
    const unreadCount = msgs.filter(m => !m.read && m.recipient_id === CURRENT_SUPPLIER_ID).length;
    
    return {
      threadId,
      messages: sortedMsgs,
      latestMessage: latestMsg,
      unreadCount
    };
  }).filter(thread => {
    const matchesSearch = thread.latestMessage.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thread.latestMessage.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => 
    new Date(b.latestMessage.created_at).getTime() - new Date(a.latestMessage.created_at).getTime()
  );

  const selectedThreadData = selectedThread ? threads[selectedThread] : null;

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedThread) return;

    const threadMessages = threads[selectedThread];
    const firstMessage = threadMessages[0];
    
    const msg = createMessage({
      thread_id: selectedThread,
      sender_id: CURRENT_SUPPLIER_ID,
      sender_name: CURRENT_SUPPLIER_NAME,
      sender_role: 'supplier',
      recipient_id: 'ADMIN-001',
      recipient_name: 'Admin Team',
      recipient_role: 'admin',
      subject: firstMessage.subject,
      message: newMessage,
      read: false,
      order_id: firstMessage.order_id
    });

    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const handleComposeMessage = () => {
    if (!composeForm.subject || !composeForm.message) {
      alert('Please fill in subject and message');
      return;
    }

    const threadId = `THREAD-${Date.now()}`;
    const msg = createMessage({
      thread_id: threadId,
      sender_id: CURRENT_SUPPLIER_ID,
      sender_name: CURRENT_SUPPLIER_NAME,
      sender_role: 'supplier',
      recipient_id: 'ADMIN-001',
      recipient_name: 'Admin Team',
      recipient_role: 'admin',
      subject: composeForm.subject,
      message: composeForm.message,
      read: false,
      order_id: composeForm.orderId || undefined
    });

    setMessages([...messages, msg]);
    setShowCompose(false);
    setComposeForm({ subject: '', message: '', orderId: '' });
    setSelectedThread(threadId);
  };

  const handleThreadClick = (threadId: string) => {
    setSelectedThread(threadId);
    // Mark messages as read
    threads[threadId].forEach(msg => {
      if (!msg.read && msg.recipient_id === CURRENT_SUPPLIER_ID) {
        markMessageAsRead(msg.id);
      }
    });
    loadMessages();
  };

  const unreadCount = messages.filter(m => !m.read && m.recipient_id === CURRENT_SUPPLIER_ID).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Communicate with admin team</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white px-3 py-1">
              {unreadCount} Unread
            </Badge>
          )}
          <Button onClick={() => setShowCompose(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Send className="w-4 h-4 mr-2" />
            New Message
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Thread List */}
        <Card className="lg:col-span-1 bg-white border-gray-200 shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-gray-300"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[600px]">
            {threadList.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No messages</p>
              </div>
            ) : (
              threadList.map((thread) => (
                <div
                  key={thread.threadId}
                  onClick={() => handleThreadClick(thread.threadId)}
                  className={`p-4 border-b border-gray-200 cursor-pointer transition-colors ${
                    selectedThread === thread.threadId ? 'bg-emerald-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-600" />
                      {thread.unreadCount > 0 && (
                        <Badge className="bg-red-500 text-white px-2 py-0.5 text-xs">
                          {thread.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <Clock className="w-3 h-3 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium mb-1 truncate">{thread.latestMessage.subject}</p>
                  <p className="text-xs text-gray-500 truncate">{thread.latestMessage.message}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(thread.latestMessage.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Message View */}
        <Card className="lg:col-span-2 bg-white border-gray-200 shadow-sm">
          {selectedThreadData ? (
            <>
              {/* Thread Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{selectedThreadData[0].subject}</h2>
                  {selectedThreadData[0].order_id && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 border">
                      Order: {selectedThreadData[0].order_id}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[400px]">
                {selectedThreadData.map((msg) => {
                  const isSupplier = msg.sender_role === 'supplier';
                  return (
                    <div key={msg.id} className={`flex ${isSupplier ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] ${isSupplier ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-900'} rounded-lg p-4`}>
                        <div className="flex items-center gap-2 mb-2">
                          {isSupplier ? <Building2 className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                          <span className="font-semibold text-sm">{msg.sender_name}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                        <p className={`text-xs mt-2 ${isSupplier ? 'text-emerald-100' : 'text-gray-500'}`}>
                          {new Date(msg.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reply Box */}
              <div className="p-6 border-t border-gray-200">
                <div className="flex gap-3">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 bg-white border-gray-300"
                    rows={3}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-gray-500">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No conversation selected</p>
              <p className="text-sm">Choose a thread or start a new message</p>
            </div>
          )}
        </Card>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="bg-white max-w-2xl w-full">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-900">New Message to Admin</h2>
                <Button variant="ghost" onClick={() => setShowCompose(false)}>✕</Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Order ID (Optional)</label>
                  <Input
                    value={composeForm.orderId}
                    onChange={(e) => setComposeForm({ ...composeForm, orderId: e.target.value })}
                    placeholder="e.g., ORD-2024-001"
                    className="bg-white border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Subject *</label>
                  <Input
                    value={composeForm.subject}
                    onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                    placeholder="Message subject"
                    className="bg-white border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">Message *</label>
                  <Textarea
                    value={composeForm.message}
                    onChange={(e) => setComposeForm({ ...composeForm, message: e.target.value })}
                    placeholder="Type your message..."
                    className="bg-white border-gray-300"
                    rows={6}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleComposeMessage} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
                <Button onClick={() => setShowCompose(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
