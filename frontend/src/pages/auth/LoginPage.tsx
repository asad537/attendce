import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getErrorMessage } from '../../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]   = useState(false);

  // If already logged in redirect
  React.useEffect(() => {
    if (user) navigate(getDashboardPath(user.role), { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      // Navigation handled by useEffect above
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row w-full bg-[#020617] lg:bg-white relative overflow-hidden">
      
      {/* Mobile Top Section (Hidden on Desktop) */}
      <div className="flex lg:hidden flex-col items-center pt-12 pb-4 px-6 relative z-10 overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full border border-slate-800/50 opacity-20 z-0"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full border border-slate-800/50 opacity-30 z-0"></div>

        {/* Logo */}
        <div className="relative z-10 inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl mb-4 shadow-lg shadow-emerald-500/30">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        
        <h1 className="relative z-10 text-3xl font-bold text-white mb-2 tracking-tight">HR <span className="text-white">System</span></h1>
        
        {/* Blue horizontal dash under HR System */}
        <div className="relative z-10 w-8 h-1 bg-emerald-600 rounded-full mb-4"></div>

        <p className="relative z-10 text-slate-300 text-sm text-center mb-2 px-4">Smart employee management<br/>made simple, secure and efficient.</p>
        
        {/* Illustration */}
        <div className="relative z-10 w-full max-w-[320px] mt-4 mb-[-3rem] pointer-events-none">
           <img src="/assets/illustration.jpg" alt="Dashboard Illustration" className="w-full h-auto mix-blend-screen opacity-90" style={{ maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0))', WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 80%, rgba(0,0,0,0))' }} />
        </div>
      </div>

      {/* Desktop Left Panel - Hidden on Mobile */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 bg-[#020617] relative flex-col justify-between overflow-hidden">
        {/* Background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] rounded-full border border-slate-800/50 opacity-20"></div>
          <div className="absolute top-[-10%] right-[-5%] w-[60%] h-[60%] rounded-full border border-slate-800/50 opacity-30"></div>
          <div className="absolute top-0 right-0 w-[40%] h-[40%] rounded-full border border-slate-800/50 opacity-40"></div>
        </div>
        
        {/* Content Container */}
        <div className="relative z-10 flex flex-col p-12 xl:p-16 h-full">
          {/* Logo & Header */}
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl mb-6 shadow-lg shadow-emerald-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 tracking-tight">HR <span className="text-white">System</span></h1>
            <p className="text-slate-400 text-lg max-w-sm">Smart employee management made simple, secure and efficient.</p>
          </div>

          {/* Features */}
          <div className="space-y-6 mb-12 flex-1">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700/50 mr-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Secure & Reliable</h3>
                <p className="text-slate-400 text-sm">Your data is protected with enterprise-grade security.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700/50 mr-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Real-time Sync</h3>
                <p className="text-slate-400 text-sm">Stay updated instantly across all devices.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center border border-slate-700/50 mr-4">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Role Based Access</h3>
                <p className="text-slate-400 text-sm">Access what you need, nothing you don't.</p>
              </div>
            </div>
          </div>
          
          {/* Quote */}
          <div className="mt-auto bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl backdrop-blur-sm z-10 relative">
            <svg className="w-8 h-8 text-emerald-500/50 mb-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
            </svg>
            <p className="text-slate-300 font-medium leading-relaxed">
              Empowering organizations by simplifying attendance, leave and employee management.
            </p>
          </div>
        </div>

        {/* Floating illustration absolute positioned to the right of the left panel */}
        <div className="absolute right-[-10%] top-[30%] xl:right-[-5%] xl:top-[25%] w-[400px] xl:w-[500px] pointer-events-none z-0 opacity-90">
           <img src="/assets/illustration.jpg" alt="Dashboard Illustration" className="w-full h-auto rounded-xl shadow-2xl mix-blend-screen mask-image-gradient" style={{ maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0))', WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 50%, rgba(0,0,0,0))' }} />
        </div>
      </div>

      {/* Right Panel (Form area) - Bottom card on mobile */}
      <div className="w-full lg:w-[55%] xl:w-1/2 flex flex-col justify-center relative z-20 flex-1 bg-white lg:bg-[#F8FAFC] rounded-t-[32px] lg:rounded-none px-6 pt-10 pb-8 lg:p-0 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] lg:shadow-none">
        
        {/* Desktop Footer info fixed bottom */}
        <div className="hidden lg:flex absolute bottom-6 left-0 right-0 justify-center items-center text-slate-400 text-sm">
           <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            © 2025 HR System. All rights reserved.
        </div>

        <div className="w-full max-w-md mx-auto lg:px-12 lg:py-12 bg-white rounded-2xl lg:bg-transparent lg:rounded-none lg:shadow-none z-10 relative">
          
          {/* Desktop Logo (center aligned in the form area) */}
          <div className="hidden lg:flex justify-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg shadow-emerald-500/30">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>

          <div className="text-center mb-8 lg:mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">Welcome <span className="text-emerald-600">back</span></h2>
            <p className="text-slate-500 text-sm lg:text-base">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 text-left">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-emerald-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white outline-none text-slate-700 text-sm lg:text-base"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 text-left">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full pl-11 pr-10 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-white outline-none text-slate-700 text-sm lg:text-base"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3 lg:mt-4">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs lg:text-sm text-slate-600">
                  Remember me
                </label>
              </div>
            </div>

            <button type="submit" className="w-full flex justify-center items-center py-3 lg:py-3.5 px-4 border border-transparent rounded-xl shadow-md shadow-emerald-500/20 text-sm lg:text-base font-semibold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all mt-6" disabled={loading}>
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <svg className="ml-2 -mr-1 w-4 h-4 lg:w-5 lg:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* OR Divider */}
          <div className="mt-6 lg:mt-8 relative">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-100 lg:border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs lg:text-sm">
              <span className="px-3 bg-white text-slate-400 font-medium tracking-widest uppercase">
                OR
              </span>
            </div>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 lg:mt-8 bg-white border border-slate-100 lg:border-slate-200 rounded-xl p-4 lg:p-5 shadow-sm">
            <p className="text-xs text-slate-800 font-bold mb-3 lg:mb-4">Demo Accounts</p>
            <div className="grid grid-cols-1 gap-2 lg:gap-3">
              {[
                { label: 'Chief Executive Officer', email: 'ceo@jmdsol.com', password: 'password', iconText: 'CEO' },
              ].map((d) => (
                <button
                  key={d.email}
                  type="button"
                  onClick={() => { setEmail(d.email); setPassword(d.password); }}
                  className="w-full flex items-center justify-between p-2.5 lg:p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors group text-left"
                >
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
                      <svg className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-[13px] lg:text-sm font-semibold text-emerald-600 group-hover:text-emerald-700">{d.label}</div>
                      <div className="text-[11px] lg:text-xs text-slate-500">{d.email}</div>
                    </div>
                  </div>
                  <div className="text-slate-300 group-hover:text-emerald-400 transition-colors">
                    <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Footer (Hidden on Desktop) */}
      <div className="lg:hidden flex flex-col justify-center items-center text-slate-500 text-xs py-5 bg-[#020617] z-10 w-full relative">
         <div className="flex items-center justify-center mb-1">
           <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            © 2025 HR System.
         </div>
         <p>All rights reserved.</p>
      </div>

    </div>
  );
}

function getDashboardPath(role: string): string {
  if (role === 'ceo') return '/ceo';
  if (role === 'manager') return '/manager';
  if (role === 'tl') return '/tl';
  return '/employee';
}
