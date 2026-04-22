import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, Switch, Platform,
} from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { auth, db } from '../lib/firebase';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink700:  '#4A453E',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  coral:   '#EB8B7C',
  mint:    '#8FBFA9',
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mda_default', {
      name: 'MDA 기본 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4A547',
    });
  }

  // Expo push token (프로젝트 ID 필요, 없으면 null 반환)
  try {
    const expoPushTokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const token = expoPushTokenData.data;

    // Firestore에 토큰 저장
    await updateDoc(doc(db, 'users', userId), { fcm_token: token });
    return token;
  } catch {
    return null;
  }
}

export function SettingsScreen() {
  const [user, setUser] = useState(auth.currentUser);
  const [notifications, setNotifications] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) checkNotifPermission();
    });
  }, []);

  async function checkNotifPermission() {
    const { status } = await Notifications.getPermissionsAsync();
    setNotifications(status === 'granted');
  }

  async function handleNotifToggle(value: boolean) {
    if (notifLoading || !user) return;
    setNotifLoading(true);
    try {
      if (value) {
        const token = await registerForPushNotifications(user.uid);
        setNotifications(token !== null);
        if (!token) {
          Alert.alert('알림 권한', '설정 앱에서 알림 권한을 허용해주세요.');
        }
      } else {
        await updateDoc(doc(db, 'users', user.uid), { fcm_token: null });
        setNotifications(false);
      }
    } finally {
      setNotifLoading(false);
    }
  }

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => signOut(auth),
      },
    ]);
  };

  const initials = (user?.displayName ?? user?.email ?? '?').slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.ivory }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.header}>설정 ⚙️</Text>

        {/* 프로필 */}
        <View style={[styles.card, { backgroundColor: C.cream, borderColor: C.beige }]}>
          <View style={[styles.avatar, { backgroundColor: C.beige }]}>
            <Text style={[styles.avatarText, { color: C.ink700 }]}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: C.ink900 }]}>
              {user?.displayName ?? '사용자'}
            </Text>
            <Text style={[styles.email, { color: C.ink500 }]}>{user?.email ?? ''}</Text>
          </View>
        </View>

        {/* 알림 설정 */}
        <View style={[styles.section, { backgroundColor: C.cream, borderColor: C.beige }]}>
          <Text style={[styles.sectionTitle, { color: C.ink500 }]}>알림</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: C.ink900 }]}>푸시 알림</Text>
              <Text style={{ fontSize: 11, color: C.ink300, marginTop: 1 }}>
                태스크 마감, 저녁 보고서 알림
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={handleNotifToggle}
              disabled={notifLoading}
              trackColor={{ false: C.beige, true: C.mustard + '80' }}
              thumbColor={notifications ? C.mustard : C.ink300}
            />
          </View>
        </View>

        {/* 앱 정보 */}
        <View style={[styles.section, { backgroundColor: C.cream, borderColor: C.beige }]}>
          <Text style={[styles.sectionTitle, { color: C.ink500 }]}>앱 정보</Text>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: C.ink900 }]}>버전</Text>
            <Text style={[styles.rowValue, { color: C.ink500 }]}>1.0.0</Text>
          </View>
          <View style={[styles.row, styles.rowBorder, { borderColor: C.beige }]}>
            <Text style={[styles.rowLabel, { color: C.ink900 }]}>플랫폼</Text>
            <Text style={[styles.rowValue, { color: C.ink500 }]}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
          </View>
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: C.coral + '60' }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Text style={[styles.logoutText, { color: C.coral }]}>로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, gap: 12 },
  header: { fontSize: 22, fontWeight: '700', color: '#2D2A26', marginBottom: 8 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '600' },
  profileInfo: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 13 },
  section: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: {
    fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  rowBorder: { borderTopWidth: 1 },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14 },
  logoutBtn: {
    paddingVertical: 14, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', marginTop: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '600' },
});
