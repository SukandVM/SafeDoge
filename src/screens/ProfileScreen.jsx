import React from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../lib/theme'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    )
  }

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U'

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.container} showsVerticalScrollIndicator={false}>
        
        {/* User Card */}
        <View style={s.profileCard}>
          <View style={s.avatarCircle}>
            <Text style={s.avatarText}>{userInitial}</Text>
          </View>
          <Text style={s.userEmail}>{user?.email || 'user@example.com'}</Text>
          <View style={s.statusBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.blue} style={{ marginRight: 4 }} />
            <Text style={s.userStatus}>Active Responder</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statValue}>3</Text>
            <Text style={s.statLabel}>Reports</Text>
          </View>
          <View style={[s.statBox, s.borderLeftRight]}>
            <Text style={[s.statValue, { color: colors.blue }]}>14</Text>
            <Text style={s.statLabel}>Alerts Checked</Text>
          </View>
          <View style={s.statBox}>
            <Text style={[s.statValue, { color: colors.green }]}>98%</Text>
            <Text style={s.statLabel}>Trust Score</Text>
          </View>
        </View>

        {/* Safety Tips Banner */}
        <View style={s.bannerCard}>
          <View style={s.bannerTitleRow}>
            <Ionicons name="bulb-outline" size={18} color={colors.orange} style={{ marginRight: 6 }} />
            <Text style={s.bannerTitle}>Safety Advice</Text>
          </View>
          <Text style={s.bannerDesc}>
            If you encounter an aggressive pack of stray dogs, avoid direct eye contact and back away slowly. Never turn your back or run.
          </Text>
        </View>

        {/* Options Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Account Options</Text>
          
          <TouchableOpacity 
            style={s.optionRow} 
            onPress={() => Alert.alert('Notifications', 'Toggle alert sounds & notification radius.')}
          >
            <Ionicons name="notifications-outline" size={20} color={colors.textMuted} style={s.optionIcon} />
            <Text style={s.optionText}>Alert Settings</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={s.optionArrow} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={s.optionRow} 
            onPress={() => Alert.alert('Offline Maps', 'Download neighborhood grids for offline report logging.')}
          >
            <Ionicons name="map-outline" size={20} color={colors.textMuted} style={s.optionIcon} />
            <Text style={s.optionText}>Offline Map Regions</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={s.optionArrow} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={s.optionRow} 
            onPress={() => Share.share({ message: 'Join the Stray Dog Alert network to make our neighborhood safer! Download the app today.' })}
          >
            <Ionicons name="people-outline" size={20} color={colors.textMuted} style={s.optionIcon} />
            <Text style={s.optionText}>Invite Neighbors</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={s.optionArrow} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[s.optionRow, { borderBottomWidth: 0 }]} 
            onPress={() => Alert.alert('Help & Legal', 'Version 1.0.0. Contact community safety support at support@straydogalert.org')}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} style={s.optionIcon} />
            <Text style={s.optionText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={s.optionArrow} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={s.signOutBtnText}>Sign Out of Account</Text>
        </TouchableOpacity>

        <Text style={s.versionText}>Stray Dog Alert &bull; Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  profileCard: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 24,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.blue,
  },
  userEmail: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  userStatus: {
    fontSize: 12,
    color: colors.blue,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    marginBottom: 20,
    width: '100%',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  borderLeftRight: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '600',
  },
  bannerCard: {
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.18)',
    padding: 18,
    marginBottom: 24,
    width: '100%',
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.orange,
  },
  bannerDesc: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: '100%',
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginVertical: 12,
    marginLeft: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionIcon: {
    marginRight: 14,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  optionArrow: {
    marginLeft: 8,
  },
  signOutBtn: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 24,
  },
  signOutBtnText: {
    color: colors.red,
    fontSize: 16,
    fontWeight: '700',
  },
  versionText: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10,
  },
})
