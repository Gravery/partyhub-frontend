import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { LanguageSelector } from '../components/LanguageSelector';
import { Gamepad2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export function Auth() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: 'error' | 'success' } | null>(null);
  const { signIn, signUp } = useAuthStore();

  // fetch rejeita com TypeError quando o backend está fora do ar; o Supabase responde em inglês
  const authErrorText = (err: any): string => {
    const msg: string = err?.message || '';
    if (err instanceof TypeError) return t('auth.server_offline');
    if (/invalid login credentials/i.test(msg)) return t('auth.invalid_credentials');
    if (/email not confirmed/i.test(msg)) return t('auth.email_not_confirmed');
    if (/already registered/i.test(msg)) return t('auth.already_registered');
    return msg || t('auth.auth_failed');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, username || email.split('@')[0]);
        setMessage({ text: t('auth.register_success'), tone: 'success' });
        setIsLogin(true);
      }
    } catch (err: any) {
      setMessage({ text: authErrorText(err), tone: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="accent-brand relative min-h-[100dvh] flex items-center justify-center bg-ground text-body p-4 bg-[radial-gradient(ellipse_at_top,#2E1065_0%,transparent_60%)]">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-md surface p-6 md:p-10 shadow-2xl"
      >
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <span className="w-14 h-14 rounded-2xl bg-[#2E1065] text-violet-300 flex items-center justify-center" aria-hidden="true">
            <Gamepad2 size={28} />
          </span>
          <h1 className="font-display font-bold text-3xl md:text-4xl tracking-wide text-ink">PARTY HUB</h1>
          <p className="text-sm text-muted">{isLogin ? t('auth.subtitle') : t('auth.subtitle_signup')}</p>
        </div>

        <AnimatePresence>
          {message && (
            <motion.p
              role={message.tone === 'error' ? 'alert' : 'status'}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-6 flex items-start gap-2 p-3 rounded-xl border text-sm ${
                message.tone === 'error' ? 'bg-rose-950 border-rose-700 text-rose-100' : 'bg-emerald-950 border-emerald-700 text-emerald-100'
              }`}
            >
              {message.tone === 'error' ? <AlertCircle size={18} className="shrink-0" /> : <CheckCircle2 size={18} className="shrink-0" />}
              {message.text}
            </motion.p>
          )}
        </AnimatePresence>

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <label htmlFor="auth-username" className="text-sm font-bold text-ink">
                {t('auth.username')}
              </label>
              <input
                id="auth-username"
                type="text"
                autoComplete="nickname"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="field"
                placeholder={t('auth.username_placeholder')}
                required
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="auth-email" className="text-sm font-bold text-ink">
              {t('auth.email')}
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              placeholder={t('auth.email_placeholder')}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="auth-password" className="text-sm font-bold text-ink">
              {t('auth.password')}
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              placeholder={t('auth.password_placeholder')}
              required
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block mt-2">
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? t('common.loading') : isLogin ? t('auth.sign_in_btn') : t('auth.sign_up_btn')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isLogin ? t('auth.need_account') : t('auth.already_account')}{' '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage(null);
            }}
            className="font-bold text-violet-300 hover:text-violet-200 underline underline-offset-4 cursor-pointer"
          >
            {isLogin ? t('auth.go_sign_up') : t('auth.go_sign_in')}
          </button>
        </p>
      </motion.main>
    </div>
  );
}
