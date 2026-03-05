import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn, UserPlus, Github, KeyRound, ArrowLeft } from 'lucide-react';
import { auth, githubProvider, microsoftProvider } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  sendPasswordResetEmail,
  getMultiFactorResolver,
  TotpMultiFactorGenerator
} from 'firebase/auth';
import { getFirebaseErrorMessage } from '../lib/firebaseErrors';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [mfaResolver, setMfaResolver] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setIsLogin(true);
    setIsResetPassword(false);
    setMfaResolver(null);
    setMfaCode('');
    setEmail('');
    setPassword('');
    setError(null);
    setSuccessMsg(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGithubLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, githubProvider);
      handleClose();
    } catch (err: any) {
      if (err.code === 'auth/multi-factor-auth-required') {
        setMfaResolver(getMultiFactorResolver(auth, err));
      } else {
        setError(getFirebaseErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, microsoftProvider);
      handleClose();
    } catch (err: any) {
      if (err.code === 'auth/multi-factor-auth-required') {
        setMfaResolver(getMultiFactorResolver(auth, err));
      } else {
        setError(getFirebaseErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Lütfen e-posta adresinizi girin.');
      return;
    }
    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode || !mfaResolver) return;
    
    setError(null);
    setLoading(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(
        mfaResolver.hints[0].uid,
        mfaCode
      );
      await mfaResolver.resolveSignIn(assertion);
      handleClose();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      handleClose();
    } catch (err: any) {
      if (err.code === 'auth/multi-factor-auth-required') {
        setMfaResolver(getMultiFactorResolver(auth, err));
      } else {
        setError(getFirebaseErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-sage-400 hover:text-sage-600 hover:bg-sage-50 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-8">
              {mfaResolver ? (
                <>
                  <button onClick={() => setMfaResolver(null)} className="mb-4 text-sage-500 hover:text-sage-700 flex items-center gap-1 text-sm font-medium">
                    <ArrowLeft size={16} /> Geri
                  </button>
                  <h2 className="text-2xl font-bold text-sage-800 mb-2">İki Faktörlü Doğrulama</h2>
                  <p className="text-sage-500 mb-6 text-sm">
                    Lütfen Authenticator uygulamanızdaki 6 haneli kodu girin.
                  </p>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleMfaSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-sage-700 mb-1">Doğrulama Kodu</label>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                          type="text"
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value)}
                          required
                          maxLength={6}
                          className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 transition-all text-center tracking-widest text-lg font-mono"
                          placeholder="000000"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-sage-600 hover:bg-sage-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-6"
                    >
                      {loading ? <span className="animate-pulse">Doğrulanıyor...</span> : 'Doğrula'}
                    </button>
                  </form>
                </>
              ) : isResetPassword ? (
                <>
                  <button onClick={() => { setIsResetPassword(false); setError(null); setSuccessMsg(null); }} className="mb-4 text-sage-500 hover:text-sage-700 flex items-center gap-1 text-sm font-medium">
                    <ArrowLeft size={16} /> Geri
                  </button>
                  <h2 className="text-2xl font-bold text-sage-800 mb-2">Şifremi Unuttum</h2>
                  <p className="text-sage-500 mb-6 text-sm">
                    E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
                  </p>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">
                      {error}
                    </div>
                  )}
                  {successMsg && (
                    <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm mb-4">
                      {successMsg}
                    </div>
                  )}

                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-sage-700 mb-1">E-posta</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 transition-all"
                          placeholder="ornek@email.com"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-sage-600 hover:bg-sage-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-6"
                    >
                      {loading ? <span className="animate-pulse">Gönderiliyor...</span> : 'Bağlantı Gönder'}
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-sage-800 mb-2">
                    {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                  </h2>
                  <p className="text-sage-500 mb-6 text-sm">
                    {isLogin 
                      ? 'Verilerinizi eşitlemek için giriş yapın.' 
                      : 'Cihazlar arası eşitleme için hesap oluşturun.'}
                  </p>

                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-sage-700 mb-1">E-posta</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 transition-all"
                          placeholder="ornek@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-semibold text-sage-700">Şifre</label>
                        {isLogin && (
                          <button 
                            type="button"
                            onClick={() => { setIsResetPassword(true); setError(null); setSuccessMsg(null); }}
                            className="text-xs text-sage-500 hover:text-sage-700 font-medium"
                          >
                            Şifremi Unuttum
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-sage-50 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-sage-600 hover:bg-sage-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 mt-6"
                    >
                      {loading ? (
                        <span className="animate-pulse">Bekleniyor...</span>
                      ) : isLogin ? (
                        <><LogIn size={18} /> Giriş Yap</>
                      ) : (
                        <><UserPlus size={18} /> Kayıt Ol</>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 flex flex-col gap-3">
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-sage-200"></div>
                      <span className="flex-shrink-0 mx-4 text-sage-400 text-sm">veya</span>
                      <div className="flex-grow border-t border-sage-200"></div>
                    </div>

                    <button
                      onClick={handleGithubLogin}
                      disabled={loading}
                      className="w-full bg-[#24292e] hover:bg-[#2f363d] text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Github size={18} /> GitHub ile Devam Et
                    </button>

                    <button
                      onClick={handleMicrosoftLogin}
                      disabled={loading}
                      className="w-full bg-white border border-sage-200 hover:bg-sage-50 text-sage-800 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 21 21">
                        <path fill="#f25022" d="M1 1h9v9H1z"/>
                        <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                        <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                        <path fill="#ffb900" d="M11 11h9v9h-9z"/>
                      </svg>
                      Microsoft ile Devam Et
                    </button>
                  </div>

                  <div className="mt-6 text-center">
                    <button
                      onClick={() => {
                        setIsLogin(!isLogin);
                        setError(null);
                      }}
                      className="text-sage-600 text-sm font-semibold hover:underline"
                    >
                      {isLogin ? 'Hesabınız yok mu? Kayıt olun.' : 'Zaten hesabınız var mı? Giriş yapın.'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
