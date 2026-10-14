import { useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { useParams } from 'react-router-dom';
import { Auth } from './pages/Auth';
import { Hub } from './pages/Hub';
import { Profile } from './pages/Profile';
import { IttoGameRoom } from './pages/IttoGameRoom';
import { HanabiGameRoom } from './pages/HanabiGameRoom';
import { CahGameRoom } from './pages/CahGameRoom';
import { LudoGameRoom } from './pages/LudoGameRoom';
import { WavelengthGameRoom } from './pages/WavelengthGameRoom';
import { ErrorBoundary } from './components/ErrorBoundary';

// Despachador de jogos com base no slug da URL
function GameDispatcher() {
  const { gameSlug } = useParams<{ gameSlug: string }>();
  let roomComponent = <IttoGameRoom />;

  if (gameSlug === 'hanabi') {
    roomComponent = <HanabiGameRoom />;
  } else if (gameSlug === 'cah' || gameSlug === 'cartas-contra-humanidade') {
    roomComponent = <CahGameRoom />;
  } else if (gameSlug === 'ludo') {
    roomComponent = <LudoGameRoom />;
  } else if (gameSlug === 'wavelength' || gameSlug === 'comprimento-de-onda') {
    roomComponent = <WavelengthGameRoom />;
  }

  return (
    <ErrorBoundary>
      {roomComponent}
    </ErrorBoundary>
  );
}

// Componente que protege rotas. Se não tiver logado, manda pro login.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) {
    return (
      <div className="h-[100dvh] bg-ground flex items-center justify-center">
        <Loader2 size={36} className="text-violet-400 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (!user) return <Navigate to="/" replace />;
  
  return children;
}

export default function App() {
  const { initialize, user, isLoading } = useAuthStore();

  useEffect(() => {
    initialize(); 
  }, []);

  if (isLoading) return null;

  return (
    <MotionConfig reducedMotion="user">
    <BrowserRouter>
      <Routes>
        {/* Se já estiver logado, redireciona o / direto pro Hub */}
        <Route path="/" element={user ? <Navigate to="/hub" replace /> : <Auth />} />
        
        <Route path="/hub" element={
          <ProtectedRoute>
            <Hub />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        <Route path="/game/:gameSlug/:roomId" element={
          <ProtectedRoute>
            <GameDispatcher />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
    </MotionConfig>
  );
}