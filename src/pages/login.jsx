import React, { useState, useRef } from 'react';
import { Alert, message } from 'antd';
import { BarChart2, Radar, Wrench, User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import cogniIcon from '../assets/cog_white_logo.png';
import { login } from '../services/API_services';

// ─── Static data ──────────────────────────────────────────────────────────────

const PILLARS = [
  {
    Icon: BarChart2,
    label: 'Insights',
    desc:  'Fleet health, live telemetry, and predictive signals.',
  },
  {
    Icon: Radar,
    label: 'FinOps',
    desc:  'Token spend governance and cost optimisation.',
  },
  {
    Icon: Wrench,
    label: 'Workbench',
    desc:  'One-click recovery, runbooks, and self-healing .',
  },
];

// ─── Keyframes ────────────────────────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes vfo-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes vfo-form-in {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes vfo-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes vfo-shake {
    0%, 100% { transform: translateX(0);    }
    20%      { transform: translateX(-6px); }
    40%      { transform: translateX( 6px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX( 4px); }
  }
  @keyframes vfo-pillar-in {
    from { opacity: 0; transform: translateX(-10px); }
    to   { opacity: 1; transform: translateX(0);     }
  }
`;

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = ({ color = 'white' }) => (
  <svg width="15" height="15" viewBox="0 0 15 15" style={{ animation: 'vfo-spin 0.75s linear infinite', flexShrink: 0 }}>
    <circle cx="7.5" cy="7.5" r="5.5" stroke={color === 'white' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,72,0.15)'} strokeWidth="2" fill="none" />
    <path d="M7.5 2 A5.5 5.5 0 0 1 13 7.5" stroke={color === 'white' ? '#ffffff' : '#000048'} strokeWidth="2" fill="none" strokeLinecap="round" />
  </svg>
);

// ─── Custom input ─────────────────────────────────────────────────────────────

const FormInput = ({ label, id, type = 'text', value, onChange, placeholder, icon: Icon, error, rightSlot }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{
        display: 'block', marginBottom: 5,
        fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
        textTransform: 'uppercase', color: '#64748B',
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: error ? '#F04438' : focused ? '#00B5E2' : '#94A3B8',
          pointerEvents: 'none', display: 'flex',
          transition: 'color 0.15s',
        }}>
          <Icon size={14} strokeWidth={1.5} />
        </span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={id}
          style={{
            width: '100%', padding: '10px 38px 10px 36px',
            fontSize: 13, color: '#0F172A', background: '#F8FAFC',
            border: `1.5px solid ${error ? '#F04438' : focused ? '#00B5E2' : '#E2E8F0'}`,
            borderRadius: 8, outline: 'none', fontFamily: 'inherit',
            boxShadow: focused
              ? (error ? '0 0 0 3px rgba(240,68,56,0.10)' : '0 0 0 3px rgba(0,181,226,0.12)')
              : 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        />
        {rightSlot && (
          <span style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
            {rightSlot}
          </span>
        )}
      </div>
    </div>
  );
};

// ─── Left panel ──────────────────────────────────────────────────────────────

const LeftPanel = () => (
  <div
    className="hidden lg:flex lg:w-[58%] flex-col justify-center"
    style={{
      padding: '52px 56px',
      position: 'relative', overflow: 'hidden',
      background: `
        radial-gradient(ellipse at 10% 65%, rgba(0,181,226,0.12) 0%, transparent 50%),
        radial-gradient(ellipse at 88% 12%, rgba(0,0,100,0.55) 0%, transparent 48%),
        #000048
      `,
    }}
  >
    {/* Grid overlay */}
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: `
        linear-gradient(rgba(255,255,255,0.026) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.026) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
    }} />

    {/* Circuit accent dots at grid intersections */}
    <div aria-hidden="true" style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      backgroundImage: 'radial-gradient(circle, rgba(0,181,226,0.18) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
      backgroundPosition: '-1px -1px',
    }} />

    {/* Cyan glow orb */}
    <div aria-hidden="true" style={{
      position: 'absolute', bottom: '12%', right: '-60px',
      width: 360, height: 360, borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(0,181,226,0.11) 0%, transparent 70%)',
      pointerEvents: 'none',
    }} />

    {/* Top: logo + brand */}
    <div style={{ position: 'relative', animation: 'vfo-fade-up 0.6s ease-out both' }}>
      {/* Cognizant lockup */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
        <img src={cogniIcon} alt="Cognizant" style={{ height: 30, width: 30, objectFit: 'contain' }} />
        <span style={{ color: 'rgba(255,255,255,0.50)', fontSize: 12, fontWeight: 500, letterSpacing: '0.06em' }}>
          Cognizant
        </span>
      </div>

      {/* Product name */}
      <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#00B5E2' }}>
        Enterprise AI Agent Operations
      </p>
      <h1 style={{ margin: '0 0 6px', fontSize: 40, fontWeight: 900, color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.025em' }}>
        VeriForge
        <span style={{ color: '#00B5E2', fontWeight: 300, marginLeft: 8 }}>Ops</span>
      </h1>
      <p style={{ margin: '0 0 44px', fontSize: 14, color: 'rgba(203,213,225,0.60)', lineHeight: 1.7, maxWidth: 420 }}>
        The sovereign control tower for your AI agent fleet — closing the
        observe&thinsp;→&thinsp;govern&thinsp;→&thinsp;act loop before issues become incidents.
      </p>

      {/* 3-Pillar capabilities list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PILLARS.map(({ Icon, label, desc }, i) => (
          <div
            key={label}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 14,
              animation: `vfo-pillar-in 0.5s ${0.15 + i * 0.12}s ease-out both`,
            }}
          >
            {/* Ghost icon chip */}
            <div style={{
              flexShrink: 0,
              width: 34, height: 34,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
              background: 'rgba(0,181,226,0.10)',
              border: '1px solid rgba(0,181,226,0.22)',
            }}>
              <Icon size={15} strokeWidth={1.5} style={{ color: '#00B5E2' }} />
            </div>
            <div>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.90)' }}>{label}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(148,163,184,0.70)', lineHeight: 1.5 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

  </div>
);

// ─── Login page ───────────────────────────────────────────────────────────────

const Login = ({ onLoginSuccess }) => {
  const [username,   setUsername]  = useState('');
  const [password,   setPassword]  = useState('');
  const [showPass,   setShowPass]  = useState(false);
  const [loading,    setLoading]   = useState(false);
  const [errors,     setErrors]    = useState({});
  const [authError,  setAuthError] = useState('');
  const [shake,      setShake]     = useState(false);
  const formRef = useRef(null);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const validate = () => {
    const e = {};
    if (!username.trim()) e.username = 'Username is required';
    if (!password)        e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); triggerShake(); return; }
    setErrors({}); setAuthError('');
    setLoading(true);
    const msgKey = 'vfo-login';
    message.loading({ content: 'Validating identity…', key: msgKey, duration: 0 });
    try {
      const res = await login(username.trim(), password);
      sessionStorage.setItem('access_token', res.access_token);
      sessionStorage.setItem('role',         res.role);
      localStorage.setItem('username',       res.username);
      message.success({ content: `Welcome, ${res.username}`, key: msgKey, duration: 2 });
      onLoginSuccess();
    } catch (err) {
      message.destroy(msgKey);
      const msg = err.message || 'Invalid credentials. Please try again.';
      setAuthError(msg);
      setErrors({ password: ' ' });
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const busy = loading;

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div style={{ display: 'flex', height: '100vh', background: '#ffffff' }}>
        <LeftPanel />

        {/* ── Right: form panel ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px', background: '#ffffff', overflowY: 'auto',
        }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8,
              background: '#000048',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={cogniIcon} alt="Cognizant" style={{ height: 20, width: 20, objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#000048', letterSpacing: '-0.01em' }}>
              VeriForge<span style={{ color: '#00B5E2', fontWeight: 300 }}> Ops</span>
            </span>
          </div>

          {/* Form card */}
          <div
            ref={formRef}
            style={{
              width: '100%', maxWidth: 420,
              background: '#ffffff',
              border: '1px solid #E2E8F0',
              borderRadius: 16,
              padding: '40px 36px 32px',
              boxShadow: '0 4px 32px rgba(0,0,72,0.07), 0 1px 4px rgba(0,0,0,0.04)',
              animation: shake
                ? 'vfo-shake 0.45s ease-out'
                : 'vfo-form-in 0.45s ease-out both',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 26 }}>
              <h2 style={{ margin: '0 0 5px', fontSize: 22, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.015em' }}>
                Welcome back
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>
                Sign in to your VeriForge Ops workspace
              </p>
            </div>

            {/* Error alert */}
            {authError && (
              <Alert
                type="error"
                message={authError}
                showIcon
                style={{ marginBottom: 18, fontSize: 12, borderRadius: 8 }}
                closable
                onClose={() => setAuthError('')}
              />
            )}

            <form onSubmit={handleSubmit} noValidate>
              <FormInput
                id="username"
                label="Username"
                value={username}
                onChange={e => { setUsername(e.target.value); setErrors(v => ({ ...v, username: '' })); setAuthError(''); }}
                placeholder="you@company.ai"
                icon={User}
                error={errors.username}
              />

              <FormInput
                id="current-password"
                label="Password"
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })); setAuthError(''); }}
                placeholder="Enter your password"
                icon={Lock}
                error={errors.password === ' ' ? undefined : errors.password}
                rightSlot={
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', padding: 0, display: 'flex', outline: 'none' }}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                  </button>
                }
              />

              {/* Primary CTA — Cyan */}
              <button
                type="submit"
                disabled={busy}
                style={{
                  width: '100%', marginTop: 6, marginBottom: 12,
                  padding: '11px 20px',
                  background: busy ? '#33c8e8' : '#00B5E2',
                  color: '#ffffff',
                  border: 'none', borderRadius: 8,
                  fontSize: 14, fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.18s, box-shadow 0.18s',
                  fontFamily: 'inherit', outline: 'none',
                  boxShadow: '0 1px 4px rgba(0,181,226,0.35)',
                }}
                onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = '#009cc4'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,181,226,0.38)'; }}}
                onMouseLeave={e => { if (!busy) { e.currentTarget.style.background = '#00B5E2'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,181,226,0.35)'; }}}
              >
                {loading
                  ? <><Spinner /><span>Validating Identity…</span></>
                  : <><span>Sign In</span><ArrowRight size={14} strokeWidth={2} /></>
                }
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
