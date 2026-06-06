import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  PiggyBank, Home, CreditCard, Target, Bell, TrendingUp, Plus, Trash2,
  LogOut, AlertCircle, Edit2, X, PieChart, DollarSign, ShoppingBag,
  TrendingDown, LineChart, Zap, Clock, Lightbulb, Calendar as CalendarIcon,
  Moon, Sun, Settings, User, Globe, Palette, Save, CheckCircle,
  ChevronRight, Shield, Smartphone
} from 'lucide-react';
import './App.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const THEMES = {
  dark:    { label: 'Dark',        icon: '🌙', class: 'theme-dark'    },
  light:   { label: 'Light',       icon: '☀️',  class: 'theme-light'   },
  ocean:   { label: 'Ocean',       icon: '🌊', class: 'theme-ocean'   },
  forest:  { label: 'Forest',      icon: '🌿', class: 'theme-forest'  },
  sunset:  { label: 'Sunset',      icon: '🌅', class: 'theme-sunset'  },
  midnight:{ label: 'Midnight',    icon: '🔮', class: 'theme-midnight' },
};

const CURRENCIES = {
  USD: { symbol: '$',  label: 'US Dollar'       },
  EUR: { symbol: '€',  label: 'Euro'            },
  GBP: { symbol: '£',  label: 'British Pound'   },
  JMD: { symbol: 'J$', label: 'Jamaican Dollar' },
  CAD: { symbol: 'C$', label: 'Canadian Dollar' },
  AUD: { symbol: 'A$', label: 'Australian Dollar'},
  INR: { symbol: '₹',  label: 'Indian Rupee'    },
  NGN: { symbol: '₦',  label: 'Nigerian Naira'  },
  ZAR: { symbol: 'R',  label: 'South African Rand'},
  BRL: { symbol: 'R$', label: 'Brazilian Real'  },
};

const EXPENSE_CATEGORIES = ['Essentials','Lifestyle','Shopping','Transportation','Healthcare','Subscriptions','Entertainment','Miscellaneous'];

const CATEGORY_COLORS = {
  Essentials: '#FF69B4', Lifestyle: '#4A90E2', Shopping: '#9B59B6',
  Transportation: '#50C878', Healthcare: '#FFA500', Miscellaneous: '#FF6B6B',
  Subscriptions: '#00C851', Entertainment: '#FFD700',
};

// ─── API Setup ────────────────────────────────────────────────────────────────

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL ||
                                    'http://localhost:5000/api' 
                                  });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Utility ──────────────────────────────────────────────────────────────────

