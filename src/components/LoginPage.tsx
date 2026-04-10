import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  Chrome,
  CloudRain,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  updateProfile
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface LoginPageProps {
  theme: 'light' | 'dark';
}

export const LoginPage: React.FC<LoginPageProps> = ({ theme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const glassClass = theme === 'dark' ? 'glass-dark' : 'glass-light';
  const textClass = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const subTextClass = theme === 'dark' ? 'text-white/60' : 'text-slate-600';
  const borderClass = theme === 'dark' ? 'border-white/10' : 'border-slate-200';

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError(err.message);
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
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(userCredential.user, { displayName: name });
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br ${theme === 'dark' ? 'from-slate-900 via-blue-900 to-slate-900' : 'from-blue-50 via-indigo-50 to-white'}`}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`w-full max-w-md ${glassClass} rounded-[3rem] p-8 sm:p-10 shadow-2xl border ${borderClass} relative overflow-hidden`}
      >
        {/* Background decorative elements */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.5, 1],
            rotate: [0, -90, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" 
        />

        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className={`p-4 ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-900/5'} rounded-3xl mb-4 shadow-lg`}>
            <CloudRain className={`${theme === 'dark' ? 'text-white' : 'text-slate-800'} w-10 h-10`} />
          </div>
          <h1 className={`text-3xl font-bold ${textClass} tracking-tight mb-2`}>GODY SkyPredict</h1>
          <p className={`${subTextClass} text-center font-medium`}>
            {isLogin ? 'Welcome back! Please login to continue.' : 'Create an account to start predicting.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative"
              >
                <UserIcon className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${subTextClass}`} />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} border ${borderClass} py-4 pl-12 pr-4 rounded-2xl ${textClass} focus:outline-none focus:ring-2 ring-blue-500/50 transition-all`}
                  required={!isLogin}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${subTextClass}`} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} border ${borderClass} py-4 pl-12 pr-4 rounded-2xl ${textClass} focus:outline-none focus:ring-2 ring-blue-500/50 transition-all`}
              required
            />
          </div>

          <div className="relative">
            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${subTextClass}`} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-900/5'} border ${borderClass} py-4 pl-12 pr-4 rounded-2xl ${textClass} focus:outline-none focus:ring-2 ring-blue-500/50 transition-all`}
              required
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] ${
              theme === 'dark' ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'
            } disabled:opacity-50 disabled:hover:scale-100`}
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? 'Login' : 'Create Account'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-900/10'}`} />
            <span className={`${subTextClass} text-xs font-bold uppercase tracking-widest`}>Or continue with</span>
            <div className={`flex-1 h-px ${theme === 'dark' ? 'bg-white/10' : 'bg-slate-900/10'}`} />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all border ${borderClass} ${
              theme === 'dark' ? 'bg-white/5 text-white hover:bg-white/10' : 'bg-white text-slate-900 hover:bg-slate-50 shadow-sm'
            } disabled:opacity-50`}
          >
            <Chrome className="w-5 h-5" />
            Sign in with Google
          </button>
        </div>

        <div className="mt-10 text-center relative z-10 space-y-4">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className={`${subTextClass} text-sm font-semibold hover:underline transition-all block w-full`}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
          </button>
          
          <div className="pt-4 border-t border-white/5">
            <p className={`${theme === 'dark' ? 'text-white/20' : 'text-slate-300'} text-[10px] font-bold uppercase tracking-[0.3em]`}>
              G-TECHNOLOGIES
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
