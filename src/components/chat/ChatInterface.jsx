import { useState, useEffect, useRef } from 'react';
import { Send, AlertCircle, PanelRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { parseMessageContent } from './DataLink';
import ArtifactsPanel from './ArtifactsPanel';
import { SpinningTrnaCursor } from './SpinningTrnaCursor';
import { DemoMessages } from './DemoMessages';
import { useAuth } from './AuthContext';
import { AuthComponent } from './AuthComponent';

const API_URL = 'http://localhost:8080';

const parseJSONFields = (data) => {
  const parsed = {...data};
  Object.keys(parsed).forEach(key => {
    if (typeof parsed[key] === 'string' && 
        (parsed[key].startsWith('{') || parsed[key].startsWith('['))) {
      try {
        parsed[key] = JSON.parse(parsed[key]);
      } catch (e) {
        console.warn(`Failed to parse JSON for field ${key}`);
      }
    }
  });
  return parsed;
};

function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tableData, setTableData] = useState({});
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [artifactsPanelWidth, setArtifactsPanelWidth] = useState('35%');
  
  const { isAuthenticated, authToken } = useAuth();
  const eventSource = useRef(null);
  const messagesEndRef = useRef(null);
  const dragRef = useRef(null);
  const userId = useRef(crypto.randomUUID());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isAuthenticated && authToken) {
      console.log('Authenticated, initializing SSE connection');
      initEventSource(authToken);
    }
  }, [isAuthenticated, authToken]);

  const initEventSource = (token) => {
    const url = new URL(`${API_URL}/stream`);
    url.searchParams.append('token', token);
    url.searchParams.append('user_id', userId.current);
    
    console.log('Creating new SSE connection to:', url.toString());
    eventSource.current = new EventSource(url.toString());

    eventSource.current.onopen = () => {
      console.log('SSE Connected successfully');
      setIsConnected(true);
      setError(null);
    };

    eventSource.current.onerror = (error) => {
      console.error('SSE Error:', error);
      setIsConnected(false);
      setError('Connection error occurred');
    };

    eventSource.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleServerMessage(data);
    };
  };
  
  const handleServerMessage = (data) => {
    console.log('Received message:', data);
    
    switch (data.type) {
        case 'stream_start':
            setIsLoading(false);
            // Initialize new message on stream start
            setMessages(prev => [...prev, {
                id: data.message_id,
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
                isStreaming: true
            }]);
            break;

        case 'stream_chunk':
            // Update the streaming message with new content
            setMessages(prev => prev.map(msg => 
                msg.id === data.message_id
                ? { 
                    ...msg,
                    content: msg.content + data.content,
                    isStreaming: true
                }
                : msg
            ));
            break;

        case 'stream_end':
            // Mark the message as complete and update with final content
            setMessages(prev => prev.map(msg => 
                msg.id === data.message_id
                ? {
                    ...msg,
                    content: data.full_response || msg.content,
                    isStreaming: false
                }
                : msg
            ));
            setIsLoading(false);
            break;

            case 'row_added':
              setTableData(prev => {
                  const parsedRow = parseJSONFields(data.row);
                  const updatedTable = (prev[data.table] || []).map(row =>
                      row.GtRNAdb_Gene_Symbol === parsedRow.GtRNAdb_Gene_Symbol 
                      ? parsedRow 
                      : row
                  );
          
                  if (!updatedTable.some(row => 
                      row.GtRNAdb_Gene_Symbol === parsedRow.GtRNAdb_Gene_Symbol
                  )) {
                      updatedTable.push(parsedRow);
                  }
          
                  return {
                      ...prev,
                      [data.table]: updatedTable
                  };
              });
              break;

        case 'error':
            setError(data.message);
            setIsLoading(false);
            // Remove any incomplete streaming messages
            setMessages(prev => prev.filter(msg => !msg.isStreaming));
            break;
    }
};


  const sendMessage = async (messageText) => {
    if (!messageText.trim() || !isConnected || isLoading || !isAuthenticated) return;
  
    const messageId = crypto.randomUUID();
    
    setMessages(prev => [...prev, {
      id: messageId,
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString()
    }]);
  
    try {
      const url = new URL(`${API_URL}/chat`);
      url.searchParams.append('token', authToken);
      url.searchParams.append('user_id', userId.current);
  
      const response = await fetch(url.toString(), {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText.trim(),
          message_id: messageId,
          user_id: userId.current
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server error processing message');
      }
  
      setIsLoading(true);
      setError(null);
    } catch (err) {
      console.error('Error processing message:', err);
      setError('Server error processing message'); // More accurate error
      // Don't remove the message since it was sent successfully
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (input.trim()) {
      await sendMessage(input);
      setInput('');
    }
  };

  const handleDemoMessage = async (message) => {
    await sendMessage(message);
  };

  const handleDragStart = (e) => {
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDrag = (e) => {
    // Calculate width from right edge of window instead of left
    const width = ((window.innerWidth - e.clientX) / window.innerWidth) * 100;
    if (width > 20 && width < 60) {
      setArtifactsPanelWidth(`${width}%`);
    }
  };

  const handleDragEnd = () => {
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="flex flex-col flex-1 h-screen overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-50 border-b border-gray-700 bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-gray-800/80">
          <div className={`flex justify-between items-center px-4 py-3 ${!showArtifacts ? 'max-w-3xl mx-auto' : ''}`}>
            <h1 className="text-lg font-semibold text-gray-100">tRNA Analysis Chat</h1>
            <div className="flex items-center gap-4">
              {!isAuthenticated && <AuthComponent />}
              {!showArtifacts && (
                <button
                  onClick={() => setShowArtifacts(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-800 text-gray-100 
                          rounded-md border border-gray-600 hover:bg-gray-700 hover:border-gray-500 
                          transition-all duration-200 group"
                >
                  <PanelRight size={16} className="text-gray-400 group-hover:text-gray-300" />
                  Show Data Explorer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className={`w-full ${!showArtifacts ? 'max-w-3xl mx-auto' : ''}`}>
            <div className="flex flex-col p-4 space-y-6">
              {messages.length === 0 && (
                <DemoMessages 
                  onSelectDemo={handleDemoMessage}
                  disabled={!isConnected || !isAuthenticated || isLoading}
                />
              )}

              {messages.map((message, idx) => (
                <div key={idx} className="flex flex-col gap-1">
                  {message.role === 'user' && (
                    <div className="text-sm text-gray-500 ml-2 mb-1">User</div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600/20 border border-blue-500/20 text-gray-100'
                        : 'bg-gray-800 border border-gray-700 text-gray-100'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words font-sans">
                      {message.role === 'assistant' ? parseMessageContent(message.content, tableData) : message.content}
                      {message.isStreaming && <SpinningTrnaCursor />}
                    </div>
                    <div className="text-xs mt-2 text-gray-500">
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && ( 
                <div className="flex items-center gap-3 text-gray-400 bg-gray-800/30 px-4 py-2 rounded-lg
                              border border-gray-700 max-w-[200px]">
                  <SpinningTrnaCursor />
                  <span className="text-sm">Processing...</span>
                </div>
              )}

              {error && (
                <Alert variant="destructive" 
                       className="bg-red-900/30 border border-red-900/50 text-red-200 max-w-[85%]">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 z-50 border-t border-gray-700 bg-gray-800/95 
                      backdrop-blur supports-[backdrop-filter]:bg-gray-800/80">
          <form onSubmit={handleSubmit} className={`${!showArtifacts ? 'max-w-3xl mx-auto' : ''} 
                                                   flex gap-3 p-4`}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-600 px-4 py-2.5 rounded-md 
                       text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 
                       focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
              placeholder={!isAuthenticated ? "Please authenticate first..." : 
                         isConnected ? "Type your message..." : "Connecting..."}
              disabled={!isConnected || isLoading || !isAuthenticated}
            />
            <button
              type="submit"
              disabled={!isConnected || !input.trim() || isLoading || !isAuthenticated}
              className="px-4 py-2.5 bg-blue-600 text-gray-100 rounded-md hover:bg-blue-500 
                       disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed 
                       transition-all duration-200 flex items-center justify-center"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Artifacts Panel */}
      {showArtifacts && (
        <>
          <div
            ref={dragRef}
            onMouseDown={handleDragStart}
            className="w-1 bg-gray-700 hover:bg-blue-600/50 cursor-col-resize transition-colors"
          />
          <ArtifactsPanel
            tableData={tableData}
            isOpen={showArtifacts}
            onClose={() => setShowArtifacts(false)}
            width={artifactsPanelWidth}
          />
        </>
      )}
    </div>
  );
}

export default ChatInterface;