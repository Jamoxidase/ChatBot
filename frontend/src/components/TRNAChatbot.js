import React, { useState, useRef } from 'react';
import { Loader, MessageCircle, Trash2 } from 'lucide-react';
import ArtifactList from './ArtifactList';
import TypingEffect from './TypingEffect';

const TRNAChatbot = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [responseMode, setResponseMode] = useState('intermediate');
  const [isLoading, setIsLoading] = useState(false);
  const [artifacts, setArtifacts] = useState([]);
  const [fullResultsUrl, setFullResultsUrl] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingSpeed, setTypingSpeed] = useState(20);
  const [feedbackInput, setFeedbackInput] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const chatWindowRef = useRef(null);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '') return;

    setIsLoading(true);
    setMessages(prevMessages => [...prevMessages, { role: 'user', content: inputMessage }]);

    try {
      const response = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          response_mode: responseMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from server');
      }

      const data = await response.json();
      setIsLoading(false);
      setIsTyping(true);
      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: data.chatbot_response, isTyping: true }]);
      
      if (data.api_data) {
        setArtifacts(data.api_data);
        setFullResultsUrl(data.full_results_url);
      }
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
      setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: 'Sorry, there was an error processing your request.' }]);
    } finally {
      setInputMessage('');
    }
  };

  const handleTypingComplete = () => {
    setIsTyping(false);
    setMessages(prevMessages => 
      prevMessages.map((msg, index) => 
        index === prevMessages.length - 1 ? { ...msg, isTyping: false } : msg
      )
    );
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackInput.trim() === '') return;

    try {
      const response = await fetch('http://localhost:8080/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback: feedbackInput }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      setFeedbackInput('');
      setShowFeedbackInput(false);
      alert('Feedback submitted successfully!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  };

  const handleClearHistory = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/clear_history', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      setMessages([]);
      alert('Chat history cleared successfully!');
    } catch (error) {
      console.error('Error clearing chat history:', error);
      alert('Failed to clear chat history. Please try again.');
    }
  };

  const handleClearFeedback = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/clear_feedback', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to clear feedback');
      }

      alert('Feedback cleared successfully!');
    } catch (error) {
      console.error('Error clearing feedback:', error);
      alert('Failed to clear feedback. Please try again.');
    }
  };

  return (
    <div className="flex h-screen">
      <div className="w-1/3 p-4 overflow-auto border-r" style={{ resize: 'horizontal', overflow: 'auto' }}>
        <ArtifactList artifacts={artifacts} fullResultsUrl={fullResultsUrl} />
      </div>
      <div className="flex-1 flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">tRNA Chatbot</h1>
          <div>
            <button onClick={handleClearHistory} className="mr-2 p-2 bg-red-500 text-white rounded hover:bg-red-600">
              <Trash2 size={16} />
              <span className="ml-1">Clear History</span>
            </button>
            <button onClick={handleClearFeedback} className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">
              <Trash2 size={16} />
              <span className="ml-1">Clear Feedback</span>
            </button>
          </div>
        </div>
        
        <select 
          value={responseMode} 
          onChange={(e) => setResponseMode(e.target.value)}
          className="mb-4 p-2 border rounded"
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="expert">Expert</option>
        </select>
        
        
        <div className="flex-grow overflow-auto mb-4 border rounded p-2" ref={chatWindowRef}>
          {messages.map((message, index) => (
            <div key={index} className={`mb-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
              <span className={`inline-block p-2 rounded ${message.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                {message.isTyping ? (
                  <TypingEffect 
                    text={message.content} 
                    onComplete={handleTypingComplete} 
                    speed={typingSpeed}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                )}
              </span>
              {message.role === 'assistant' && !message.isTyping && (
                <button
                  onClick={() => setShowFeedbackInput(true)}
                  className="ml-2 text-blue-500 hover:text-blue-700"
                >
                  <MessageCircle size={16} />
                </button>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-center items-center">
              <Loader className="animate-spin" />
            </div>
          )}
        </div>
        
        {showFeedbackInput && (
          <div className="mb-4">
            <input
              type="text"
              value={feedbackInput}
              onChange={(e) => setFeedbackInput(e.target.value)}
              placeholder="Enter your feedback..."
              className="w-full p-2 border rounded"
            />
            <button
              onClick={handleFeedbackSubmit}
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Submit Feedback
            </button>
          </div>
        )}
        
        <div className="flex">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-grow mr-2 p-2 border rounded"
            disabled={isLoading || isTyping}
          />
          <button 
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isLoading || isTyping}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TRNAChatbot;