import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../theme';
import { useSaathi } from '../context/SaathiContext';
import { googleAuth } from '../api';
import { GOOGLE } from '../googleConfig';

// Native Google Sign-In (no browser redirect, so no "Access blocked" error).
// The WEB client ID is used so the ID token's audience matches the backend.
GoogleSignin.configure({
  webClientId: GOOGLE.webClientId,
  offlineAccess: false,
});

// onSuccess(user) is called after the backend accepts the Google token.
export default function GoogleButton({ label = 'Continue with Google', onSuccess, onError, disabled }) {
  const { t } = useSaathi();
  const [busy, setBusy] = useState(false);
  const request = true;

  const promptAsync = async () => {
    try {
      setBusy(true);
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Make sure the account chooser appears every time.
      try { await GoogleSignin.signOut(); } catch {}
      const result = await GoogleSignin.signIn();

      // Newer library versions wrap the result: { type, data }.
      if (result?.type === 'cancelled') return;
      const idToken = result?.data?.idToken || result?.idToken;

      if (!idToken) {
        onError?.('Google sign-in returned no ID token. Check the web client ID.');
        return;
      }

      const user = await googleAuth(idToken);
      onSuccess?.(user);
    } catch (e) {
      if (e?.code === statusCodes.SIGN_IN_CANCELLED) return;
      if (e?.code === statusCodes.IN_PROGRESS) return;
      console.error('Google sign-in failed:', e?.code, e?.message, e);
      const hint =
        e?.code === '10' || e?.code === 10 || /DEVELOPER_ERROR/i.test(e?.message || '')
          ? ' (Android OAuth client: check package name and SHA-1)'
          : '';
      onError?.((e?.message || t('Google sign-in failed. Please try again.')) + hint);
    } finally {
      setBusy(false);
    }
  };

  const off = disabled || busy || !request;
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
        <Text style={{ marginHorizontal: 12, color: C.grey, fontWeight: '700' }}>{t('or')}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: C.line }} />
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={promptAsync}
        disabled={off}
        activeOpacity={0.8}
        style={{
          minHeight: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
          backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 20, opacity: off ? 0.6 : 1,
          shadowColor: '#0F2E5C', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3,
        }}
      >
        {busy ? <ActivityIndicator color={C.teal} /> : <Ionicons name="logo-google" size={22} color="#DB4437" />}
        <Text style={{ fontSize: 18, fontWeight: '700', color: C.text, marginLeft: 12 }}>{t(label)}</Text>
      </TouchableOpacity>
    </View>
  );
}
