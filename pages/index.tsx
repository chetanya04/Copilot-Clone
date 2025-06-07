import { useEffect, useState } from 'react';
import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/router';
import { supabase } from '@/src/lib/supabaseClient';
import { api } from '@/src/lib/trpc/client';

export default function HomePage() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  useEffect(() => {
    console.log("Supabase:", supabase);

    const saveUserToSupabase = async () => {
      if (!user?.sub || !user?.email) return;

      const { data, error } = await supabase
        .from('users')
        .upsert([
          {
            auth0_id: user.sub,
            email: user.email,
          }
        ], {
          onConflict: 'auth0_id'
        })
        .select();


      if (error) {
        console.error('Supabase upsert error:', error);
      } else {
        console.log('User upserted/updated:', data);
      }
    };

    if (user) saveUserToSupabase();
  }, [user]);

  const { data: chats, refetch: refetchChats } = api.chat.getChats.useQuery(
    undefined,
    { enabled: !!user }
  );

  const createChatMutation = api.chat.createChat.useMutation({
    onSuccess: (newChat) => {
      router.push(`/chat/${newChat.id}`);
    },
  });

  const deleteChatMutation = api.chat.deleteChat.useMutation({
    onSuccess: () => {
      refetchChats();
      setShowDeleteModal(null);
    },
  });

  const handleCreateChat = async () => {
    try {
      await createChatMutation.mutateAsync({});
    } catch (error) {
      console.error('Failed to create chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChatMutation.mutateAsync({ chatId });
    } catch (error) {
      console.error('Failed to delete chat:', error);
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
    return (
      <div className="vh-100 d-flex flex-column justify-content-center align-items-center bg-light">
        <div className="text-center p-4">
          <div className="mb-4">
            <i className="bi bi-robot text-primary" style={{ fontSize: '4rem' }}></i>
          </div>
          <h2 className="mb-3">Welcome to ChatGPT Clone</h2>
          <p className="text-muted mb-4">
            Experience AI-powered conversations and image generation
          </p>
          <div className="d-grid gap-2">
            <a href="/api/auth/login" className="btn btn-primary btn-lg">
              <i className="bi bi-box-arrow-in-right me-2"></i>
              Sign In to Get Started
            </a>
          </div>
          <div className="mt-4 text-muted small">
            <p className="mb-1">Features:</p>
            <div className="d-flex justify-content-center gap-3">
              <span><i className="bi bi-chat-text"></i> AI Chat</span>
              <span><i className="bi bi-image"></i> Image Generation</span>
              <span><i className="bi bi-phone"></i> Mobile Optimized</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="vh-100 d-flex flex-column bg-light">
      {/* Header */}
      <div className="bg-primary text-white p-3">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <img
                src={user.picture || '/default-avatar.png'}
                alt="Profile"
                className="rounded-circle"
                width="40"
                height="40"
              />
            </div>
            <div>
              <h6 className="mb-0">ChatGPT Clone</h6>
              <small className="opacity-75">Welcome, {user.name}</small>
            </div>
          </div>
          <div className="dropdown">
            <button
              className="btn btn-link text-white p-0"
              type="button"
              data-bs-toggle="dropdown"
            >
              <i className="bi bi-three-dots-vertical fs-5"></i>
            </button>
            <ul className="dropdown-menu dropdown-menu-end">
              <li>
                <a className="dropdown-item" href="/api/auth/logout">
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Logout
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-grow-1 overflow-auto">
        {chats?.length === 0 ? (
          <div className="text-center p-5">
            <i className="bi bi-chat-square-text text-muted" style={{ fontSize: '3rem' }}></i>
            <h5 className="mt-3 text-muted">No conversations yet</h5>
            <p className="text-muted">Start your first chat to begin!</p>
          </div>
        ) : (
          <div className="p-3">

            {chats?.map((chat) => (
              <div key={chat.id} className="card mb-3 shadow-sm">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between">
                    <div
                      onClick={() => router.push(`/chat/${chat.id}`)}
                      className="flex-grow-1 cursor-pointer"
                      style={{ cursor: 'pointer' }}
                    >
                      <h6 className="card-title mb-1 text-truncate">
                        {/* Use chat.id or another field instead of chat.title */}
                        Chat #{chat.id.slice(-8)}
                      </h6>
                      <small className="text-muted">
                        Updated {new Date(chat.updated_at).toLocaleDateString()}
                      </small>
                    </div>
                    <div className="dropdown">
                      <button
                        className="btn btn-link text-muted p-1"
                        type="button"
                        data-bs-toggle="dropdown"
                      >
                        <i className="bi bi-three-dots-vertical"></i>
                      </button>
                      <ul className="dropdown-menu dropdown-menu-end">
                        <li>
                          <button
                            className="dropdown-item text-danger"
                            onClick={() => setShowDeleteModal(chat.id)}
                          >
                            <i className="bi bi-trash me-2"></i>
                            Delete
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={handleCreateChat}
          disabled={createChatMutation.isPending}
          className="btn btn-primary w-100 d-flex align-items-center justify-content-center"
        >
          {createChatMutation.isPending ? (
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          ) : (
            <i className="bi bi-plus-lg me-2"></i>
          )}
          Start New Chat
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Chat</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this chat? This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleDeleteChat(showDeleteModal)}
                  disabled={deleteChatMutation.isPending}
                >
                  {deleteChatMutation.isPending && (
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
