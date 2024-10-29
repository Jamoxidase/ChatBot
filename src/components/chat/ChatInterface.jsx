// ChatInterface.jsx
import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ArtifactsPanel from './ArtifactsPanel';


function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sequences, setSequences] = useState({});
  const [showArtifacts, setShowArtifacts] = useState(true);
  const [artifactsPanelWidth, setArtifactsPanelWidth] = useState('30%');
  
  const ws = useRef(null);
  const messagesEndRef = useRef(null);
  const dragRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleDragStart = (e) => {
    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
  };

  const handleDrag = (e) => {
    const width = (e.clientX / window.innerWidth) * 100;
    if (width > 20 && width < 60) {
      setArtifactsPanelWidth(`${width}%`);
    }
  };

  const handleDragEnd = () => {
    document.removeEventListener('mousemove', handleDrag);
    document.removeEventListener('mouseup', handleDragEnd);
  };

  useEffect(() => {
    const connectWebSocket = () => {
      console.log('Connecting to WebSocket...');
      ws.current = new WebSocket('ws://localhost:8765');

      ws.current.onopen = () => {
        console.log('WebSocket Connected');
        setIsConnected(true);
        setError(null);
      };

      ws.current.onclose = () => {
        console.log('WebSocket Disconnected');
        setIsConnected(false);
        setError('Connection lost. Attempting to reconnect...');
        setTimeout(connectWebSocket, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setError('WebSocket error occurred');
      };

      ws.current.onmessage = (event) => {
        console.log('Received message:', event.data);
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'db_state':
              console.log('Receiving full DB state');
              const newSequences = {};
              data.data.forEach(seq => {
                newSequences[seq.sequence_id] = seq;
              });
              setSequences(newSequences);
              break;
              
            case 'db_update':
              console.log('Received single sequence update for:', data.sequence_id);
              setSequences(prev => ({
                ...prev,
                [data.sequence_id]: data.data
              }));
              break;
              
            case 'db_clear':
              console.log('Clearing DB state');
              setSequences({});
              break;
              
            case 'error':
              console.error('Received error:', data.message);
              setError(data.message);
              setIsLoading(false);
              break;
              
            case 'response':
              console.log('Received chat response');
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.message,
                timestamp: new Date().toISOString()
              }]);
              setIsLoading(false);
              setError(null);
              break;
              
            default:
              console.warn('Unknown message type:', data.type);
          }
        } catch (err) {
          console.error('Error processing message:', err);
          setError('Error processing server message');
        }
      };
    };

    connectWebSocket();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !isConnected || isLoading) return;

    console.log('Sending message:', input.trim());
    setMessages(prev => [...prev, {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    }]);

    try {
      ws.current.send(JSON.stringify({
        message: input.trim()
      }));
      setIsLoading(true);
      setInput('');
      setError(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <ArtifactsPanel
        sequences={sequences}
        isOpen={showArtifacts}
        onClose={() => setShowArtifacts(false)}
        width={artifactsPanelWidth}
      />
      
      {showArtifacts && (
        <div
          ref={dragRef}
          onMouseDown={handleDragStart}
          className="w-1 bg-gray-200 hover:bg-blue-200 cursor-col-resize transition-colors"
        />
      )}
      
      <div className="flex flex-col flex-1">
        <div className="border-b bg-white px-4 py-3 flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900">tRNA Analysis Chat</h1>
          {!showArtifacts && (
            <button
              onClick={() => setShowArtifacts(true)}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
            >
              Show Sequences
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <h2 className="text-xl font-semibold mb-2">Welcome to tRNA Analysis</h2>
              <p>Ask questions about tRNA sequences and structures</p>
            </div>
          )}

          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`mb-4 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <pre className="whitespace-pre-wrap break-words font-sans">
                  {message.content}
                </pre>
                <div className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>Processing...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t bg-white p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isConnected ? "Type your message..." : "Connecting..."}
              disabled={!isConnected || isLoading}
            />
            <button
              type="submit"
              disabled={!isConnected || !input.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
                       disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors 
                       flex items-center justify-center"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;