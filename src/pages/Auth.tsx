import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { LanguageSelector } from '../components/LanguageSelector';

export function Auth() {
  const { t } = useTranslation();
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
        setErrorMsg(t('auth.register_success'));
        setIsLogin(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('auth.auth_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[linear-gradient(-45deg,#020617,#1e1b4b,#3b0764,#020617)] bg-[length:400%_400%] animate-[gradient_15s_ease_infinite] text-white font-sans overflow-hidden p-4">
      <div className="crt-overlay" />

      {/* Language Selector Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <LanguageSelector />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className="relative z-10 w-full max-w-md p-8 md:p-10 bg-black/40 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.15)] border-2 border-white/10"
      >
        <motion.h1 
          className="text-4xl md:text-5xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-600 mb-2 tracking-[0.2em] neon-text-shadow hover:animate-[glitch_0.3s_infinite]"
          animate={{ textShadow: ["0 0 10px rgba(168,85,247,0.5)", "0 0 20px rgba(168,85,247,0.8)", "0 0 10px rgba(168,85,247,0.5)"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          PARTYHUB
        </motion.h1>
        <p className="text-center text-xs font-mono text-gray-400 uppercase tracking-widest mb-8">
          {t('auth.subtitle')}
        </p>
        
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
              <label className="block text-purple-300/70 text-xs font-bold mb-2 uppercase tracking-widest font-mono">
                {t('auth.username')}
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-4 bg-black/50 border-b-2 border-white/10 text-white focus:border-transparent focus:outline-none transition-all placeholder:text-gray-600 font-mono text-sm"
                  placeholder={t('auth.username_placeholder')}
                  required={!isLogin}
                />
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-focus-within:w-full" />
              </div>
            </div>
          )}
          
          <div className="group">
            <label className="block text-purple-300/70 text-xs font-bold mb-2 uppercase tracking-widest font-mono">
              {t('auth.email')}
            </label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-black/50 border-b-2 border-white/10 text-white focus:border-transparent focus:outline-none transition-all placeholder:text-gray-600 font-mono text-sm"
                placeholder={t('auth.email_placeholder')}
                required 
              />
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-500 transition-all duration-300 group-focus-within:w-full" />
            </div>
          </div>
          
          <div className="group">
            <label className="block text-purple-300/70 text-xs font-bold mb-2 uppercase tracking-widest font-mono">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-black/50 border-b-2 border-white/10 text-white focus:border-transparent focus:outline-none transition-all placeholder:text-gray-600 font-mono tracking-widest text-sm"
                placeholder={t('auth.password_placeholder')}
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
            className="relative w-full py-4 mt-8 bg-purple-600 hover:bg-purple-500 text-white font-black tracking-widest uppercase rounded overflow-hidden group disabled:opacity-50 border border-purple-400/50 shadow-[0_0_20px_rgba(147,51,234,0.3)] transition-all cursor-pointer text-sm"
          >
            <span className="relative z-10">
              {loading ? t('common.loading') : (isLogin ? t('auth.sign_in_btn') : t('auth.sign_up_btn'))}
            </span>
            <div className="absolute inset-0 h-full w-0 bg-white/20 transition-all duration-500 ease-out group-hover:w-full" />
          </motion.button>
        </form>

        <p className="mt-8 text-center text-gray-400 text-xs font-mono">
          {isLogin ? `${t('auth.need_account')} ` : `${t('auth.already_account')} `}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-purple-400 hover:text-purple-300 font-bold transition-colors hover:underline decoration-wavy underline-offset-4 cursor-pointer"
          >
            {isLogin ? t('auth.sign_up_btn') : t('auth.sign_in_btn')}
          </button>
        </p>
      </motion.div>
    </div>
  );
}