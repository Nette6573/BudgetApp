const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'budgetapp-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// ── Database ──────────────────────────────────────────────────────────────────
const db = new sqlite3.Database('./budgetapp.db');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    monthly_income DECIMAL(10,2) DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    is_miscellaneous INTEGER DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS debts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    interest_rate DECIMAL(5,2) DEFAULT 0,
    minimum_payment DECIMAL(10,2),
    is_salary_deduction INTEGER DEFAULT 0,
    has_interest INTEGER DEFAULT 1,
    frequency TEXT DEFAULT 'monthly',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    due_date TEXT NOT NULL,
    recurring TEXT DEFAULT 'monthly',
    paid INTEGER DEFAULT 0,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    target_amount DECIMAL(10,2) NOT NULL,
    current_amount DECIMAL(10,2) DEFAULT 0,
    target_date TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS investments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    current_value DECIMAL(10,2),
    purchase_date TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  console.log('✅ Database tables ready');
});

// ── Auth Middleware ────────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── Auth Routes ───────────────────────────────────────────────────────────────

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'All fields required' });
  try {
    const hashed = await bcrypt.hash(password, 12);
    db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username.trim(), email.trim(), hashed],
      function(err) {
        if (err) return res.status(400).json({ error: 'Username already taken' });
        db.run('INSERT INTO settings (user_id, monthly_income) VALUES (?, 0)', [this.lastID]);
        const token = jwt.sign({ userId: this.lastID }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { id: this.lastID, username: username.trim(), email: email.trim() } });
      });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  });
});

// ── Profile Route (NEW) ───────────────────────────────────────────────────────

app.put('/api/profile', authenticate, async (req, res) => {
  const { username, email, currentPassword, newPassword } = req.body;
  db.get('SELECT * FROM users WHERE id = ?', [req.userId], async (err, user) => {
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If changing password, verify current one
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required' });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = newPassword ? await bcrypt.hash(newPassword, 12) : user.password;
    const newUsername = username?.trim() || user.username;
    const newEmail = email?.trim() || user.email;

    db.run('UPDATE users SET username = ?, email = ?, password = ? WHERE id = ?',
      [newUsername, newEmail, newHash, req.userId],
      function(err) {
        if (err) return res.status(400).json({ error: 'Username already taken' });
        res.json({ success: true, user: { id: req.userId, username: newUsername, email: newEmail } });
      });
  });
});

// ── Settings Routes ───────────────────────────────────────────────────────────

app.get('/api/settings', authenticate, (req, res) => {
  db.get('SELECT monthly_income FROM settings WHERE user_id = ?', [req.userId], (err, row) => {
    res.json({ monthly_income: row?.monthly_income || 0 });
  });
});

app.put('/api/settings/income', authenticate, (req, res) => {
  db.run('UPDATE settings SET monthly_income = ? WHERE user_id = ?', [req.body.income, req.userId]);
  res.json({ success: true });
});

// ── Expenses ──────────────────────────────────────────────────────────────────

app.get('/api/expenses', authenticate, (req, res) => {
  db.all('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC', [req.userId], (err, rows) => res.json(rows || []));
});

app.post('/api/expenses', authenticate, (req, res) => {
  const { name, amount, category, date, is_miscellaneous, notes } = req.body;
  db.run('INSERT INTO expenses (user_id, name, amount, category, date, is_miscellaneous, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.userId, name, amount, category, date, is_miscellaneous ? 1 : 0, notes],
    function(err) { err ? res.status(500).json({ error: err.message }) : res.json({ id: this.lastID }); });
});

app.put('/api/expenses/:id', authenticate, (req, res) => {
  const { name, amount, category, date, is_miscellaneous, notes } = req.body;
  db.run('UPDATE expenses SET name=?,amount=?,category=?,date=?,is_miscellaneous=?,notes=? WHERE id=? AND user_id=?',
    [name, amount, category, date, is_miscellaneous ? 1 : 0, notes, req.params.id, req.userId],
    function(err) { err ? res.status(500).json({ error: err.message }) : res.json({ success: true }); });
});

app.delete('/api/expenses/:id', authenticate, (req, res) => {
  db.run('DELETE FROM expenses WHERE id=? AND user_id=?', [req.params.id, req.userId]);
  res.json({ success: true });
});

// ── Debts ─────────────────────────────────────────────────────────────────────

app.get('/api/debts', authenticate, (req, res) => {
  db.all('SELECT * FROM debts WHERE user_id = ?', [req.userId], (err, rows) => res.json(rows || []));
});

app.post('/api/debts', authenticate, (req, res) => {
  const { name, balance, interest_rate, minimum_payment, is_salary_deduction, has_interest, frequency } = req.body;
  db.run('INSERT INTO debts (user_id, name, balance, interest_rate, minimum_payment, is_salary_deduction, has_interest, frequency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.userId, name, balance, interest_rate || 0, minimum_payment, is_salary_deduction ? 1 : 0, has_interest ? 1 : 0, frequency || 'monthly'],
    function(err) { err ? res.status(500).json({ error: err.message }) : res.json({ id: this.lastID }); });
});

