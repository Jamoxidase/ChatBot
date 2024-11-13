import { AuthProvider } from './components/chat/AuthContext';
import ChatInterface from './components/chat/ChatInterface';

function App() {
  return (
    <AuthProvider>
      <ChatInterface />
    </AuthProvider>
  );
}

export default App;