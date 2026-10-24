CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  cliente_id TEXT NOT NULL DEFAULT 'c1',
  items TEXT NOT NULL,
  total REAL NOT NULL,
  collector_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'creating',
  preference_id TEXT,
  init_point TEXT,
  payment_id TEXT,
  created_at TEXT NOT NULL,
  checked_at TEXT,
  registered_at TEXT
);
CREATE INDEX IF NOT EXISTS orders_device_created ON orders(device_id, created_at DESC);
CREATE TABLE IF NOT EXISTS login_limits (id TEXT PRIMARY KEY, attempts INTEGER NOT NULL, reset_at INTEGER NOT NULL);
