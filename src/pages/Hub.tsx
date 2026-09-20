import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'framer-motion';
import { LanguageSelector } from '../components/LanguageSelector';

export function Hub() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [ittoCode, setIttoCode] = useState('');
  const [hanabiCode, setHanabiCode] = useState('');
  const [cahCode, setCahCode] = useState('');
  const [ludoCode, setLudoCode] = useState('');

  const createIttoRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    navigate(`/game/itto/${code}`);
  };

  const joinIttoRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (ittoCode.trim()) {
      navigate(`/game/itto/${ittoCode.toUpperCase()}`);
    }
  };

  const createHanabiRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    navigate(`/game/hanabi/${code}`);
  };

  const joinHanabiRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (hanabiCode.trim()) {
      navigate(`/game/hanabi/${hanabiCode.toUpperCase()}`);
    }
  };

  const createCahRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    navigate(`/game/cah/${code}`);
  };

  const joinCahRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (cahCode.trim()) {
      navigate(`/game/cah/${cahCode.toUpperCase()}`);
    }
  };

  const createLudoRoom = () => {
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    navigate(`/game/ludo/${code}`);
  };

  const joinLudoRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (ludoCode.trim()) {
      navigate(`/game/ludo/${ludoCode.toUpperCase()}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-white p-8 font-sans overflow-hidden bg-grid-pattern">
      <div className="crt-overlay" />
      
      {/* Background ambient light */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />

      <header className="relative z-10 flex flex-col md:flex-row justify-between items-center mb-16 border-b-2 border-purple-900/50 pb-6 gap-6">
        <motion.h1 
          className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-fuchsia-600 tracking-widest neon-text-shadow hover:animate-[glitch_0.3s_infinite]"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          PARTY HUB
        </motion.h1>
        
        {/* Actions bar: Language Selector + Retro Readout for User Profile */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <LanguageSelector />

          <motion.div 
            onClick={() => navigate('/profile')}
            className="flex items-center gap-6 bg-black p-4 border border-green-500/30 rounded-xl font-mono shadow-[0_0_15px_rgba(34,197,94,0.1)] cursor-pointer hover:bg-green-950/20 hover:border-green-400 transition-all"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          >
            <div className="flex flex-col">
              <span className="text-green-500/70 text-xs uppercase tracking-widest">
                {t('hub.profile_btn')}
              </span>
              <span className="text-green-400 font-bold">{useAuthStore.getState().username || user?.email}</span>
            </div>
            <span className="text-green-500 text-xs uppercase font-black tracking-widest">&rarr;</span>
          </motion.div>
        </div>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Card do Jogo 1: ITTO */}
        <motion.div 
          className="relative bg-black/40 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/10 flex flex-col justify-between overflow-hidden shadow-2xl"
          whileHover={{ y: -8, boxShadow: "0 20px 50px rgba(168,85,247,0.4)", borderColor: "rgba(168,85,247,0.5)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] pointer-events-none mix-blend-overlay" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-black text-purple-300 tracking-wider">
                {t('hub.itto_title')}
              </h2>
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-xs font-mono font-bold whitespace-nowrap flex-shrink-0">
                {t('hub.itto_tag')}
              </span>
            </div>
            <p className="text-gray-300 text-sm mb-8 leading-relaxed">
              {t('hub.itto_desc')}
            </p>
          </div>
          
          <div className="relative z-10 space-y-5">
            <motion.button 
              onClick={createIttoRoom} 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-black tracking-widest uppercase rounded-xl overflow-hidden group shadow-[0_0_20px_rgba(147,51,234,0.4)] border border-purple-400/50 relative transition-all cursor-pointer text-sm"
            >
              <span className="relative z-10">{t('hub.itto_create')}</span>
              <div className="absolute inset-0 h-full w-0 bg-white/20 transition-all duration-500 ease-out group-hover:w-full" />
            </motion.button>
            
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-purple-900/50" />
              <span className="flex-shrink-0 mx-3 text-purple-400/60 font-bold font-mono text-[11px] uppercase tracking-widest">
                {t('hub.or_enter_code')}
              </span>
              <div className="flex-grow border-t border-purple-900/50" />
            </div>

            <form onSubmit={joinIttoRoom} className="flex gap-2 relative group">
              <input 
                type="text" 
                placeholder={t('hub.enter_code_placeholder')} 
                maxLength={4}
                value={ittoCode}
                onChange={(e) => setIttoCode(e.target.value)}
                className="w-full bg-black/80 border-2 border-gray-700 text-center uppercase text-xl font-black rounded-xl p-3.5 focus:outline-none focus:border-purple-500 transition-all placeholder:text-gray-700 font-mono text-purple-300"
              />
              <motion.button 
                type="submit" 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 bg-gray-800 hover:bg-purple-600 border-2 border-gray-700 hover:border-purple-400 rounded-xl font-black tracking-wider transition-all shadow-md text-sm cursor-pointer"
              >
                {t('hub.join_btn')}
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Card do Jogo 2: HANABI */}
        <motion.div 
          className="relative bg-black/40 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/10 flex flex-col justify-between overflow-hidden shadow-2xl"
          whileHover={{ y: -8, boxShadow: "0 20px 50px rgba(239,68,68,0.3)", borderColor: "rgba(244,63,94,0.5)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] pointer-events-none mix-blend-overlay" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-blue-400 tracking-wider">
                {t('hub.hanabi_title')}
              </h2>
              <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-xs font-mono font-bold whitespace-nowrap flex-shrink-0">
                {t('hub.hanabi_tag')}
              </span>
            </div>
            <p className="text-gray-300 text-sm mb-8 leading-relaxed">
              {t('hub.hanabi_desc')}
            </p>
          </div>
          
          <div className="relative z-10 space-y-5">
            <motion.button 
              onClick={createHanabiRoom} 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-4 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 hover:opacity-90 text-white font-black tracking-widest uppercase rounded-xl overflow-hidden group shadow-[0_0_20px_rgba(239,68,68,0.3)] border border-red-400/50 relative transition-all cursor-pointer text-sm"
            >
              <span className="relative z-10">{t('hub.hanabi_create')}</span>
              <div className="absolute inset-0 h-full w-0 bg-white/20 transition-all duration-500 ease-out group-hover:w-full" />
            </motion.button>
            
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-purple-900/50" />
              <span className="flex-shrink-0 mx-3 text-purple-400/60 font-bold font-mono text-[11px] uppercase tracking-widest">
                {t('hub.or_enter_code')}
              </span>
              <div className="flex-grow border-t border-purple-900/50" />
            </div>

            <form onSubmit={joinHanabiRoom} className="flex gap-2 relative group">
              <input 
                type="text" 
                placeholder={t('hub.enter_code_placeholder')} 
                maxLength={4}
                value={hanabiCode}
                onChange={(e) => setHanabiCode(e.target.value)}
                className="w-full bg-black/80 border-2 border-gray-700 text-center uppercase text-xl font-black rounded-xl p-3.5 focus:outline-none focus:border-red-500 transition-all placeholder:text-gray-700 font-mono text-amber-300"
              />
              <motion.button 
                type="submit" 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 bg-gray-800 hover:bg-red-600 border-2 border-gray-700 hover:border-red-400 rounded-xl font-black tracking-wider transition-all shadow-md text-sm cursor-pointer"
              >
                {t('hub.join_btn')}
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Card do Jogo 3: CARTAS CONTRA A HUMANIDADE */}
        <motion.div 
          className="relative bg-black/50 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/20 flex flex-col justify-between overflow-hidden shadow-2xl"
          whileHover={{ y: -8, boxShadow: "0 20px 50px rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.4)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] pointer-events-none mix-blend-overlay" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-wider">
                {t('hub.cah_title')}
              </h2>
              <span className="px-3 py-1 bg-white/10 text-white border border-white/20 rounded-full text-xs font-mono font-bold whitespace-nowrap flex-shrink-0">
                {t('hub.cah_tag')}
              </span>
            </div>
            <p className="text-gray-300 text-sm mb-8 leading-relaxed">
              {t('hub.cah_desc')}
            </p>
          </div>
          
          <div className="relative z-10 space-y-5">
            <motion.button 
              onClick={createCahRoom} 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-4 bg-white hover:bg-gray-100 text-black font-black tracking-widest uppercase rounded-xl overflow-hidden group shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-white relative transition-all cursor-pointer text-sm"
            >
              <span className="relative z-10">{t('hub.cah_create')}</span>
              <div className="absolute inset-0 h-full w-0 bg-black/10 transition-all duration-500 ease-out group-hover:w-full" />
            </motion.button>
            
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-gray-700" />
              <span className="flex-shrink-0 mx-3 text-gray-400 font-bold font-mono text-[11px] uppercase tracking-widest">
                {t('hub.or_enter_code')}
              </span>
              <div className="flex-grow border-t border-gray-700" />
            </div>

            <form onSubmit={joinCahRoom} className="flex gap-2 relative group">
              <input 
                type="text" 
                placeholder={t('hub.enter_code_placeholder')} 
                maxLength={4}
                value={cahCode}
                onChange={(e) => setCahCode(e.target.value)}
                className="w-full bg-black/80 border-2 border-gray-700 text-center uppercase text-xl font-black rounded-xl p-3.5 focus:outline-none focus:border-white transition-all placeholder:text-gray-700 font-mono text-white"
              />
              <motion.button 
                type="submit" 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 bg-gray-800 hover:bg-white hover:text-black border-2 border-gray-700 hover:border-white rounded-xl font-black tracking-wider transition-all shadow-md text-sm cursor-pointer"
              >
                {t('hub.join_btn')}
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Card do Jogo 4: LUDO */}
        <motion.div 
          className="relative bg-black/40 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/10 flex flex-col justify-between overflow-hidden shadow-2xl"
          whileHover={{ y: -8, boxShadow: "0 20px 50px rgba(245,158,11,0.3)", borderColor: "rgba(245,158,11,0.5)" }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] pointer-events-none mix-blend-overlay" />
          
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 className="text-3xl md:text-4xl font-black text-amber-300 tracking-wider">
                {t('hub.ludo_title')}
              </h2>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-mono font-bold whitespace-nowrap flex-shrink-0">
                {t('hub.ludo_tag')}
              </span>
            </div>
            <p className="text-gray-300 text-sm mb-8 leading-relaxed">
              {t('hub.ludo_desc')}
            </p>
          </div>
          
          <div className="relative z-10 space-y-5">
            <motion.button 
              onClick={createLudoRoom} 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black tracking-widest uppercase rounded-xl overflow-hidden group shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-300 relative transition-all cursor-pointer text-sm"
            >
              <span className="relative z-10">{t('hub.ludo_create')}</span>
              <div className="absolute inset-0 h-full w-0 bg-white/20 transition-all duration-500 ease-out group-hover:w-full" />
            </motion.button>
            
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-amber-900/50" />
              <span className="flex-shrink-0 mx-3 text-amber-400/60 font-bold font-mono text-[11px] uppercase tracking-widest">
                {t('hub.or_enter_code')}
              </span>
              <div className="flex-grow border-t border-amber-900/50" />
            </div>

            <form onSubmit={joinLudoRoom} className="flex gap-2 relative group">
              <input 
                type="text" 
                placeholder={t('hub.enter_code_placeholder')} 
                maxLength={4}
                value={ludoCode}
                onChange={(e) => setLudoCode(e.target.value)}
                className="w-full bg-black/80 border-2 border-amber-900/40 text-center uppercase text-xl font-black rounded-xl p-3.5 focus:outline-none focus:border-amber-400 transition-all placeholder:text-gray-700 font-mono text-amber-400"
              />
              <motion.button 
                type="submit" 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black tracking-wider transition-all shadow-md text-sm cursor-pointer"
              >
                {t('hub.join_btn')}
              </motion.button>
            </form>
          </div>
        </motion.div>

      </main>
    </div>
  );
}