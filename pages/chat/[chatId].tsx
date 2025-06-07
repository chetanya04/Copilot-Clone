// pages/chat/[chatId].tsx
import { useRouter } from 'next/router';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/src/lib/trpc/client';

export default function ChatPage() {
  const router = useRouter();
  const { user, isLoading } = useUser();
  const { chatId } = router.query;
  const [message, setMessage] = useState('');
  const [isImageMode, setIsImageMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TRPC queries and mutations
  const { data: messages, refetch: refetchMessages } = api.chat.getMessages.useQuery(
    { chatId: chatId as string },
    { enabled: !!chatId && !!user }
  );

  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: () => {
      refetchMessages();
      setMessage('');
    },
  });

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !chatId) return;

    try {
      await sendMessageMutation.mutateAsync({
        chatId: chatId as string,
        content: message,
        isImageRequest: isImageMode,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="vh-100 d-flex flex-column bg-light">
      {/* Header */}
      <div className="bg-primary text-white p-3">
        <div className="d-flex align-items-center">
          <button 
            onClick={() => router.push('/')}
            className="btn btn-link text-white p-0 me-3"
          >
            <i className="bi bi-arrow-left fs-4"></i>
          </button>
          <div>
            <h6 className="mb-0">Chat</h6>
            <small className="opacity-75">
              {isImageMode ? 'Image Generation Mode' : 'Text Chat Mode'}
            </small>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow-1 overflow-auto p-3">
        {messages?.length === 0 ? (
          <div className="text-center text-muted mt-5">
            <i className="bi bi-chat-square-text" style={{ fontSize: '3rem' }}></i>
            <h5 className="mt-3">Start the conversation</h5>
            <p>Send a message to begin chatting!</p>
          </div>
        ) : (
          <div>
            {messages?.map((msg, index) => (
              <div key={index} className={`mb-3 ${msg.role === 'user' ? 'text-end' : 'text-start'}`}>
                <div className={`d-inline-block p-3 rounded-3 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white' 
                    : 'bg-white border shadow-sm'
                }`} style={{ maxWidth: '80%' }}>
                  <div className="mb-1">
                    {msg.content}
                  </div>
                  {msg.image_url && (
                    <div className="mt-2">
                      <img 
                        src={msg.image_url} 
                        alt="Generated image" 
                        className="img-fluid rounded"
                        style={{ maxWidth: '300px' }}
                      />
                    </div>
                  )}
                  <small className={`opacity-75 ${msg.role === 'user' ? 'text-light' : 'text-muted'}`}>
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </small>
                </div>
              </div>
            ))}
            {sendMessageMutation.isPending && (
              <div className="text-start mb-3">
                <div className="d-inline-block p-3 rounded-3 bg-white border shadow-sm">
                  <div className="d-flex align-items-center">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    {isImageMode ? 'Generating image...' : 'Thinking...'}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white p-3 border-top">
        {/* Mode Toggle */}
        <div className="mb-2">
          <div className="btn-group w-100" role="group">
            <button
              type="button"
              className={`btn ${!isImageMode ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setIsImageMode(false)}
            >
              <i className="bi bi-chat-text me-1"></i>
              Text Chat
            </button>
            <button
              type="button"
              className={`btn ${isImageMode ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setIsImageMode(true)}
            >
              <i className="bi bi-image me-1"></i>
              Generate Image
            </button>
          </div>
        </div>

        {/* Message Input */}
        <div className="d-flex gap-2">
          <div className="flex-grow-1">
            <textarea
              className="form-control"
              rows={message.split('\n').length || 1}
              placeholder={isImageMode ? 'Describe the image you want to generate...' : 'Type your message...'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={sendMessageMutation.isPending}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="btn btn-primary"
          >
            {sendMessageMutation.isPending ? (
              <div className="spinner-border spinner-border-sm" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            ) : (
              <i className="bi bi-send"></i>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}