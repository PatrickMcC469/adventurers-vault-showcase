import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('coinpurse.db');

// Run immediately at module load so tables exist before any screen queries
setupDatabase();

// ---------------------------------------------------------------------------
// SETUP — run once on app launch to create tables if they don't exist
// ---------------------------------------------------------------------------

export function setupDatabase() {
  db.execSync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS campaigns (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS characters (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      name        TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL UNIQUE,
      copper       INTEGER NOT NULL DEFAULT 0,
      silver       INTEGER NOT NULL DEFAULT 0,
      electrum     INTEGER NOT NULL DEFAULT 0,
      gold         INTEGER NOT NULL DEFAULT 0,
      platinum     INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id  INTEGER NOT NULL,
      type       TEXT NOT NULL CHECK(type IN ('add', 'subtract')),
      copper     INTEGER NOT NULL DEFAULT 0,
      silver     INTEGER NOT NULL DEFAULT 0,
      electrum   INTEGER NOT NULL DEFAULT 0,
      gold       INTEGER NOT NULL DEFAULT 0,
      platinum   INTEGER NOT NULL DEFAULT 0,
      note       TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id     INTEGER NOT NULL UNIQUE,
      auto_convert      INTEGER NOT NULL DEFAULT 1,
      electrum_enabled  INTEGER NOT NULL DEFAULT 0,
      container_style   TEXT NOT NULL DEFAULT 'chest',
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS currency_templates (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS currency_denominations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id  INTEGER NOT NULL,
      name         TEXT NOT NULL,
      order_index  INTEGER NOT NULL,
      rate_to_next INTEGER,
      FOREIGN KEY (template_id) REFERENCES currency_templates(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS custom_wallet_amounts (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      character_id INTEGER NOT NULL,
      denom_id     INTEGER NOT NULL,
      amount       INTEGER NOT NULL DEFAULT 0,
      UNIQUE(character_id, denom_id),
      FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
      FOREIGN KEY (denom_id) REFERENCES currency_denominations(id) ON DELETE CASCADE
    );
  `);

  // Migration — add minimum threshold columns if they don't exist yet
  // (ALTER TABLE ignores columns that already exist via try/catch)
  // Add avatar_uri to characters if not yet present
  try { db.execSync('ALTER TABLE characters ADD COLUMN avatar_uri TEXT'); } catch (_) {}

  const migrations = [
    'ALTER TABLE settings ADD COLUMN min_copper          INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE settings ADD COLUMN min_silver          INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE settings ADD COLUMN min_electrum        INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE settings ADD COLUMN min_gold            INTEGER NOT NULL DEFAULT 0',
    "ALTER TABLE settings ADD COLUMN currency_mode       TEXT NOT NULL DEFAULT 'standard'",
    'ALTER TABLE settings ADD COLUMN active_template_id  INTEGER',
  ];
  migrations.forEach((sql) => {
    try { db.execSync(sql); } catch (_) { /* column already exists */ }
  });
}

// ---------------------------------------------------------------------------
// CAMPAIGNS
// ---------------------------------------------------------------------------

export function getCampaigns() {
  return db.getAllSync('SELECT * FROM campaigns ORDER BY created_at DESC');
}

export function createCampaign(name) {
  const result = db.runSync('INSERT INTO campaigns (name) VALUES (?)', [name]);
  return result.lastInsertRowId;
}

export function deleteCampaign(campaignId) {
  db.runSync('DELETE FROM campaigns WHERE id = ?', [campaignId]);
}

export function renameCampaign(campaignId, newName) {
  db.runSync('UPDATE campaigns SET name = ? WHERE id = ?', [newName, campaignId]);
}

// ---------------------------------------------------------------------------
// CHARACTERS
// ---------------------------------------------------------------------------

export function getCharacterByCampaign(campaignId) {
  return db.getFirstSync(
    'SELECT * FROM characters WHERE campaign_id = ?',
    [campaignId]
  );
}

export function updateCharacterAvatar(characterId, uri) {
  db.runSync('UPDATE characters SET avatar_uri = ? WHERE id = ?', [uri, characterId]);
}

export function createCharacter(campaignId, name) {
  const result = db.runSync(
    'INSERT INTO characters (campaign_id, name) VALUES (?, ?)',
    [campaignId, name]
  );
  const characterId = result.lastInsertRowId;

  // Create the wallet and settings rows at the same time — they always exist together
  db.runSync('INSERT INTO wallets (character_id) VALUES (?)', [characterId]);
  db.runSync('INSERT INTO settings (character_id) VALUES (?)', [characterId]);

  return characterId;
}

// ---------------------------------------------------------------------------
// WALLETS
// ---------------------------------------------------------------------------

export function getWalletByCharacter(characterId) {
  return db.getFirstSync(
    'SELECT * FROM wallets WHERE character_id = ?',
    [characterId]
  );
}

export function updateWallet(walletId, wallet) {
  db.runSync(
    `UPDATE wallets
     SET copper = ?, silver = ?, electrum = ?, gold = ?, platinum = ?
     WHERE id = ?`,
    [wallet.copper, wallet.silver, wallet.electrum, wallet.gold, wallet.platinum, walletId]
  );
}

// ---------------------------------------------------------------------------
// TRANSACTIONS
// ---------------------------------------------------------------------------

export function getTransactions(walletId, limit = 50) {
  return db.getAllSync(
    'SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC LIMIT ?',
    [walletId, limit]
  );
}

export function logTransaction(walletId, type, amountWallet, note = '') {
  db.runSync(
    `INSERT INTO transactions (wallet_id, type, copper, silver, electrum, gold, platinum, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      walletId,
      type,
      amountWallet.copper || 0,
      amountWallet.silver || 0,
      amountWallet.electrum || 0,
      amountWallet.gold || 0,
      amountWallet.platinum || 0,
      note,
    ]
  );
}

// ---------------------------------------------------------------------------
// SETTINGS
// ---------------------------------------------------------------------------

export function getSettings(characterId) {
  return db.getFirstSync(
    'SELECT * FROM settings WHERE character_id = ?',
    [characterId]
  );
}

export function updateCurrencyMode(characterId, mode, templateId = null) {
  db.runSync(
    'UPDATE settings SET currency_mode = ?, active_template_id = ? WHERE character_id = ?',
    [mode, templateId, characterId]
  );
}

// ---------------------------------------------------------------------------
// CURRENCY TEMPLATES  (global — shared across all campaigns)
// ---------------------------------------------------------------------------

export function getCurrencyTemplates() {
  return db.getAllSync('SELECT * FROM currency_templates ORDER BY created_at DESC');
}

export function createCurrencyTemplate(name) {
  const result = db.runSync('INSERT INTO currency_templates (name) VALUES (?)', [name]);
  return result.lastInsertRowId;
}

export function deleteCurrencyTemplate(templateId) {
  db.runSync('DELETE FROM currency_templates WHERE id = ?', [templateId]);
}

export function getDenominationsByTemplate(templateId) {
  return db.getAllSync(
    'SELECT * FROM currency_denominations WHERE template_id = ? ORDER BY order_index ASC',
    [templateId]
  );
}

export function saveTemplateDenominations(templateId, denoms) {
  // denoms: [{ name, orderIndex, rateToNext }]
  db.runSync('DELETE FROM currency_denominations WHERE template_id = ?', [templateId]);
  denoms.forEach(({ name, orderIndex, rateToNext }) => {
    db.runSync(
      'INSERT INTO currency_denominations (template_id, name, order_index, rate_to_next) VALUES (?, ?, ?, ?)',
      [templateId, name, orderIndex, rateToNext ?? null]
    );
  });
}

// ---------------------------------------------------------------------------
// CUSTOM WALLET AMOUNTS
// ---------------------------------------------------------------------------

export function getCustomWalletAmounts(characterId) {
  return db.getAllSync(
    `SELECT cwa.denom_id, cwa.amount, cd.name, cd.order_index, cd.rate_to_next
     FROM custom_wallet_amounts cwa
     JOIN currency_denominations cd ON cd.id = cwa.denom_id
     WHERE cwa.character_id = ?
     ORDER BY cd.order_index ASC`,
    [characterId]
  );
}

export function initCustomWallet(characterId, templateId) {
  const denoms = getDenominationsByTemplate(templateId);
  denoms.forEach(({ id }) => {
    db.runSync(
      `INSERT OR IGNORE INTO custom_wallet_amounts (character_id, denom_id, amount) VALUES (?, ?, 0)`,
      [characterId, id]
    );
  });
}

export function updateCustomWalletAmounts(characterId, amounts) {
  // amounts: [{ denomId, amount }]
  amounts.forEach(({ denomId, amount }) => {
    db.runSync(
      `INSERT INTO custom_wallet_amounts (character_id, denom_id, amount)
       VALUES (?, ?, ?)
       ON CONFLICT(character_id, denom_id) DO UPDATE SET amount = excluded.amount`,
      [characterId, denomId, amount]
    );
  });
}

export function clearCustomWallet(characterId) {
  db.runSync('DELETE FROM custom_wallet_amounts WHERE character_id = ?', [characterId]);
}

// Applies a custom currency template to a character:
// clears their standard wallet, clears any old custom amounts, initialises new ones
export function applyCustomCurrencyTemplate(characterId, walletId, templateId) {
  db.runSync(
    'UPDATE wallets SET copper=0, silver=0, electrum=0, gold=0, platinum=0 WHERE id=?',
    [walletId]
  );
  db.runSync('DELETE FROM transactions WHERE wallet_id = ?', [walletId]);
  clearCustomWallet(characterId);
  initCustomWallet(characterId, templateId);
  updateCurrencyMode(characterId, 'custom', templateId);
}

export function revertToStandardCurrency(characterId, walletId) {
  db.runSync('DELETE FROM transactions WHERE wallet_id = ?', [walletId]);
  clearCustomWallet(characterId);
  updateCurrencyMode(characterId, 'standard', null);
}

// ---------------------------------------------------------------------------
// SETTINGS
// ---------------------------------------------------------------------------

export function updateSettings(characterId, {
  autoConvert, electrumEnabled, containerStyle,
  minCopper = 0, minSilver = 0, minElectrum = 0, minGold = 0,
}) {
  db.runSync(
    `UPDATE settings
     SET auto_convert = ?, electrum_enabled = ?, container_style = ?,
         min_copper = ?, min_silver = ?, min_electrum = ?, min_gold = ?
     WHERE character_id = ?`,
    [
      autoConvert ? 1 : 0, electrumEnabled ? 1 : 0, containerStyle,
      minCopper, minSilver, minElectrum, minGold,
      characterId,
    ]
  );
}
