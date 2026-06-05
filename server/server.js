'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const MSSQLStore = require('connect-mssql-v2');

const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
const { requireSession, requireRole } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.json());

const sessionStore = new MSSQLStore({
  connectionString: process.env.SQL_CONNECTION_STRING,
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  name: process.env.SESSION_COOKIE_NAME || '[app-naam].sid',
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: parseInt(process.env.SESSION_TTL_HOURS || '8') * 60 * 60 * 1000,
  },
}));

app.use('/api/auth', authRouter);
app.use('/api/admin', requireSession, requireRole('admin'), adminRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server gestart op poort ' + PORT));

module.exports = app;
