export const DENOMINATIONS = ['copper', 'silver', 'electrum', 'gold', 'platinum'];

// How many copper pieces each denomination is worth
export const COPPER_VALUE = {
  copper: 1,
  silver: 10,
  electrum: 50,
  gold: 100,
  platinum: 1000,
};

// How many of the denomination below equals one of this denomination
export const CONVERSION_RATE = {
  silver: 10,      // 10 copper = 1 silver
  electrum: 5,     // 5 silver = 1 electrum
  gold: 2,         // 2 electrum = 1 gold  (or 10 silver if electrum disabled)
  platinum: 10,    // 10 gold = 1 platinum
};

export const DISPLAY_NAMES = {
  copper: 'Copper',
  silver: 'Silver',
  electrum: 'Electrum',
  gold: 'Gold',
  platinum: 'Platinum',
};

export const ABBREVIATIONS = {
  copper: 'CP',
  silver: 'SP',
  electrum: 'EP',
  gold: 'GP',
  platinum: 'PP',
};
