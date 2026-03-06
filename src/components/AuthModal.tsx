import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn, UserPlus, Github, ArrowLeft, Facebook } from 'lucide-react';
import { auth, githubProvider, microsoftProvider, facebookProvider, googleProvider } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup,
  sendPasswordResetEmail,
  signInAnonymously
} from 'firebase/auth';
import { getFirebaseErrorMessage } from '../lib/firebaseErrors';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isResetPassword, setIsResetPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setIsLogin(true);
    setIsResetPassword(false);
    setEmail('');
    setPassword('');
    setError(null);
    setSuccessMsg(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInAnonymously(auth);
      handleClose();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, githubProvider);
      handleClose();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
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
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      handleClose();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, facebookProvider);
      handleClose();
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
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
      const actionCodeSettings = {
        url: window.location.origin,
        handleCodeInApp: false,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setSuccessMsg('Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.');
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
      setError(getFirebaseErrorMessage(err));
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
            className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-sage-400 hover:text-sage-600 dark:text-gray-400 dark:hover:text-white hover:bg-sage-50 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              <X size={20} />
            </button>

            <div className="p-8">
              {isResetPassword ? (
                <>
                  <button onClick={() => { setIsResetPassword(false); setError(null); setSuccessMsg(null); }} className="mb-4 text-sage-500 dark:text-white hover:text-sage-700 dark:hover:text-white flex items-center gap-1 text-sm font-medium">
                    <ArrowLeft size={16} /> Geri
                  </button>
                  <h2 className="text-2xl font-bold text-sage-800 dark:text-white mb-2">Şifremi Unuttum</h2>
                  <p className="text-sage-500 dark:text-white/80 mb-6 text-sm">
                    E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
                  </p>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4">
                      {error}
                    </div>
                  )}
                  {successMsg && (
                    <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-3 rounded-xl text-sm mb-4">
                      {successMsg}
                    </div>
                  )}

                  <form onSubmit={handlePasswordReset} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-sage-700 dark:text-white mb-1">E-posta</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-sage-50 dark:bg-neutral-800 border border-sage-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 transition-all dark:text-white"
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
                  <h2 className="text-2xl font-bold text-sage-800 dark:text-white mb-2">
                    {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                  </h2>
                  <p className="text-sage-500 dark:text-white/80 mb-6 text-sm">
                    {isLogin 
                      ? 'Verilerinizi eşitlemek için giriş yapın.' 
                      : 'Cihazlar arası eşitleme için hesap oluşturun.'}
                  </p>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mb-4">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-sage-700 dark:text-white mb-1">E-posta</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" size={18} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-10 pr-4 py-3 bg-sage-50 dark:bg-neutral-800 border border-sage-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 transition-all dark:text-white"
                          placeholder="ornek@email.com"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-semibold text-sage-700 dark:text-white">Şifre</label>
                        {isLogin && (
                          <button 
                            type="button"
                            onClick={() => { setIsResetPassword(true); setError(null); setSuccessMsg(null); }}
                            className="text-xs text-sage-500 dark:text-white/60 hover:text-sage-700 dark:hover:text-white font-medium"
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
                          className="w-full pl-10 pr-4 py-3 bg-sage-50 dark:bg-neutral-800 border border-sage-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 transition-all dark:text-white"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-black hover:bg-neutral-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-black/10 active:scale-[0.98] flex items-center justify-center gap-2 mt-6 border border-neutral-800"
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

                  <div className="mt-4">
                    <button
                      onClick={handleGuestLogin}
                      disabled={loading}
                      className="w-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      Misafir Olarak Devam Et
                    </button>
                  </div>

                  <div className="mt-6 flex flex-col gap-3">
                    <div className="relative flex items-center py-2">
                      <div className="flex-grow border-t border-sage-200 dark:border-neutral-700"></div>
                      <span className="flex-shrink-0 mx-4 text-sage-400 text-sm">veya</span>
                      <div className="flex-grow border-t border-sage-200 dark:border-neutral-700"></div>
                    </div>

                    <button
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full bg-white dark:bg-neutral-800 border border-sage-200 dark:border-neutral-700 hover:bg-sage-50 dark:hover:bg-neutral-700 text-sage-800 dark:text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google ile Devam Et
                    </button>

                    <button
                      onClick={handleFacebookLogin}
                      disabled={loading}
                      className="w-full bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <Facebook size={18} /> Facebook ile Devam Et
                    </button>

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
                      className="w-full bg-white dark:bg-neutral-800 border border-sage-200 dark:border-neutral-700 hover:bg-sage-50 dark:hover:bg-neutral-700 text-sage-800 dark:text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
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
                      className="text-sage-600 dark:text-white/80 text-sm font-semibold hover:underline"
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
