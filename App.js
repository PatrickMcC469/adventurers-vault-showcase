import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/database/db';
import { initPurchases } from './src/utils/purchases';

import HomeScreen from './src/screens/HomeScreen';
import WalletScreen from './src/screens/WalletScreen';
import TransactionScreen from './src/screens/TransactionScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CustomCurrencyScreen from './src/screens/CustomCurrencyScreen';
import PremiumScreen from './src/screens/PremiumScreen';
import LootScreen from './src/screens/LootScreen';

const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: '#16213e' },
  headerTintColor: '#ffd700',
  headerTitleStyle: { fontWeight: 'bold' },
};

export default function App() {
  useEffect(() => { initPurchases(); }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home" screenOptions={screenOptions}>
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Wallet"
            component={WalletScreen}
            options={({ route }) => ({ title: route.params.campaignName })}
          />
          <Stack.Screen
            name="Transaction"
            component={TransactionScreen}
            options={({ route }) => ({
              title: route.params.type === 'add' ? 'Add Coins' : 'Spend Coins',
            })}
          />
          <Stack.Screen
            name="History"
            component={HistoryScreen}
            options={{ title: 'History' }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
          <Stack.Screen
            name="CustomCurrency"
            component={CustomCurrencyScreen}
            options={{ title: 'Custom Currency' }}
          />
          <Stack.Screen
            name="Premium"
            component={PremiumScreen}
            options={{ title: 'Go Premium', headerShown: false }}
          />
          <Stack.Screen
            name="Loot"
            component={LootScreen}
            options={{ title: 'Loot the Room' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
