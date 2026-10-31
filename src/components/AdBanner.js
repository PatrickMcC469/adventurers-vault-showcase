import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

const ANDROID_AD_UNIT_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const IOS_AD_UNIT_ID     = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

const adUnitId = __DEV__
  ? TestIds.BANNER
  : Platform.OS === 'ios'
    ? IOS_AD_UNIT_ID
    : ANDROID_AD_UNIT_ID;

export default function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 50,
    backgroundColor: '#0d1117',
    borderTopWidth: 1,
    borderTopColor: '#1e1e3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
