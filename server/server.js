const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { readData, writeData } = require('./utils/db');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Auth: Signup
app.post('/api/auth/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  const users = await readData('users');
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'Email already registered' });

  const newUser = {
    id: Date.now().toString(),
    name,
    email: email.toLowerCase(),
    // NOTE: For demo only; never store plaintext passwords in production.
    password,
    createdAt: new Date().toISOString()
  };
  users.push(newUser);
  await writeData('users', users);

  // Create empty portfolio for user
  const portfolios = await readData('portfolios');
  portfolios.push({
    userId: newUser.id,
    cash: 10000, // demo starting cash
    holdings: [] // { assetId, quantity, avgCost }
  });
  await writeData('portfolios', portfolios);

  const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: newUser.id, name: newUser.name, email: newUser.email } });
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const users = await readData('users');
  const user = users.find(u => u.email.toLowerCase() === (email || '').toLowerCase());
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
});

// Get market assets
app.get('/api/assets', async (req, res) => {
  const assets = await readData('assets');
  res.json(assets);
});

// Get portfolio for current user
app.get('/api/portfolio', authMiddleware(JWT_SECRET), async (req, res) => {
  const portfolios = await readData('portfolios');
  const assets = await readData('assets');
  const portfolio = portfolios.find(p => p.userId === req.user.userId);
  if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

  const enrichedHoldings = portfolio.holdings.map(h => {
    const asset = assets.find(a => a.id === h.assetId);
    const marketValue = asset ? asset.price * h.quantity : 0;
    const pnl = asset ? (asset.price - h.avgCost) * h.quantity : 0;
    return { ...h, name: asset?.name, symbol: asset?.symbol, price: asset?.price, marketValue, pnl };
  });

  const totalHoldingsValue = enrichedHoldings.reduce((sum, h) => sum + h.marketValue, 0);
  const totalValue = portfolio.cash + totalHoldingsValue;

  res.json({
    cash: portfolio.cash,
    holdings: enrichedHoldings,
    totalValue
  });
});

// Place order (buy/sell)
app.post('/api/orders', authMiddleware(JWT_SECRET), async (req, res) => {
  const { assetId, side, quantity } = req.body;
  if (!assetId || !side || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid order' });
  }

  const assets = await readData('assets');
  const portfolios = await readData('portfolios');
  const transactions = await readData('transactions');

  const asset = assets.find(a => a.id === assetId);
  if (!asset) return res.status(404).json({ error: 'Asset not found' });

  const portfolio = portfolios.find(p => p.userId === req.user.userId);
  if (!portfolio) return res.status(404).json({ error: 'Portfolio not found' });

  const price = asset.price;
  const cost = price * quantity;

  if (side === 'buy') {
    if (portfolio.cash < cost) return res.status(400).json({ error: 'Insufficient cash' });
    portfolio.cash -= cost;

    const existing = portfolio.holdings.find(h => h.assetId === assetId);
    if (existing) {
      const newQty = existing.quantity + quantity;
      const newAvg = (existing.avgCost * existing.quantity + cost) / newQty;
      existing.quantity = newQty;
      existing.avgCost = newAvg;
    } else {
      portfolio.holdings.push({ assetId, quantity, avgCost: price });
    }
  } else if (side === 'sell') {
    const existing = portfolio.holdings.find(h => h.assetId === assetId);
    if (!existing || existing.quantity < quantity) return res.status(400).json({ error: 'Insufficient holdings' });

    existing.quantity -= quantity;
    portfolio.cash += cost;
    if (existing.quantity === 0) {
      portfolio.holdings = portfolio.holdings.filter(h => h.assetId !== assetId);
    }
  } else {
    return res.status(400).json({ error: 'Invalid side' });
  }

  transactions.push({
    id: Date.now().toString(),
    userId: req.user.userId,
    assetId,
    side,
    quantity,
    price,
    amount: cost,
    createdAt: new Date().toISOString()
  });

  await writeData('portfolios', portfolios);
  await writeData('transactions', transactions);
  res.json({ ok: true });
});

// Transactions
app.get('/api/transactions', authMiddleware(JWT_SECRET), async (req, res) => {
  const transactions = await readData('transactions');
  const assets = await readData('assets');
  const userTx = transactions
    .filter(t => t.userId === req.user.userId)
    .map(t => {
      const asset = assets.find(a => a.id === t.assetId);
      return { ...t, symbol: asset?.symbol, name: asset?.name };
    });
  res.json(userTx);
});

// Mock market tick (demo: random walk)
app.post('/api/market/tick', async (req, res) => {
  const assets = await readData('assets');
  const updated = assets.map(a => {
    const noise = (Math.random() - 0.5) * 0.02; // +/-2%
    const next = Math.max(0.01, a.price * (1 + noise));
    return { ...a, price: parseFloat(next.toFixed(2)), changePct: parseFloat((noise * 100).toFixed(2)) };
  });
  await writeData('assets', updated);
  res.json({ ok: true, updatedCount: updated.length });
});

// Fallback: serve index for SPA-like nav if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