app.put('/api/debts/:id', authenticate, (req, res) => {
  const { name, balance, interest_rate, minimum_payment, is_salary_deduction, has_interest, frequency } = req.body;
  db.run('UPDATE debts SET name=?,balance=?,interest_rate=?,minimum_payment=?,is_salary_deduction=?,has_interest=?,frequency=? WHERE id=? AND user_id=?',
    [name, balance, interest_rate || 0, minimum_payment, is_salary_deduction ? 1 : 0, has_interest ? 1 : 0, frequency || 'monthly', req.params.id, req.userId],
    function(err) { err ? res.status(500).json({ error: err.message }) : res.json({ success: true }); });
});

app.delete('/api/debts/:id', authenticate, (req, res) => {
  db.run('DELETE FROM debts WHERE id=? AND user_id=?', [req.params.id, req.userId]);
  res.json({ success: true });
});

// ── Bills ─────────────────────────────────────────────────────────────────────

app.get('/api/bills', authenticate, (req, res) => {
  db.all('SELECT * FROM bills WHERE user_id = ? ORDER BY due_date ASC', [req.userId], (err, rows) => res.json(rows || []));
});

app.post('/api/bills', authenticate, (req, res) => {
  const { name, amount, due_date, recurring, category } = req.body;
  db.run('INSERT INTO bills (user_id, name, amount, due_date, recurring, category) VALUES (?, ?, ?, ?, ?, ?)',
    [req.userId, name, amount, due_date, recurring || 'monthly', category],
    function(err) { err ? res.status(500).json({ error: err.message }) : res.json({ id: this.lastID }); });
});

app.put('/api/bills/:id', authenticate, (req, res) => {
  const { name, amount, due_date, recurring, paid, category } = req.body;
  db.run('UPDATE bills SET name=?,amount=?,due_date=?,recurring=?,paid=?,category=? WHERE id=? AND user_id=?',
    [name, amount, due_date, recurring || 'monthly', paid ? 1 : 0, category, req.params.id, req.userId],
    function(err) { err ? res.status(500).json({ error: err.message }) : res.json({ success: true }); });
});

app.delete('/api/bills/:id', authenticate, (req, res) => {
  db.run('DELETE FROM bills WHERE id=? AND user_id=?', [req.params.id, req.userId]);
  res.json({ success: true });
});

// ── Savings Goals ─────────────────────────────────────────────────────────────

app.get('/api/savings-goals', authenticate, (req, res) => {
  db.all('SELECT * FROM savings_goals WHERE user_id = ?', [req.userId], (err, rows) => res.json(rows || []));
});

app.post('/api/savings-goals', authenticate, (req, res) => {
  const { name, target_amount, target_date, category } = req.body;
  db.run('INSERT INTO savings_goals (user_id, name, target_amount, target_date, category) VALUES (?, ?, ?, ?, ?)',
    [req.userId, name, target_amount, target_date, category],
    function(err) { err ? res.status(500).json({ error: err.message }) : res.json({ id: this.lastID }); });
});

app.put('/api/savings-goals/:id', authenticate, (req, res) => {
  const { name, target_amount, current_amount, target_date, category } = req.body;
  db.run('UPDATE savings_goals SET name=?,target_amount=?,current_amount=?,target_date=?,category=? WHERE id=? AND user_id=?',
    [name, target_amount, current_amount, target_date, category, req.params.id, req.userId],
    function(err) { err ? res.status(500).json({ error: err.message }) : res.json({ success: true }); });
});

app.delete('/api/savings-goals/:id', authenticate, (req, res) => {
  db.run('DELETE FROM savings_goals WHERE id=? AND user_id=?', [req.params.id, req.userId]);
  res.json({ success: true });
});

// ── Investments ───────────────────────────────────────────────────────────────

app.get('/api/investments', authenticate, (req, res) => {
  db.all('SELECT * FROM investments WHERE user_id = ? ORDER BY created_at DESC', [req.userId], (err, rows) => res.json(rows || []));
});

app.post('/api/investments', authenticate, (req, res) => {
  const { name, type, amount, current_value, purchase_date, notes } = req.body;
  db.run('INSERT INTO investments (user_id, name, type, amount, current_value, purchase_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.userId, name, type, amount, current_value || amount, purchase_date, notes],
    function(err) { err ? res.status(500).json({ error: err.message }) : res.json({ id: this.lastID }); });
});

app.put('/api/investments/:id', authenticate, (req, res) => {
  const { name, type, amount, current_value, purchase_date, notes } = req.body;
  db.run('UPDATE investments SET name=?,type=?,amount=?,current_value=?,purchase_date=?,notes=? WHERE id=? AND user_id=?',
    [name, type, amount, current_value, purchase_date, notes, req.params.id, req.userId],
    function(err) { err ? res.status(500).json({ error: err.message }) : res.json({ success: true }); });
});

app.delete('/api/investments/:id', authenticate, (req, res) => {
  db.run('DELETE FROM investments WHERE id=? AND user_id=?', [req.params.id, req.userId]);
  res.json({ success: true });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Database: budgetapp.db`);
  console.log(`✨ Features: Auth, Profile, Expenses, Debts, Bills, Goals, Investments`);
});
