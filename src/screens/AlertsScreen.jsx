import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, Share,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { colors } from '../lib/theme'

const MOCK_ALERTS = [
  { id: '1', type: 'critical', behavior: 'aggressive', title: 'Aggressive Dog Alert', desc: 'A large uncollared pitbull was spotted behaving aggressively towards pedestrians near the park.', location: 'Mission Dolores Park', time: '5m ago', distance: '150m away', color: colors.red },
  { id: '2', type: 'warning', behavior: 'pack', title: 'Pack of Strays', desc: 'Group of 4-5 stray dogs roaming together. Avoid running or walking small pets nearby.', location: 'Potrero Hill (18th St)', time: '24m ago', distance: '850m away', color: '#722ed1' },
  { id: '3', type: 'info', behavior: 'alert', title: 'Lost Dog Spotted', desc: 'Medium sized brown dog running across the lanes. Seems panicked but not hostile.', location: 'Cesar Chavez St', time: '1h ago', distance: '1.2km away', color: colors.yellow },
  { id: '4', type: 'info', behavior: 'calm', title: 'Stray Feeding Area', desc: 'Two calm dogs resting under the bridge. Residents have placed food and water.', location: 'Division St Pathway', time: '3h ago', distance: '2.0km away', color: colors.green },
]

export default function AlertsScreen() {
  const [filter, setFilter] = useState('all') // 'all' | 'critical' | 'near'
  const [mutedAlerts, setMutedAlerts] = useState([])

  const filteredData = MOCK_ALERTS.filter(alert => {
    if (filter === 'critical') return alert.type === 'critical' || alert.behavior === 'aggressive'
    if (filter === 'near') return alert.distance.includes('m away') && !alert.distance.includes('km')
    return true
  })

  const shareAlert = async (alertItem) => {
    try {
      await Share.share({
        message: `[STRAY DOG ALERT] ${alertItem.title} at ${alertItem.location} (${alertItem.distance}). Be safe!`,
      })
    } catch (error) {
      Alert.alert('Error', 'Unable to share alert.')
    }
  }

  const toggleMute = (id) => {
    setMutedAlerts(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const getBehaviorIcon = (behavior) => {
    switch (behavior) {
      case 'aggressive':
        return 'warning-outline'
      case 'pack':
        return 'paw-outline'
      case 'alert':
        return 'eye-outline'
      case 'calm':
        return 'heart-outline'
      default:
        return 'information-circle-outline'
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerTitleRow}>
          <Ionicons name="notifications-outline" size={24} color={colors.blue} style={{ marginRight: 8 }} />
          <Text style={s.headerTitle}>Community Alerts</Text>
        </View>
        <Text style={s.headerSubtitle}>Real-time safety broadcasts nearby</Text>
      </View>

      {/* Filter Tabs */}
      <View style={s.filterRow}>
        {[
          { key: 'all', label: 'All Alerts', icon: 'list-outline' },
          { key: 'critical', label: 'High Risk', icon: 'warning-outline' },
          { key: 'near', label: 'Near Me', icon: 'location-outline' },
        ].map(item => {
          const isActive = filter === item.key
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.filterBtn, isActive && s.filterBtnActive]}
              onPress={() => setFilter(item.key)}
            >
              <Ionicons name={item.icon} size={14} color={isActive ? '#fff' : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[s.filterBtnText, isActive && s.filterBtnTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Alerts List */}
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        contentContainerStyle={s.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Ionicons name="shield-outline" size={48} color={colors.textMuted} style={{ marginBottom: 16 }} />
            <Text style={s.emptyTitle}>All Clear</Text>
            <Text style={s.emptyDesc}>No active stray dog alerts match your current filter.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isMuted = mutedAlerts.includes(item.id)
          return (
            <View style={[s.card, isMuted && s.cardMuted]}>
              {/* Top Banner Row */}
              <View style={s.cardHeader}>
                <View style={[s.badge, { backgroundColor: item.color + '10', borderColor: item.color + '20' }]}>
                  <Ionicons name={getBehaviorIcon(item.behavior)} size={12} color={item.color} style={{ marginRight: 4 }} />
                  <Text style={[s.badgeText, { color: item.color }]}>
                    {item.behavior.toUpperCase()}
                  </Text>
                </View>
                <View style={s.metaRow}>
                  <Text style={s.metaText}>{item.distance}</Text>
                  <Text style={s.metaDot}>&bull;</Text>
                  <Text style={s.metaText}>{item.time}</Text>
                </View>
              </View>

              {/* Title & Desc */}
              <Text style={[s.cardTitle, isMuted && s.textMuted]}>{item.title}</Text>
              <Text style={[s.cardDesc, isMuted && s.textMuted]}>{item.desc}</Text>

              {/* Location indicator */}
              <View style={s.locRow}>
                <Ionicons name="location" size={14} color={colors.blue} style={s.locIcon} />
                <Text style={s.locText} numberOfLines={1}>{item.location}</Text>
              </View>

              {/* Action buttons */}
              <View style={s.cardActions}>
                <TouchableOpacity style={s.actionBtn} onPress={() => shareAlert(item)}>
                  <Ionicons name="share-social-outline" size={14} color={colors.blue} style={{ marginRight: 6 }} />
                  <Text style={s.actionBtnText}>Share Alert</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtnSec]} onPress={() => toggleMute(item.id)}>
                  <Ionicons
                    name={isMuted ? 'notifications-outline' : 'notifications-off-outline'}
                    size={14}
                    color={colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={s.actionBtnSecText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
      />
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
  },
  filterBtnActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  filterBtnTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardMuted: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaDot: {
    fontSize: 12,
    color: colors.textMuted,
    marginHorizontal: 5,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  locIcon: {
    marginRight: 8,
  },
  locText: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.blue,
    paddingVertical: 11,
  },
  actionBtnText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnSec: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
  },
  actionBtnSecText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  textMuted: {
    color: colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
})
