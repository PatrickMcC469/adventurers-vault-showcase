import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Platform } from 'react-native';

const IOS_API_KEY   = 'REVENUECAT_IOS_KEY';
const ANDROID_API_KEY = 'PLACEHOLDER'; // add when Google Play is connected

export function initPurchases() {
  Purchases.setLogLevel(LOG_LEVEL.ERROR);
  const apiKey = Platform.OS === 'ios' ? IOS_API_KEY : ANDROID_API_KEY;
  Purchases.configure({ apiKey });
}

export async function getIsPremium() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch (e) {
    return false;
  }
}

export async function purchasePremium() {
  try {
    const offerings = await Purchases.getOfferings();
    const pkg = offerings.current?.availablePackages?.[0];
    if (!pkg) throw new Error('No packages available');
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch (e) {
    if (!e.userCancelled) throw e;
    return false;
  }
}

export async function restorePurchases() {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active['premium'] !== undefined;
  } catch (e) {
    return false;
  }
}
