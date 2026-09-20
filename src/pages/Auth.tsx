import { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';

export function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [username, setUsername] = useState('');
  const { signIn, signUp } = useAuthStore();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, username || email.split('@')[0]);
        setErrorMsg('Conta criada! Faça o login agora.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[linear-gradient(-45deg,#020617,#1e1b4b,#3b0764,#020617)] bg-[length:400%_400%] animate-[gradient_15s_ease_infinite] text-white font-sans overflow-hidden">
      <div className="crt-overlay" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative z-10 w-full max-w-md p-10 bg-black/40 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.15)] border-2 border-white/10"
      >
        <motion.h1 
          className="text-5xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-600 mb-10 tracking-[0.2em] neon-text-shadow hover:animate-[glitch_0.3s_infinite]"
          animate={{ textShadow: ["0 0 10px rgba(168,85,247,0.5)", "0 0 20px rgba(168,85,247,0.8)", "0 0 10px rgba(168,85,247,0.5)"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          PARTYHUB
        </motion.h1>
        
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="mb-6 p-4 bg-red-950/50 border-l-4 border-red-500 text-red-200 rounded font-mono text-sm shadow-[0_0_10px_rgba(239,68,68,0.3)]"
          >
            {errorMsg}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="space-y-6 relative">
          {!isLogin && (
            <div className="group">
              <label className="block text-purple-300/70 text-xs font-bold mb-2 uppercase tracking-widest font-mono">Nome de Usuário</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-4 bg-black/50 border-b-2 border-white/10 text-white focus:border-transparent focus:outline-none transition-all placeholder:text-gray-600 font-mono"
                  placeholder="NeonViper"
                  required={!isLogin}
                />
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-focus-within:w-full" />
              </div>
            </div>
          )}
          
          <div className="group">
            <label className="block text-purple-300/70 text-xs font-bold mb-2 uppercase tracking-widest font-mono">Email</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-black/50 border-b-2 border-white/10 text-white focus:border-transparent focus:outline-none transition-all placeholder:text-gray-600 font-mono"
                placeholder="user@system.net"
                required 
              />
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-focus-within:w-full" />
            </div>
          </div>
          
          <div className="group">
            <label className="block text-purple-300/70 text-xs font-bold mb-2 uppercase tracking-widest font-mono">Senha</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-black/50 border-b-2 border-white/10 text-white focus:border-transparent focus:outline-none transition-all placeholder:text-gray-600 font-mono tracking-widest"
                placeholder="••••••••"
                required 
              />
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-focus-within:w-full" />
            </div>
          </div>
          
          <motion.button 
            type="submit" 
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="relative w-full py-4 mt-8 bg-purple-600 text-white font-black tracking-widest uppercase rounded overflow-hidden group disabled:opacity-50 border border-purple-400/50 shadow-[0_0_20px_rgba(147,51,234,0.3)]"
          >
            <span className="relative z-10">{loading ? 'Processing...' : (isLogin ? 'Login' : 'Registrar')}</span>
            <div className="absolute inset-0 h-full w-0 bg-white/20 transition-all duration-500 ease-out group-hover:w-full" />
          </motion.button>
        </form>

        <p className="mt-8 text-center text-gray-400 text-sm font-mono">
          {isLogin ? "No record found? " : "Existing operator? "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-purple-400 hover:text-purple-300 font-bold transition-colors hover:underline decoration-wavy underline-offset-4">
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}