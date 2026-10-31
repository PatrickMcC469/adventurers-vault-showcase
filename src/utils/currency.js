import { DENOMINATIONS, COPPER_VALUE } from '../constants/currency';

// Converts an entire wallet to its total value in copper
// This is how we compare two wallets or check if a player can afford something
export function walletToCopper(wallet) {
  return DENOMINATIONS.reduce((total, denom) => {
    return total + (wallet[denom] || 0) * COPPER_VALUE[denom];
  }, 0);
}

// Converts a raw copper amount into a wallet object, highest denomination first
// electrumEnabled lets us skip electrum in the conversion chain
export function copperToWallet(copper, electrumEnabled = false) {
  const wallet = { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 };
  let remaining = copper;

  wallet.platinum = Math.floor(remaining / COPPER_VALUE.platinum);
  remaining = remaining % COPPER_VALUE.platinum;

  wallet.gold = Math.floor(remaining / COPPER_VALUE.gold);
  remaining = remaining % COPPER_VALUE.gold;

  if (electrumEnabled) {
    wallet.electrum = Math.floor(remaining / COPPER_VALUE.electrum);
    remaining = remaining % COPPER_VALUE.electrum;
  }

  wallet.silver = Math.floor(remaining / COPPER_VALUE.silver);
  remaining = remaining % COPPER_VALUE.silver;

  wallet.copper = remaining;

  return wallet;
}

// Checks if a wallet has enough total value to cover a cost wallet
export function canAfford(walletState, costWallet) {
  const totalOwned = walletToCopper(walletState);
  const totalCost = walletToCopper(costWallet);
  return totalOwned >= totalCost;
}

// Adds a transaction amount to a wallet and optionally auto-converts up
export function addToWallet(walletState, amountWallet, autoConvert, electrumEnabled, thresholds = {}) {
  const newWallet = { ...walletState };

  DENOMINATIONS.forEach((denom) => {
    newWallet[denom] = (newWallet[denom] || 0) + (amountWallet[denom] || 0);
  });

  if (autoConvert) {
    return autoConvertUp(newWallet, electrumEnabled, thresholds);
  }
  return newWallet;
}

// Cascades upward — converts only the amount above each denomination's minimum threshold.
// Example: gold min = 50, you have 65 gold → only 15 is eligible to become platinum.
// If no threshold is set (default 0) behaviour is identical to before.
function autoConvertUp(wallet, electrumEnabled, thresholds = {}) {
  const result = { ...wallet };
  const chain = electrumEnabled
    ? ['copper', 'silver', 'electrum', 'gold', 'platinum']
    : ['copper', 'silver', 'gold', 'platinum'];

  for (let i = 0; i < chain.length - 1; i++) {
    const current = chain[i];
    const next    = chain[i + 1];
    const rate    = COPPER_VALUE[next] / COPPER_VALUE[current];
    const minimum = thresholds[current] || 0;

    // Only the amount above the minimum is eligible for conversion
    const eligible = result[current] - minimum;
    if (eligible <= 0) continue;

    const promote = Math.floor(eligible / rate);
    if (promote === 0) continue;

    result[current] -= promote * rate;           // deduct exactly what was promoted
    result[next]     = (result[next] || 0) + promote;
  }

  return result;
}

// Subtracts a cost from a wallet, preserving denominations as much as possible.
// Pays each denomination directly first, then covers any shortfall by breaking
// down the smallest available higher denomination and giving change back.
// Returns { success, wallet } — if success is false, wallet is unchanged.
export function subtractFromWallet(walletState, costWallet, electrumEnabled) {
  if (!canAfford(walletState, costWallet)) {
    return { success: false, wallet: walletState };
  }

  const result = { ...walletState };
  const chain = electrumEnabled
    ? ['copper', 'silver', 'electrum', 'gold', 'platinum']
    : ['copper', 'silver', 'gold', 'platinum'];

  // Step 1: pay directly from matching denominations where possible.
  // Track any shortfall in copper value.
  let shortfallCopper = 0;
  chain.forEach((denom) => {
    const cost = costWallet[denom] || 0;
    if (cost === 0) return;
    if (result[denom] >= cost) {
      result[denom] -= cost;
    } else {
      shortfallCopper += (cost - result[denom]) * COPPER_VALUE[denom];
      result[denom] = 0;
    }
  });

  // Step 2: cover any shortfall by breaking down the smallest available
  // higher denomination, then distribute the change back into smaller coins.
  if (shortfallCopper > 0) {
    for (const denom of chain) {
      if (shortfallCopper <= 0) break;
      if (!result[denom]) continue;

      const denomValue = COPPER_VALUE[denom];
      const needed     = Math.ceil(shortfallCopper / denomValue);
      const use        = Math.min(needed, result[denom]);
      const recovered  = use * denomValue;

      result[denom] -= use;

      if (recovered >= shortfallCopper) {
        // Fully covered — give any over-break back as smaller denominations
        const change   = recovered - shortfallCopper;
        shortfallCopper = 0;
        if (change > 0) {
          const denomIdx = chain.indexOf(denom);
          let remaining  = change;
          for (let i = denomIdx - 1; i >= 0 && remaining > 0; i--) {
            const sd   = chain[i];
            const give = Math.floor(remaining / COPPER_VALUE[sd]);
            if (give > 0) {
              result[sd] = (result[sd] || 0) + give;
              remaining -= give * COPPER_VALUE[sd];
            }
          }
        }
      } else {
        // Partially covered — subtract what we got and keep going up the chain
        shortfallCopper -= recovered;
      }
    }
  }

  return { success: true, wallet: result };
}

// Formats a wallet into a readable string for display or history logs
export function formatWallet(wallet, electrumEnabled = false) {
  const parts = [];
  if (wallet.platinum) parts.push(`${wallet.platinum}PP`);
  if (wallet.gold) parts.push(`${wallet.gold}GP`);
  if (electrumEnabled && wallet.electrum) parts.push(`${wallet.electrum}EP`);
  if (wallet.silver) parts.push(`${wallet.silver}SP`);
  if (wallet.copper) parts.push(`${wallet.copper}CP`);
  return parts.length > 0 ? parts.join(', ') : '0CP';
}
