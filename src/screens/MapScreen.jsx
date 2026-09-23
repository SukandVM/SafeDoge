import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import firestore from '@react-native-firebase/firestore'
import { colors } from '../lib/theme'
import { riskToColor, riskLevel, RISK_LEGEND, hexWithAlpha } from '../lib/risk'
import { fetchNearbyStreets } from '../lib/overpass'

const MAX_STREET_INCIDENTS = 12   // cap Overpass calls (public API rate limits)
const STREET_RADIUS = 350         // meters around each incident
const DEFAULT_REGION = {
  latitude: 37.7749,
  longitude: -122.4194,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
}

export default function MapScreen() {
  const mapRef = useRef(null)

  const [region, setRegion]       = useState(DEFAULT_REGION)
  const [userLoc, setUserLoc]     = useState(null)
  const [incidents, setIncidents] = useState([])
  const [streets, setStreets]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [streetBusy, setStreetBusy] = useState(false)
  const [focusIncident, setFocusIncident] = useState(null)

  // ── GPS ─────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
      setUserLoc(coords)
      setRegion(r => ({ ...r, ...coords }))
    })()
  }, [])
  useEffect(() => {
    const sub = firestore()
      .collection('incidents')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .onSnapshot(
        snap => {
          const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          setIncidents(list)
          setLoading(false)
        },
        err => {
          console.warn('Incidents stream failed:', err?.message)
          setLoading(false)
        },
      )
    return () => sub()
  }, [])

  // ── Street colouring ─────────────────────────────────────────
  // Pulls real road geometry from OSM for the nearest incidents and
  // tints each street by that incident's risk score (green → red),
  // matching Google-Maps-traffic styling.
  const refreshStreets = useCallback(async () => {
    if (incidents.length === 0) { setStreets([]); return }

    const nearby = [...incidents]
      .sort((a, b) => {
        const dA = a.latitude != null && a.longitude != null
          ? (a.latitude - region.latitude) ** 2 + (a.longitude - region.longitude) ** 2
          : Infinity
        const dB = b.latitude != null && b.longitude != null
          ? (b.latitude - region.latitude) ** 2 + (b.longitude - region.longitude) ** 2
          : Infinity
        return dA - dB
      })
      .filter(i => i.latitude != null && i.longitude != null)
      .slice(0, MAX_STREET_INCIDENTS)

    setStreetBusy(true)
    try {
      const results = await Promise.all(nearby.map(async inc => {
        try {
          const roads = await fetchNearbyStreets(
            { latitude: inc.latitude, longitude: inc.longitude },
            STREET_RADIUS,
          )
          const score = inc.riskScore ?? 50
          const color = riskToColor(score)
          return roads.map(st => ({ ...st, riskScore: score, color }))
        } catch {
          return []
        }
      }))
      // Aggregate by OSM way id, keeping the highest risk per street.
      const map = new Map()
      for (const batch of results) {
        for (const st of batch) {
          const key = String(st.id)
          const existing = map.get(key)
          if (!existing || st.riskScore > existing.riskScore) {
            map.set(key, {
              key,
              name: st.name,
              highway: st.highway,
              coordinates: st.coordinates,
              color: st.color,
              riskScore: st.riskScore,
            })
          }
        }
      }
      setStreets([...map.values()])
    } finally {
      setStreetBusy(false)
    }
  }, [incidents, region.latitude, region.longitude])

  useEffect(() => { refreshStreets() }, [refreshStreets])

  const goToIncident = (inc) => {
    setFocusIncident(inc.id)
    mapRef.current?.animateToRegion({
      latitude: inc.latitude,
      longitude: inc.longitude,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    }, 600)
  }

  const scoreOf = (inc) => inc.riskScore ?? 50

  const centerOnMe = () => {
    if (!userLoc) return
    mapRef.current?.animateToRegion({
      ...userLoc,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    }, 400)
  }

  return (
    <View style={s.root}>
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={s.map}
        region={region}
        showsUserLocation={userLoc != null}
        showsCompass
        showsScale={Platform.OS === 'ios'}
        toolbarEnabled={false}
      >
        {streets.map(st => (
          <Polyline
            key={st.key}
            coordinates={st.coordinates}
            strokeColor={hexWithAlpha(st.color, 0.85)}
            strokeWidth={st.riskScore >= 80 ? 9 : 7}
          />
        ))}

        {incidents.filter(i => i.latitude != null && i.longitude != null).map(inc => {
          const score = scoreOf(inc)
          const color = riskToColor(score)
          const focused = focusIncident === inc.id
          return (
            <Marker
              key={inc.id}
              coordinate={{ latitude: inc.latitude, longitude: inc.longitude }}
              onPress={() => goToIncident(inc)}
              tracksViewChanges={false}
            >
              <View style={[s.markerWrap, focused && s.markerWrapFocus]}>
                <View style={[s.marker, { backgroundColor: color }]}>
                  <Ionicons name="paw" size={11} color="#fff" />
                </View>
              </View>
            </Marker>
          )
        })}
      </MapView>

      {/* Header */}
      <SafeAreaView style={s.headerOverlay} edges={['top']} pointerEvents="box-none">
        <View style={s.headerRow} pointerEvents="box-none">
          <View style={s.headerCard}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.blue} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={s.headerTitle}>Risk Map</Text>
              <Text style={s.headerSub}>
                {loading
                  ? 'Loading incidents…'
                  : `${incidents.length} incident${incidents.length !== 1 ? 's' : ''} · streets tinted by reported risk`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.refreshBtn, streetBusy && { opacity: 0.6 }]}
            onPress={refreshStreets}
            disabled={streetBusy}
          >
            {streetBusy
              ? <ActivityIndicator size="small" color={colors.blue} />
              : <Ionicons name="refresh" size={18} color={colors.blue} />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* GPS center button */}
      <TouchableOpacity
        style={[s.gpsBtn, !userLoc && { opacity: 0.4 }]}
        onPress={centerOnMe}
        disabled={!userLoc}
      >
        <Ionicons name="locate" size={20} color={colors.blue} />
      </TouchableOpacity>

      {/* Traffic legend */}
      <View style={s.legend}>
        <Text style={s.legendTitle}>Street risk</Text>
        {RISK_LEGEND.map(item => (
          <View key={item.score} style={s.legendRow}>
            <View style={[s.legendSwatch, { backgroundColor: item.color }]} />
            <Text style={s.legendLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Incident list */}
      {!loading && incidents.length > 0 && (
        <View style={s.bottomCard}>
          <Text style={s.bottomTitle}>Highest risk nearby</Text>
          {[...incidents]
            .sort((a, b) => scoreOf(b) - scoreOf(a))
            .slice(0, 3)
            .map(inc => (
              <TouchableOpacity
                key={inc.id}
                style={s.bottomRow}
                onPress={() => goToIncident(inc)}
              >
                <View style={[s.bottomDot, { backgroundColor: riskToColor(scoreOf(inc)) }]} />
                <Text style={s.bottomName} numberOfLines={1}>
                  {inc.locationName || `${inc.latitude?.toFixed(4)}, ${inc.longitude?.toFixed(4)}`}
                </Text>
                <Text style={[s.bottomScore, { color: riskToColor(scoreOf(inc)) }]}>
                  {scoreOf(inc)} · {riskLevel(scoreOf(inc))}
                </Text>
              </TouchableOpacity>
            ))}
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  map:  { ...StyleSheet.absoluteFillObject },

  headerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, zIndex: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  headerSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  refreshBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },

  gpsBtn: {
    position: 'absolute', right: 16, top: 90,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, zIndex: 10,
  },

  legend: {
    position: 'absolute', right: 12, top: 130,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6,
  },
  legendTitle: { fontSize: 11, fontWeight: '800', color: colors.text, marginBottom: 6, letterSpacing: 0.3 },
  legendRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendSwatch: { width: 14, height: 6, borderRadius: 3, marginRight: 8 },
  legendLabel:  { fontSize: 11, color: colors.textMuted },

  markerWrap: {
    padding: 3, borderRadius: 14, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 3,
  },
  markerWrapFocus: { borderColor: colors.blue, transform: [{ scale: 1.15 }] },
  marker: {
    width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
  },

  bottomCard: {
    position: 'absolute', left: 12, right: 12, bottom: 14,
    backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 16,
    padding: 14, borderWidth: 1, borderColor: colors.border, elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08, shadowRadius: 8,
  },
  bottomTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 8 },
  bottomRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  bottomDot:   { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  bottomName:  { flex: 1, fontSize: 13, color: colors.text, fontWeight: '600' },
  bottomScore: { fontSize: 12, fontWeight: '800' },
})