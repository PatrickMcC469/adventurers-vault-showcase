function rollBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const LOOT_TIERS = [
  {
    name: 'Tier 1 - Common',
    minCopper: 0, maxCopper: 20,
    minSilver: 0, maxSilver: 4,
    minGold:   0, maxGold:   0,
    minPlat:   0, maxPlat:   0,
  },
  {
    name: 'Tier 2 - Uncommon',
    minCopper: 0, maxCopper: 0,
    minSilver: 0, maxSilver: 15,
    minGold:   0, maxGold:   10,
    minPlat:   0, maxPlat:   0,
  },
  {
    name: 'Tier 3 - Rare',
    minCopper: 0, maxCopper: 0,
    minSilver: 0, maxSilver: 10,
    minGold:   0, maxGold:   50,
    minPlat:   0, maxPlat:   4,
  },
  {
    name: 'Tier 4 - Legendary',
    minCopper: 0, maxCopper: 0,
    minSilver: 0, maxSilver: 0,
    minGold:   50, maxGold:  200,
    minPlat:   5,  maxPlat:  20,
  },
];

const NAT_1_LINES = [
  "You reach into the chest and pull out a single copper... and drop it.",
  "The only thing you find is a strongly-worded IOU.",
  "Congrats! You found lint. Heroic lint, but lint.",
  "The goblins already got here. Every last coin. Gone.",
  "You stub your toe on the chest. That's the whole reward.",
  "A moth flies out. The real treasure was the friends we made along the way.",
  "You find a note: 'Better luck next time. — The DM'",
  "The floor gives way and you fall into an empty room. Still no loot.",
  "Turns out the real treasure was doing zero damage to your wallet.",
  "You triumphantly open the chest. Inside: another chest. Also empty.",
];

const NAT_20_BONUS = { copper: 0, silver: 0, electrum: 0, gold: 10, platinum: 1 };

export function calculateLoot(tierIndex, roll) {
  if (roll === 1) {
    const line = NAT_1_LINES[Math.floor(Math.random() * NAT_1_LINES.length)];
    return {
      isNat1: true,
      isNat20: false,
      flavor: line,
      loot: { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 },
    };
  }

  const tier = LOOT_TIERS[tierIndex];
  const multiplier = roll >= 15 ? 1.5 : 1;

  const loot = {
    copper:   Math.round(rollBetween(tier.minCopper, tier.maxCopper) * multiplier),
    silver:   Math.round(rollBetween(tier.minSilver, tier.maxSilver) * multiplier),
    electrum: 0,
    gold:     Math.round(rollBetween(tier.minGold,   tier.maxGold)   * multiplier),
    platinum: Math.round(rollBetween(tier.minPlat,   tier.maxPlat)   * multiplier),
  };

  const isNat20 = roll === 20;
  if (isNat20) {
    loot.gold     += NAT_20_BONUS.gold;
    loot.platinum += NAT_20_BONUS.platinum;
  }

  return {
    isNat1: false,
    isNat20,
    flavor: isNat20 ? 'Natural 20! The vault practically falls open before you.' : null,
    loot,
  };
}
