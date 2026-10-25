-- Photos have their own table; payment records are not changed.
CREATE TABLE IF NOT EXISTS product_photos (
  photo_key TEXT PRIMARY KEY,
  revision TEXT NOT NULL,
  image BLOB,
  deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0,1)),
  updated_at TEXT NOT NULL
);
