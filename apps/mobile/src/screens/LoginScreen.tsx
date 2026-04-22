'use client';

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { GOOGLE_WEB_CLIENT_ID } from '../lib/auth';

WebBrowser.maybeCompleteAuthSession();

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  mustard: '#D4A547',
};

export function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const [, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        setLoading(true);
        const credential = GoogleAuthProvider.credential(id_token);
        signInWithCredential(auth, credential).catch((e) => {
          setLoading(false);
          Alert.alert('로그인 실패', e.message);
        });
      }
    } else if (response?.type === 'error') {
      Alert.alert('로그인 오류', response.error?.message ?? '알 수 없는 오류');
    }
  }, [response]);

  const handleLogin = async () => {
    if (!GOOGLE_WEB_CLIENT_ID || GOOGLE_WEB_CLIENT_ID.includes('REPLACE')) {
      Alert.alert('설정 필요', 'Google Web Client ID를 .env 파일에 설정해주세요.\n\nFirebase Console → Authentication → Sign-in method → Google → Web client ID');
      return;
    }
    setLoading(true);
    try {
      await promptAsync();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.ivory }]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.ivory} />

      <View style={styles.content}>
        <Text style={styles.logo}>🗒️</Text>
        <Text style={styles.title}>MDA</Text>
        <Text style={styles.subtitle}>My Daily Agent</Text>
        <Text style={styles.desc}>
          할 일, 일정, 감정을 자유롭게 입력하면{'\n'}AI가 자동으로 분류하고 관리합니다
        </Text>

        <TouchableOpacity
          style={[styles.googleBtn, { backgroundColor: C.cream, borderColor: C.beige }]}
          onPress={handleLogin}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={C.mustard} />
          ) : (
            <>
              <Text style={styles.googleIcon}>G</Text>
              <Text style={[styles.googleText, { color: C.ink900 }]}>Google로 시작하기</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={[styles.footer, { color: C.ink500 }]}>
        로그인하면 서비스 이용약관에 동의하는 것으로 간주됩니다
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  logo: { fontSize: 64, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: '700', color: '#2D2A26', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#7C756B', marginTop: -8 },
  desc: {
    fontSize: 14, color: '#7C756B', textAlign: 'center', lineHeight: 22,
    marginTop: 16, marginBottom: 24,
  },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 24, paddingVertical: 14,
    borderRadius: 16, borderWidth: 1,
    width: '100%', justifyContent: 'center',
    minHeight: 52,
  },
  googleIcon: { fontSize: 16, fontWeight: '700', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 11, paddingHorizontal: 32, paddingBottom: 16 },
});