function fmt(amount, currency = 'USD') {
  const sym = CURRENCIES[currency]?.symbol || '$';
  return `${sym}${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressRing({ percentage, size = 80, strokeWidth = 6, color = '#50C878' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;
  return (
    <svg width={size} height={size}>
      <circle stroke="var(--card-border)" fill="none" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth} />
      <circle stroke={color} fill="none" cx={size/2} cy={size/2} r={radius} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" textAnchor="middle" dy="0.3em" fill="var(--text-primary)" fontSize={size * 0.18} fontWeight="bold">
        {Math.round(percentage)}%
      </text>
    </svg>
  );
}

function InsightCard({ icon, title, value, recommendation }) {
  return (
    <div className="insight-card">
      <div className="insight-icon">{icon}</div>
      <div className="insight-content">
        <h4>{title}</h4>
        <div className="insight-value">{value}</div>
        {recommendation && (
          <div className="insight-recommendation">
            <Lightbulb size={13} /> {recommendation}
          </div>
        )}
      </div>
    </div>
  );
}

function EditModal({ isOpen, item, onSave, onClose, type }) {
  const [editedItem, setEditedItem] = useState(item);
  useEffect(() => setEditedItem(item), [item]);
  if (!isOpen || !editedItem) return null;
  const skipKeys = new Set(['id','user_id','created_at','updated_at']);
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>Edit {type}</h3>
          <button onClick={onClose} className="close-modal"><X size={20} /></button>
        </div>
        <div className="modal-body">
          {Object.keys(editedItem).map(key => {
            if (skipKeys.has(key)) return null;
            return (
              <div key={key} className="modal-field">
                <label>{key.replace(/_/g,' ').toUpperCase()}</label>
                <input
                  type={typeof editedItem[key] === 'number' ? 'number' : 'text'}
                  value={editedItem[key] ?? ''}
                  onChange={(e) => setEditedItem({...editedItem, [key]: e.target.value})}
                />
              </div>
            );
          })}
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button onClick={() => onSave(editedItem)} className="save-btn"><Save size={16}/> Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast-${type}`}>
      {type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
      {message}
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onLogin(username, password, email, isRegister);
    setLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-bg-orb orb1" />
      <div className="login-bg-orb orb2" />
      <div className="login-card">
        <div className="login-brand">
          <PiggyBank size={48} className="brand-icon" />
          <h1>BudgetApp</h1>
          <p>Track expenses · Crush debt · Achieve goals</p>
        </div>
        <div className="login-form">
          <input
            type="text" placeholder="Username"
            value={username} onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {isRegister && (
            <input
              type="email" placeholder="Email address"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          )}
          <input
            type="password" placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button className="login-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Loading…' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
          <button className="switch-auth" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
        <div className="login-features">
          <span>🔒 Secure</span>
          <span>📱 Installable</span>
          <span>🌍 Multi-currency</span>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ user, theme, setTheme, currency, setCurrency, onSaveProfile }) {
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await onSaveProfile({ username, email, currentPassword: currentPwd, newPassword: newPwd });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setCurrentPwd(''); setNewPwd('');
  };

  return (
    <div className="settings-tab">
      <h1>Settings</h1>

      {/* Profile */}
      <div className="settings-section">
        <div className="settings-section-header">
          <User size={20}/> Profile
        </div>
        <div className="settings-grid">
          <div className="settings-field">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="settings-field">
            <label>Current Password</label>
            <input type="password" placeholder="Leave blank to keep" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
          </div>
          <div className="settings-field">
            <label>New Password</label>
            <input type="password" placeholder="Leave blank to keep" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
          </div>
        </div>
        <button className="settings-save-btn" onClick={handleSave}>
          {saved ? <><CheckCircle size={16}/> Saved!</> : <><Save size={16}/> Save Profile</>}
        </button>
      </div>

      {/* Theme */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Palette size={20}/> Appearance
        </div>
        <div className="theme-grid">
          {Object.entries(THEMES).map(([key, t]) => (
            <button
              key={key}
              className={`theme-option ${theme === key ? 'active' : ''}`}
              onClick={() => setTheme(key)}
            >
              <span className="theme-emoji">{t.icon}</span>
              <span>{t.label}</span>
              {theme === key && <CheckCircle size={14} className="theme-check"/>}
            </button>
          ))}
        </div>
      </div>

      {/* Currency */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Globe size={20}/> Currency
        </div>
        <div className="currency-grid">
          {Object.entries(CURRENCIES).map(([code, c]) => (
            <button
              key={code}
              className={`currency-option ${currency === code ? 'active' : ''}`}
              onClick={() => setCurrency(code)}
            >
              <span className="currency-symbol">{c.symbol}</span>
              <div>
                <div className="currency-code">{code}</div>
                <div className="currency-label">{c.label}</div>
              </div>
              {currency === code && <CheckCircle size={14} className="currency-check"/>}
            </button>
          ))}
        </div>
      </div>

      {/* PWA Install */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Smartphone size={20}/> Install as App
        </div>
        <div className="pwa-instructions">
          <div className="pwa-step">
            <div className="pwa-step-num">1</div>
            <div><strong>Android/Chrome:</strong> Tap the browser menu (⋮) → "Add to Home screen" or look for the install prompt in the address bar.</div>
          </div>
          <div className="pwa-step">
            <div className="pwa-step-num">2</div>
            <div><strong>iPhone/Safari:</strong> Tap the Share button (□↑) → "Add to Home Screen".</div>
          </div>
          <div className="pwa-step">
            <div className="pwa-step-num">3</div>
            <div><strong>Desktop:</strong> Look for the install icon (⊕) in the address bar in Chrome/Edge.</div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="settings-section">
        <div className="settings-section-header">
          <Shield size={20}/> About
        </div>
        <div className="about-info">
          <div>BudgetApp v2.0 · Your data stays on your device</div>
          <div>Supports 10 currencies · 6 themes · PWA installable</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function MainApp() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'USD');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [debts, setDebts] = useState([]);
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [investments, setInvestments] = useState([]);

  const [editingItem, setEditingItem] = useState(null);
  const [editType, setEditType] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const [expenseFilter, setExpenseFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [newExpense, setNewExpense] = useState({ name:'', amount:'', category:'Essentials', date:new Date().toISOString().split('T')[0], is_miscellaneous:false, notes:'' });
  const [newDebt, setNewDebt]   = useState({ name:'', balance:'', interest_rate:'', minimum_payment:'', is_salary_deduction:false, has_interest:true, frequency:'monthly' });
  const [newBill, setNewBill]   = useState({ name:'', amount:'', due_date:'', recurring:'monthly', category:'' });
  const [newGoal, setNewGoal]   = useState({ name:'', target_amount:'', target_date:'', category:'' });
  const [newInv,  setNewInv]    = useState({ name:'', type:'stocks', amount:0, current_value:0, purchase_date:'' });

  // Apply theme
  useEffect(() => {
    document.body.className = THEMES[theme]?.class || 'theme-dark';
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Save currency preference
  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      loadAllData();
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const loadAllData = useCallback(async () => {
    try {
      const [settings, expRes, debtRes, billRes, goalRes, invRes] = await Promise.all([
        API.get('/settings'),
        API.get('/expenses'),
        API.get('/debts'),
        API.get('/bills'),
        API.get('/savings-goals'),
        API.get('/investments'),
      ]);
      setIncome(settings.data.monthly_income || 0);
      setExpenses(expRes.data || []);
      setDebts(debtRes.data || []);
      setBills(billRes.data || []);
      setGoals(goalRes.data || []);
      setInvestments(invRes.data || []);
    } catch (err) {
      console.error('Load error:', err);
    }
  }, []);

  // Smart notifications
  useEffect(() => {
    const notifs = [];
    const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
    const savingsRate = income > 0 ? ((income - totalExp) / income) * 100 : 0;
    if (savingsRate < 20 && income > 0) notifs.push({ id:1, type:'warning', message:`Savings rate ${savingsRate.toFixed(1)}% — aim for 20%+` });
    debts.filter(d => d.interest_rate > 15).forEach(d => notifs.push({ id:d.id+100, type:'alert', message:`High interest: ${d.name} at ${d.interest_rate}%` }));
    bills.filter(b => { const days = Math.ceil((new Date(b.due_date)-new Date())/(864e5)); return days<=7 && days>0 && !b.paid; })
         .forEach(b => { const days = Math.ceil((new Date(b.due_date)-new Date())/(864e5)); notifs.push({ id:b.id+200, type:'reminder', message:`${b.name} due in ${days} days` }); });
    setNotifications(notifs.slice(0,5));
  }, [expenses, bills, income, debts]);

  // CRUD helpers
  const crud = {
    addExpense: async () => {
      if (!newExpense.name || !newExpense.amount) return showToast('Fill all fields', 'error');
      await API.post('/expenses', newExpense);
      setNewExpense({ name:'', amount:'', category:'Essentials', date:new Date().toISOString().split('T')[0], is_miscellaneous:false, notes:'' });
      loadAllData(); showToast('Expense added!');
    },
    delExpense: async (id) => { if (!window.confirm('Delete?')) return; await API.delete(`/expenses/${id}`); loadAllData(); showToast('Deleted'); },
    addDebt: async () => {
      if (!newDebt.name || !newDebt.balance) return showToast('Fill all fields', 'error');
      await API.post('/debts', newDebt);
      setNewDebt({ name:'', balance:'', interest_rate:'', minimum_payment:'', is_salary_deduction:false, has_interest:true, frequency:'monthly' });
      loadAllData(); showToast('Debt added!');
    },
    delDebt: async (id) => { if (!window.confirm('Delete?')) return; await API.delete(`/debts/${id}`); loadAllData(); showToast('Deleted'); },
    addBill: async () => {
      if (!newBill.name || !newBill.amount || !newBill.due_date) return showToast('Fill all fields', 'error');
      await API.post('/bills', newBill);
      setNewBill({ name:'', amount:'', due_date:'', recurring:'monthly', category:'' });
      loadAllData(); showToast('Bill added!');
    },
    delBill: async (id) => { if (!window.confirm('Delete?')) return; await API.delete(`/bills/${id}`); loadAllData(); showToast('Deleted'); },
    addGoal: async () => {
      if (!newGoal.name || !newGoal.target_amount) return showToast('Fill all fields', 'error');
      await API.post('/savings-goals', newGoal);
      setNewGoal({ name:'', target_amount:'', target_date:'', category:'' });
      loadAllData(); showToast('Goal set!');
    },
    delGoal: async (id) => { if (!window.confirm('Delete?')) return; await API.delete(`/savings-goals/${id}`); loadAllData(); showToast('Deleted'); },
    addInv: async () => {
      if (!newInv.name || !newInv.amount) return showToast('Fill all fields', 'error');
      await API.post('/investments', newInv);
      setNewInv({ name:'', type:'stocks', amount:0, current_value:0, purchase_date:'' });
      loadAllData(); showToast('Investment added!');
    },
    delInv: async (id) => { if (!window.confirm('Delete?')) return; await API.delete(`/investments/${id}`); loadAllData(); showToast('Deleted'); },
  };

  const handleEdit = (item, type) => { setEditingItem({...item}); setEditType(type); setShowEditModal(true); };
  const handleSaveEdit = async (editedItem) => {
    const ep = editType === 'savings-goal' ? 'savings-goals' : `${editType}s`;
    await API.put(`/${ep}/${editedItem.id}`, editedItem);
    setShowEditModal(false); loadAllData(); showToast('Saved!');
  };

  const updateIncome = async (val) => {
    await API.put('/settings/income', { income: val });
    setIncome(val);
  };

  const handleSaveProfile = async (profileData) => {
    try {
      await API.put('/profile', profileData);
      const updatedUser = { ...user, username: profileData.username, email: profileData.email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      showToast('Profile saved!');
    } catch {
      showToast('Failed to save profile', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  // Derived data
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalInvestments = investments.reduce((s, i) => s + (i.current_value || i.amount), 0);
  const available = income - totalExpenses;
  const savingsRate = income > 0 ? ((income - totalExpenses) / income * 100).toFixed(1) : 0;
  const monthlyMinimums = debts.reduce((s, d) => s + (d.minimum_payment || 0), 0);
  const debtToIncome = totalDebt / (income || 1) * 100;

  const expensesByCategory = {};
  expenses.forEach(e => { expensesByCategory[e.category] = (expensesByCategory[e.category] || 0) + e.amount; });
  const chartData = Object.entries(expensesByCategory).map(([cat, amt]) => ({ category: cat, amount: amt, color: CATEGORY_COLORS[cat] || '#FF69B4' }));
  const topCat = Object.entries(expensesByCategory).sort((a,b) => b[1]-a[1])[0];

  const goalProgress = goals.map(g => ({ ...g, progress: ((g.current_amount||0)/g.target_amount)*100 }));
  const totalGoalPct = goals.length > 0 ? goalProgress.reduce((s,g)=>s+g.progress,0)/goals.length : 0;

  const upcomingBills = bills.filter(b=>!b.paid).sort((a,b)=>new Date(a.due_date)-new Date(b.due_date)).slice(0,5);
  const filteredExpenses = expenses.filter(e => (expenseFilter==='all'||e.category===expenseFilter) && (!searchTerm||e.name.toLowerCase().includes(searchTerm.toLowerCase())));

  const healthScore = Math.min(100, Math.max(0, (savingsRate/20)*30 + (1-Math.min(1,debtToIncome/100))*30 + (totalGoalPct/100)*40));

  const NAV_ITEMS = [
    { id:'dashboard',   label:'Dashboard',   icon:<Home size={18}/>        },
    { id:'expenses',    label:'Expenses',    icon:<ShoppingBag size={18}/> },
    { id:'debts',       label:'Debts',       icon:<CreditCard size={18}/>  },
    { id:'bills',       label:'Bills',       icon:<CalendarIcon size={18}/>},
    { id:'goals',       label:'Goals',       icon:<Target size={18}/>      },
    { id:'investments', label:'Investments', icon:<LineChart size={18}/>   },
    { id:'insights',    label:'Insights',    icon:<PieChart size={18}/>    },
    { id:'settings',    label:'Settings',    icon:<Settings size={18}/>    },
  ];

  return (
    <div className="app">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <EditModal isOpen={showEditModal} item={editingItem} onSave={handleSaveEdit} onClose={() => setShowEditModal(false)} type={editType} />

      {/* NAV BAR */}
      <nav className="nav-bar">
        <div className="nav-brand">
          <PiggyBank size={26} className="brand-icon" />
          <span>BudgetApp</span>
        </div>

        <div className={`nav-links ${mobileNavOpen ? 'mobile-open' : ''}`}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-link ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(item.id); setMobileNavOpen(false); }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        <div className="nav-actions">
          <button className="icon-btn" onClick={() => setShowNotifications(!showNotifications)} title="Notifications">
            <Bell size={18} />
            {notifications.length > 0 && <span className="notif-dot">{notifications.length}</span>}
          </button>
          <div className="nav-user">
            <div className="user-avatar">{user?.username?.[0]?.toUpperCase() || '?'}</div>
            <span className="user-name">{user?.username}</span>
            <button onClick={handleLogout} className="logout-btn" title="Logout"><LogOut size={16} /></button>
          </div>
          <button className="mobile-menu-btn" onClick={() => setMobileNavOpen(!mobileNavOpen)}>☰</button>
        </div>
      </nav>

      {/* NOTIFICATIONS */}
      {showNotifications && (
        <div className="notifications-panel">
          <div className="notif-header">
            <h4>Smart Insights</h4>
            <button onClick={() => setShowNotifications(false)}><X size={16}/></button>
          </div>
          {notifications.length === 0
            ? <div className="notif-empty">All clear! 🎉</div>
            : notifications.map(n => (
                <div key={n.id} className={`notif-item notif-${n.type}`}>
                  {n.type==='warning' ? <AlertCircle size={15}/> : n.type==='alert' ? <Zap size={15}/> : <Bell size={15}/>}
                  <span>{n.message}</span>
                </div>
              ))
          }
        </div>
      )}

      <main className="main-content">

        {/* ── DASHBOARD ─────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="tab-content">
            <div className="page-header">
              <h1>Financial Dashboard</h1>
              <p>Welcome back, {user?.username} 👋</p>
            </div>

            <div className="metrics-grid">
              {[
                { label:'Monthly Income', value:fmt(income, currency), icon:<DollarSign size={22}/>, sub: <input type="number" className="inline-income-edit" value={income} onChange={e=>updateIncome(parseFloat(e.target.value)||0)} placeholder="Set income"/>, accent:'var(--accent)' },
                { label:'Total Expenses', value:fmt(totalExpenses,currency), icon:<TrendingDown size={22}/>, sub:`${income>0?((totalExpenses/income)*100).toFixed(1):0}% of income`, accent:'#FF6B6B' },
                { label:'Cash Flow',      value:fmt(available,currency),     icon:<DollarSign size={22}/>, sub:`Savings: ${savingsRate}%`, accent: available>=0?'#50C878':'#FF6B6B', valueClass: available>=0?'positive':'negative' },
                { label:'Investments',    value:fmt(totalInvestments,currency), icon:<TrendingUp size={22}/>, sub:'Portfolio value', accent:'#4A90E2' },
              ].map((m,i) => (
                <div key={i} className="metric-card" style={{'--accent-color':m.accent}}>
                  <div className="metric-icon-wrap">{m.icon}</div>
                  <div className="metric-body">
                    <span className="metric-label">{m.label}</span>
                    <span className={`metric-value ${m.valueClass||''}`}>{m.value}</span>
                    <div className="metric-sub">{m.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="insights-row">
              <InsightCard icon={<TrendingUp/>} title="Top Spending" value={topCat ? `${topCat[0]}: ${fmt(topCat[1],currency)}` : 'No data'} recommendation={topCat ? 'Try cutting this by 15%' : 'Add expenses to see insights'} />
              <InsightCard icon={<Target/>} title="Goal Progress" value={`${totalGoalPct.toFixed(1)}% complete`} recommendation={`${goals.length} active goal${goals.length!==1?'s':''}`} />
              <InsightCard icon={<Clock/>} title="Debt Freedom" value={debts.length>0?`${Math.ceil(totalDebt/(Math.max(available,0)+monthlyMinimums||1))} months`:'Debt Free! 🎉'} recommendation={debts.length>0?'Pay extra each month to save time':'Keep it up!'} />
            </div>

            <div className="two-col">
              <div className="dash-card">
                <h3>Spending by Category</h3>
                {chartData.length > 0 ? (
                  <div className="cat-bars">
                    {chartData.sort((a,b)=>b.amount-a.amount).map((d,i) => (
                      <div key={i} className="cat-bar-row">
                        <div className="cat-bar-label">
                          <span className="cat-dot" style={{backgroundColor:d.color}}/>
                          <span>{d.category}</span>
                        </div>
                        <div className="cat-bar-track">
                          <div className="cat-bar-fill" style={{width:`${(d.amount/totalExpenses*100)}%`, backgroundColor:d.color}}/>
                        </div>
                        <span className="cat-bar-amt">{fmt(d.amount,currency)}</span>
                      </div>
                    ))}
                  </div>
                ) : <div className="empty-state">Add expenses to see spending breakdown</div>}
              </div>

              <div className="dash-card">
                <h3>Goal Progress</h3>
                {goalProgress.length > 0 ? goalProgress.map(g => (
                  <div key={g.id} className="goal-row">
                    <div className="goal-row-header">
                      <span>{g.name}</span>
                      <span className="goal-row-amt">{fmt(g.current_amount||0,currency)} / {fmt(g.target_amount,currency)}</span>
                    </div>
                    <div className="prog-track"><div className="prog-fill" style={{width:`${Math.min(100,g.progress)}%`}}/></div>
                  </div>
                )) : <div className="empty-state">No goals yet — set one on the Goals tab!</div>}
              </div>
            </div>

            {upcomingBills.length > 0 && (
              <div className="dash-card">
                <h3>Upcoming Bills</h3>
                {upcomingBills.map(b => {
                  const days = Math.ceil((new Date(b.due_date)-new Date())/864e5);
                  return (
                    <div key={b.id} className={`bill-row ${days<=3?'urgent':''}`}>
                      <div>
                        <strong>{b.name}</strong>
                        <div className="bill-due">Due in <strong>{days}</strong> day{days!==1?'s':''}</div>
                      </div>
                      <div className="bill-amount">{fmt(b.amount,currency)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── EXPENSES ─────────────────────────────────────── */}
        {activeTab === 'expenses' && (
          <div className="tab-content">
            <div className="page-header"><h1>Expense Tracker</h1></div>
            <div className="filter-row">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input placeholder="Search…" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}/>
              </div>
              <select value={expenseFilter} onChange={e=>setExpenseFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <button className="clear-btn" onClick={()=>{setExpenseFilter('all');setSearchTerm('');}}>Clear</button>
            </div>
            <div className="add-form">
              <h3>Add Expense</h3>
              <div className="form-row">
                <input placeholder="Name" value={newExpense.name} onChange={e=>setNewExpense({...newExpense,name:e.target.value})}/>
                <input type="number" placeholder="Amount" value={newExpense.amount} onChange={e=>setNewExpense({...newExpense,amount:parseFloat(e.target.value)})}/>
                <select value={newExpense.category} onChange={e=>setNewExpense({...newExpense,category:e.target.value})}>
                  {EXPENSE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
                <input type="date" value={newExpense.date} onChange={e=>setNewExpense({...newExpense,date:e.target.value})}/>
                <label className="check-label"><input type="checkbox" checked={newExpense.is_miscellaneous} onChange={e=>setNewExpense({...newExpense,is_miscellaneous:e.target.checked})}/> Misc</label>
                <button className="add-btn" onClick={crud.addExpense}><Plus size={16}/> Add</button>
              </div>
            </div>
            <div className="items-list">
              {filteredExpenses.length===0 && <div className="empty-state">No expenses found</div>}
              {filteredExpenses.map(exp => (
                <div key={exp.id} className="item-card">
                  <div className="item-color-bar" style={{backgroundColor:CATEGORY_COLORS[exp.category]||'var(--accent)'}}/>
                  <div className="item-info">
                    <div className="item-name">
                      <strong>{exp.name}</strong>
                      <span className="badge">{exp.category}</span>
                      {exp.is_miscellaneous && <span className="badge badge-misc">Misc</span>}
                    </div>
                    <div className="item-meta">{fmt(exp.amount,currency)} · {exp.date}</div>
                  </div>
                  <div className="item-actions">
                    <button className="edit-btn" onClick={()=>handleEdit(exp,'expense')}><Edit2 size={15}/></button>
                    <button className="del-btn" onClick={()=>crud.delExpense(exp.id)}><Trash2 size={15}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── DEBTS ────────────────────────────────────────── */}
        {activeTab === 'debts' && (
          <div className="tab-content">
            <div className="page-header">
              <h1>Debt Management</h1>
              {totalDebt > 0 && <div className="page-sub">Total: {fmt(totalDebt,currency)}</div>}
            </div>
            <div className="add-form">
              <h3>Add Debt</h3>
              <div className="form-row">
                <input placeholder="Name" value={newDebt.name} onChange={e=>setNewDebt({...newDebt,name:e.target.value})}/>
                <input type="number" placeholder="Balance" value={newDebt.balance} onChange={e=>setNewDebt({...newDebt,balance:parseFloat(e.target.value)})}/>
                <label className="check-label"><input type="checkbox" checked={newDebt.is_salary_deduction} onChange={e=>setNewDebt({...newDebt,is_salary_deduction:e.target.checked})}/> Salary Deduction</label>
                <label className="check-label"><input type="checkbox" checked={newDebt.has_interest} onChange={e=>setNewDebt({...newDebt,has_interest:e.target.checked})}/> Has Interest</label>
                {newDebt.has_interest && <>
                  <input type="number" step="0.1" placeholder="Interest %" value={newDebt.interest_rate} onChange={e=>setNewDebt({...newDebt,interest_rate:parseFloat(e.target.value)})}/>
                  <input type="number" placeholder="Min Payment" value={newDebt.minimum_payment} onChange={e=>setNewDebt({...newDebt,minimum_payment:parseFloat(e.target.value)})}/>
                </>}
                <button className="add-btn" onClick={crud.addDebt}><Plus size={16}/> Add Debt</button>
              </div>
            </div>
            <div className="items-list">
              {debts.length===0 && <div className="empty-state">No debts tracked — great!</div>}
              {debts.map(d => (
                <div key={d.id} className="item-card">
                  <div className="item-color-bar" style={{backgroundColor:'#FF6B6B'}}/>
                  <div className="item-info">
                    <div className="item-name">
                      <strong>{d.name}</strong>
                      {d.is_salary_deduction && <span className="badge badge-salary">Salary</span>}
                      {d.has_interest && <span className="badge badge-interest">{d.interest_rate}% APR</span>}
                    </div>
                    <div className="item-meta">Balance: {fmt(d.balance,currency)}{d.minimum_payment ? ` · Min: ${fmt(d.minimum_payment,currency)}` : ''}</div>
                  </div>
                  <div className="item-actions">
                    <button className="edit-btn" onClick={()=>handleEdit(d,'debt')}><Edit2 size={15}/></button>
                    <button className="del-btn" onClick={()=>crud.delDebt(d.id)}><Trash2 size={15}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BILLS ────────────────────────────────────────── */}
        {activeTab === 'bills' && (
          <div className="tab-content">
            <div className="page-header"><h1>Bill Calendar</h1></div>
            <div className="add-form">
              <h3>Add Bill Reminder</h3>
              <div className="form-row">
                <input placeholder="Name" value={newBill.name} onChange={e=>setNewBill({...newBill,name:e.target.value})}/>
                <input type="number" placeholder="Amount" value={newBill.amount} onChange={e=>setNewBill({...newBill,amount:parseFloat(e.target.value)})}/>
                <input type="date" value={newBill.due_date} onChange={e=>setNewBill({...newBill,due_date:e.target.value})}/>
                <select value={newBill.recurring} onChange={e=>setNewBill({...newBill,recurring:e.target.value})}>
                  <option>monthly</option><option>weekly</option><option>yearly</option><option>one-time</option>
                </select>
                <button className="add-btn" onClick={crud.addBill}><Plus size={16}/> Add</button>
              </div>
            </div>
            <div className="items-list">
              {bills.length===0 && <div className="empty-state">No bills added yet</div>}
              {bills.map(b => {
                const days = Math.ceil((new Date(b.due_date)-new Date())/864e5);
                return (
                  <div key={b.id} className={`item-card ${days<=3&&!b.paid?'urgent':''} ${b.paid?'paid':''}`}>
                    <div className="item-color-bar" style={{backgroundColor:days<=3&&!b.paid?'#FF6B6B':days<=7?'#FFA500':'var(--accent)'}}/>
                    <div className="item-info">
                      <div className="item-name">
                        <strong>{b.name}</strong>
                        <span className="badge">{b.recurring}</span>
                        {b.paid && <span className="badge badge-paid">Paid</span>}
                      </div>
                      <div className="item-meta">{fmt(b.amount,currency)} · Due {b.due_date} {!b.paid&&days>=0&&days<=60&&<span className="days-left">({days}d left)</span>}</div>
                    </div>
                    <div className="item-actions">
                      <button className="edit-btn" onClick={()=>handleEdit(b,'bill')}><Edit2 size={15}/></button>
                      <button className="del-btn" onClick={()=>crud.delBill(b.id)}><Trash2 size={15}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── GOALS ────────────────────────────────────────── */}
        {activeTab === 'goals' && (
          <div className="tab-content">
            <div className="page-header"><h1>Savings Goals</h1></div>
            <div className="add-form">
              <h3>Set a Goal</h3>
              <div className="form-row">
                <input placeholder="Goal name" value={newGoal.name} onChange={e=>setNewGoal({...newGoal,name:e.target.value})}/>
                <input type="number" placeholder="Target amount" value={newGoal.target_amount} onChange={e=>setNewGoal({...newGoal,target_amount:parseFloat(e.target.value)})}/>
                <input type="date" value={newGoal.target_date} onChange={e=>setNewGoal({...newGoal,target_date:e.target.value})}/>
                <input placeholder="Category (optional)" value={newGoal.category} onChange={e=>setNewGoal({...newGoal,category:e.target.value})}/>
                <button className="add-btn" onClick={crud.addGoal}><Plus size={16}/> Add Goal</button>
              </div>
            </div>
            <div className="items-list">
              {goals.length===0 && <div className="empty-state">No goals yet — what are you saving for?</div>}
              {goals.map(g => {
                const pct = Math.min(100, ((g.current_amount||0)/g.target_amount)*100);
                return (
                  <div key={g.id} className="item-card goal-card">
                    <div className="item-info">
                      <div className="item-name">
                        <strong>{g.name}</strong>
                        {g.category && <span className="badge">{g.category}</span>}
                      </div>
                      <div className="item-meta">{fmt(g.current_amount||0,currency)} of {fmt(g.target_amount,currency)} · {pct.toFixed(0)}%</div>
                      <div className="prog-track goal-prog"><div className="prog-fill" style={{width:`${pct}%`}}/></div>
                      {g.target_date && <div className="item-meta">Target: {g.target_date}</div>}
                    </div>
                    <div className="item-actions">
                      <button className="edit-btn" onClick={()=>handleEdit(g,'savings-goal')}><Edit2 size={15}/></button>
                      <button className="del-btn" onClick={()=>crud.delGoal(g.id)}><Trash2 size={15}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── INVESTMENTS ──────────────────────────────────── */}
        {activeTab === 'investments' && (
          <div className="tab-content">
            <div className="page-header"><h1>Investment Portfolio</h1></div>
            <div className="metrics-grid" style={{gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))'}}>
              <div className="metric-card">
                <div className="metric-body">
                  <span className="metric-label">Total Invested</span>
                  <span className="metric-value">{fmt(investments.reduce((s,i)=>s+i.amount,0),currency)}</span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-body">
                  <span className="metric-label">Current Value</span>
                  <span className={`metric-value ${totalInvestments>=investments.reduce((s,i)=>s+i.amount,0)?'positive':'negative'}`}>
                    {fmt(totalInvestments,currency)}
                  </span>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-body">
                  <span className="metric-label">Total Return</span>
                  <span className={`metric-value ${totalInvestments-investments.reduce((s,i)=>s+i.amount,0)>=0?'positive':'negative'}`}>
                    {fmt(totalInvestments-investments.reduce((s,i)=>s+i.amount,0),currency)}
                  </span>
                </div>
              </div>
            </div>
            <div className="add-form">
              <h3>Add Investment</h3>
              <div className="form-row">
                <input placeholder="Name" value={newInv.name} onChange={e=>setNewInv({...newInv,name:e.target.value})}/>
                <select value={newInv.type} onChange={e=>setNewInv({...newInv,type:e.target.value})}>
                  {['stocks','bonds','mutual_funds','etfs','crypto','real_estate'].map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
                <input type="number" placeholder="Amount invested" value={newInv.amount} onChange={e=>setNewInv({...newInv,amount:parseFloat(e.target.value)})}/>
                <input type="number" placeholder="Current value" value={newInv.current_value} onChange={e=>setNewInv({...newInv,current_value:parseFloat(e.target.value)})}/>
                <input type="date" value={newInv.purchase_date} onChange={e=>setNewInv({...newInv,purchase_date:e.target.value})}/>
                <button className="add-btn" onClick={crud.addInv}><Plus size={16}/> Add</button>
              </div>
            </div>
            <div className="items-list">
              {investments.length===0 && <div className="empty-state">Add your first investment 📈</div>}
              {investments.map(inv => {
                const ret = (inv.current_value||inv.amount)-inv.amount;
                const retPct = ((ret/inv.amount)*100).toFixed(1);
                return (
                  <div key={inv.id} className="item-card">
                    <div className="item-color-bar" style={{backgroundColor:ret>=0?'#50C878':'#FF6B6B'}}/>
                    <div className="item-info">
                      <div className="item-name">
                        <strong>{inv.name}</strong>
                        <span className="badge">{inv.type.replace('_',' ')}</span>
                      </div>
                      <div className="item-meta">Invested: {fmt(inv.amount,currency)} · Current: {fmt(inv.current_value||inv.amount,currency)}</div>
                      <div className={`item-return ${ret>=0?'positive':'negative'}`}>
                        {ret>=0?'+':''}{fmt(ret,currency)} ({ret>=0?'+':''}{retPct}%)
                      </div>
                    </div>
                    <div className="item-actions">
                      <button className="edit-btn" onClick={()=>handleEdit(inv,'investment')}><Edit2 size={15}/></button>
                      <button className="del-btn" onClick={()=>crud.delInv(inv.id)}><Trash2 size={15}/></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── INSIGHTS ─────────────────────────────────────── */}
        {activeTab === 'insights' && (
          <div className="tab-content">
            <div className="page-header"><h1>Financial Insights</h1></div>
            <div className="two-col">
              <div className="dash-card">
                <h3>Spending Trends</h3>
                <div className="trend-stats">
                  <div className="trend-stat">
                    <span className="trend-label">Avg Daily Spend</span>
                    <span className="trend-value">{fmt(totalExpenses/30,currency)}</span>
                    <small>Reduce by {fmt(5,currency)}/day = {fmt(150,currency)}/mo</small>
                  </div>
                  <div className="trend-stat">
                    <span className="trend-label">Monthly Total</span>
                    <span className={`trend-value ${totalExpenses>income?'negative':'positive'}`}>{fmt(totalExpenses,currency)}</span>
                    <small>{totalExpenses>income?'Over budget ⚠️':'Within budget ✓'}</small>
                  </div>
                  <div className="trend-stat">
                    <span className="trend-label">Savings Rate</span>
                    <span className={`trend-value ${savingsRate>=20?'positive':savingsRate>=10?'':'negative'}`}>{savingsRate}%</span>
                    <small>Target: 20%+</small>
                  </div>
                </div>
              </div>
              <div className="dash-card health-card">
                <h3>Financial Health Score</h3>
                <div className="health-center">
                  <ProgressRing percentage={healthScore} size={150} color={healthScore>=70?'#50C878':healthScore>=40?'#FFA500':'#FF6B6B'} />
                  <div className="health-msg">
                    {healthScore>=70?'Excellent! 🎉':healthScore>=40?'Good progress 👍':'Focus on savings 💪'}
                  </div>
                </div>
              </div>
            </div>
            <div className="dash-card">
              <h3>Smart Recommendations</h3>
              <div className="recs-list">
                {Object.entries(expensesByCategory).filter(([cat,amt])=>(amt/totalExpenses*100)>30&&cat!=='Essentials'&&totalExpenses>0).map(([cat,amt])=>(
                  <div key={cat} className="rec-item"><AlertCircle size={18}/>
                    <div><strong>{cat}</strong> is {((amt/totalExpenses)*100).toFixed(0)}% of spending · Save {fmt(amt*0.2,currency)}/mo by cutting 20%</div>
                  </div>
                ))}
                {debts.filter(d=>d.interest_rate>18).map(d=>(
                  <div key={d.id} className="rec-item rec-zap"><Zap size={18}/>
                    <div><strong>{d.name}</strong> at {d.interest_rate}% · Paying off saves {fmt(d.balance*(d.interest_rate/100),currency)}/yr in interest</div>
                  </div>
                ))}
                {savingsRate<20&&income>0&&(
                  <div className="rec-item rec-light"><Lightbulb size={18}/>
                    <div><strong>Try the 50/30/20 rule</strong> — 50% needs · 30% wants · 20% savings</div>
                  </div>
                )}
                {goals.length===0&&<div className="rec-item"><Target size={18}/><div><strong>Set a savings goal</strong> to stay motivated and track progress</div></div>}
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS ─────────────────────────────────────── */}
        {activeTab === 'settings' && (
          <SettingsTab
            user={user}
            theme={theme}
            setTheme={setTheme}
            currency={currency}
            setCurrency={setCurrency}
            onSaveProfile={handleSaveProfile}
          />
        )}

      </main>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  const handleLogin = async (username, password, email, isRegister) => {
    try {
      const ep = isRegister ? '/register' : '/login';
      const res = await API.post(ep, { username, email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setIsLoggedIn(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Authentication failed. Check credentials.');
    }
  };

  if (!isLoggedIn) return <LoginScreen onLogin={handleLogin} />;
  return <MainApp />;
}

export default App;
