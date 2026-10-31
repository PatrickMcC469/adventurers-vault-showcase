# Adventurer's Vault

A mobile coin and wallet tracker for tabletop RPG players. It handles D&D currency math automatically: conversion between coin types, making change, and transaction history. Coins appear as physical objects in a vault and roll around as you tilt your phone.

**Released on iOS and Android** · React Native (Expo) · Solo project by Wandering Turtle Games

> This repository is a **source-code sample** for portfolio review. App configuration, store credentials, and assets are not included. See [NOTICE.md](NOTICE.md).

---

## Highlights

- **Currency engine:** Converts coins up automatically (enough silver becomes gold) and makes change when you spend. Spending draws from the largest coins first and breaks smaller coins only when needed. Purchases you can't afford are rejected before anything is written.
- **Custom currencies:** Players can define their own denominations and exchange rates for homebrew settings.
- **Tilt physics:** The phone's accelerometer sets the direction of gravity for the coins in the vault, so they slide and pile up as you move the phone.
- **Offline-first:** All data is stored on the device in SQLite. No account is required.
- **Freemium model:** RevenueCat handles the one-time Pro unlock. AdMob banner ads are hidden automatically for Pro users.
- **Shipped from Windows:** Built with EAS cloud builds and taken through Google Play closed testing to production.

## How the currency math works

`src/utils/currency.js` keeps every coin type but does all comparisons in a single base unit:

```js
walletToCopper(wallet)          // collapse any wallet to its value in copper
copperToWallet(copper, useEP)   // expand copper back out, highest coin first
canAfford(wallet, cost)         // compare in copper before touching any coins
subtractFromWallet(...)         // spend from the largest coins, break down only as needed
```

Comparing in one unit avoids rounding problems across mixed coins. Keeping each coin type separately respects what the player actually holds.

## Data model

Local SQLite (`src/database/db.js`) with tables for `campaigns`, `characters`, `wallets`, `transactions`, `settings`, and user-defined `currency_templates` and `currency_denominations`. Each campaign has its own character and wallet, and every change is logged with a note and timestamp.

## Project layout

| Folder | What's in it |
|---|---|
| `src/screens/` | One file per screen: home, wallet, transactions, history, loot, custom currency, premium, settings |
| `src/components/` | The vault, draggable coins, coin purse, treasure chest, and ad banner |
| `src/utils/` | Currency math, a loot generator with tiered random rewards, and purchase handling |
| `src/database/` | Schema setup and query functions |
| `src/constants/` | Denomination configuration and exchange rates |

## Tech

React Native 0.81 · Expo SDK 54 · expo-sqlite · expo-sensors · React Navigation · RevenueCat · Google AdMob · EAS Build · AI-assisted development with Claude Code
