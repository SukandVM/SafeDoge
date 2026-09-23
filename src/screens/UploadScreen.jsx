import { useState, useEffect, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Image,
  Animated, Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import * as Location from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { uploadToCloudinary } from '../lib/cloudinary'
import { riskToColor, riskLevel, localRiskScore } from '../lib/risk'
import firestore from '@react-native-firebase/firestore'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../lib/theme'

const BEHAVIORS = [
  { id: 'calm',       label: 'Calm',       icon: 'leaf-outline', color: '#22C55E' },
  { id: 'alert',      label: 'Alert',      icon: 'eye-outline', color: '#F97316' },
  { id: 'aggressive', label: 'Aggressive', icon: 'warning-outline', color: '#EF4444' },
  { id: 'attacking',  label: 'Attacking',  icon: 'flash-outline', color: '#B91C1C' },
  { id: 'pack',       label: 'Pack',       icon: 'paw-outline', color: '#6B7280' },
]

export default function UploadScreen() {
  const { user, signOut } = useAuth()

  const [photos, setPhotos]       = useState([])
  const [behavior, setBehavior]   = useState(null)
  const [dogCount, setDogCount]   = useState('')
  const [attacked, setAttacked]   = useState(false)
  const [notes, setNotes]         = useState('')
  const [location, setLocation]   = useState(null)
  const [locName, setLocName]     = useState('Fetching location...')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState(0)
  const [done, setDone]           = useState(false)
  const [reportId, setReportId]   = useState(null)
  const [history, setHistory]     = useState([])
  const [risk, setRisk]           = useState(null)   // local risk result for success screen

  const progressAnim = useRef(new Animated.Value(0)).current
  const doneAnim     = useRef(new Animated.Value(0)).current

  // ── GPS ──────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') { setLocName('Location permission denied'); return }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
      try {
        const [p] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude, longitude: loc.coords.longitude,
        })
        setLocName([p.street, p.district, p.city].filter(Boolean).join(', ') || 'Current location')
      } catch {
        setLocName(`${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`)
      }
    })()
  }, [])

  // ── Progress bar animation ────────────────────────────────────
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress, duration: 250, useNativeDriver: false,
    }).start()
  }, [progress])

  // ── Pick photos ───────────────────────────────────────────────
  async function fromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Camera permission required'); return }
    const r = await ImagePicker.launchCameraAsync({ quality: 0.85 })
    if (!r.canceled) addPhoto(r.assets[0])
  }

  async function fromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') { Alert.alert('Gallery permission required'); return }
    const r = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true, quality: 0.85, selectionLimit: 5,
    })
    if (!r.canceled) r.assets.forEach(addPhoto)
  }

  function addPhoto(asset) {
    setPhotos(prev => {
      if (prev.length >= 5) { Alert.alert('Max 5 photos per report'); return prev }
      return [...prev, { uri: asset.uri, name: asset.uri.split('/').pop() || `photo_${Date.now()}.jpg` }]
    })
  }

  // ── Upload one photo to Cloudinary ───────────────────────────
  async function uploadPhoto(photo, index, total) {
    const url = await uploadToCloudinary(photo.uri, `incidents/${user.uid}`)
    setProgress(Math.round(((index + 1) / total) * 75))
    return url
  }

  // ── Local risk score ─────────────────────────────────────────
  // Scores the report from the manually reported behavior (+ pack
  // bonus) entirely on-device — no AI backend required.
  function computeRisk() {
    const score = localRiskScore({ behavior, dogCount })
    return {
      risk_score: score,
      risk_level: riskLevel(score),
      color:      riskToColor(score),
    }
  }

  // ── Submit ────────────────────────────────────────────────────
  async function submit() {
    if (!user)               { Alert.alert('Not signed in'); return }
    if (photos.length === 0) { Alert.alert('Add at least one photo'); return }
    if (!location)           { Alert.alert('Waiting for GPS — try again in a moment'); return }

    setUploading(true)
    setProgress(5)

    try {
      const urls = []
      for (let i = 0; i < photos.length; i++) {
        urls.push(await uploadPhoto(photos[i], i, photos.length))
      }
      setProgress(80)

      const risk = computeRisk()
      setProgress(86)

      const docRef = await firestore().collection('incidents').add({
        reportedBy:     user.uid,
        userEmail:      user.email,
        latitude:       location.lat,
        longitude:      location.lng,
        locationName:   locName,
        behavior,
        dogCount:       dogCount ? parseInt(dogCount) : null,
        reportedAttack: attacked,
        notes:          notes.trim() || null,
        photoUrls:      urls,
        status:         'pending',
        riskScore:      risk.risk_score,
        riskLevel:      risk.risk_level,
        riskColor:      risk.color,
        detectedDogs:   dogCount ? parseInt(dogCount) : null,
        createdAt:      firestore.FieldValue.serverTimestamp(),
      })

      setProgress(100)
      setReportId(docRef.id)
      setRisk(risk)
      setHistory(h => [{
        id: docRef.id, photoCount: photos.length,
        locName, behavior, riskScore: risk.risk_score,
        riskColor: risk.color, time: new Date(),
      }, ...h])

      setDone(true)
      Animated.spring(doneAnim, {
        toValue: 1, useNativeDriver: true, tension: 55, friction: 7,
      }).start()

    } catch (err) {
      Alert.alert('Upload failed', err.message)
      setProgress(0)
    } finally {
      setUploading(false)
    }
  }

  function reset() {
    setPhotos([]); setBehavior(null); setDogCount('')
    setAttacked(false); setNotes(''); setProgress(0)
    setDone(false); setReportId(null); setRisk(null)
    doneAnim.setValue(0)
  }

  // ── Success screen ────────────────────────────────────────────
  if (done) {
    return (
      <SafeAreaView style={s.safe}>
        <Animated.View style={[s.doneWrap, {
          opacity: doneAnim,
          transform: [{ scale: doneAnim.interpolate({ inputRange: [0,1], outputRange: [0.9,1] }) }],
        }]}>
          <View style={s.doneIcon}>
            <Ionicons name="checkmark-circle" size={56} color={colors.green} />
          </View>
          <Text style={s.doneTitle}>Report Submitted</Text>
          <Text style={s.doneSub}>
            {photos.length} photo{photos.length !== 1 ? 's' : ''} saved to database
          </Text>

          {risk && (
            <View style={[s.riskBox, { borderColor: risk.color + '55' }]}>
              <View style={[s.riskDot, { backgroundColor: risk.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.riskScore}>
                  Risk Score: <Text style={{ color: risk.color, fontWeight: '800' }}>{risk.risk_score}</Text>
                  <Text style={s.riskLvl}>  {risk.risk_level}</Text>
                </Text>
                <Text style={s.riskSub}>
                  {risk.risk_score >= 80
                    ? 'Reported behavior risk: SEVERE'
                    : risk.risk_score >= 60
                      ? 'Reported behavior risk: HIGH'
                      : risk.risk_score >= 40
                        ? 'Reported behavior risk: MODERATE'
                        : risk.risk_score >= 20
                          ? 'Reported behavior risk: LOW'
                          : 'Reported behavior risk: MINIMAL'}
                </Text>
              </View>
              <View style={s.riskScale}>
                <Text style={{ color: '#22C55E', fontSize: 10 }}>●</Text>
                <Text style={{ color: '#FACC15', fontSize: 10 }}>●</Text>
                <Text style={{ color: '#F97316', fontSize: 10 }}>●</Text>
                <Text style={{ color: '#DC2626', fontSize: 10 }}>●</Text>
              </View>
            </View>
          )}

          {reportId && (
            <View style={s.idBox}>
              <Text style={s.idLabel}>REPORT ID</Text>
              <Text style={s.idValue}>{reportId.slice(0, 8).toUpperCase()}</Text>
            </View>
          )}
          <View style={s.whereBox}>
            <Text style={s.whereTitle}>Incident Storage Locations</Text>
            <Text style={s.whereItem}>
              <Ionicons name="image-outline" size={14} color={colors.blue} /> Cloudinary &rarr; <Text style={s.hl}>incidents/</Text>
            </Text>
            <Text style={s.whereItem}>
              <Ionicons name="document-text-outline" size={14} color={colors.blue} /> Firestore &rarr; <Text style={s.hl}>incidents</Text> collection
            </Text>
          </View>
          <TouchableOpacity style={s.newBtn} onPress={reset}>
            <Text style={s.newBtnText}>Submit Another Report</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    )
  }

  // ── Upload form ───────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>New Dog Report</Text>
          <Text style={s.headerSub} numberOfLines={1}>{user?.email}</Text>
        </View>
        <TouchableOpacity style={s.signOutBtn} onPress={signOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 140, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* Photos */}
        <View style={s.card}>
          <View style={s.cardHeaderRow}>
            <View style={s.cardTitleRow}>
              <Ionicons name="camera-outline" size={18} color={colors.blue} style={{ marginRight: 6 }} />
              <Text style={s.cardTitle}>Photos</Text>
            </View>
            <Text style={s.cardCount}>{photos.length} / 5</Text>
          </View>
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.thumbRow}>
              {photos.map((p, i) => (
                <View key={i} style={s.thumb}>
                  <Image source={{ uri: p.uri }} style={s.thumbImg} resizeMode="cover" />
                  <TouchableOpacity
                    style={s.thumbRemove}
                    onPress={() => setPhotos(ps => ps.filter((_, j) => j !== i))}
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                  <View style={s.thumbNum}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{i + 1}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
          <View style={s.btnRow}>
            <TouchableOpacity style={s.pickBtn} onPress={fromCamera}>
              <Ionicons name="camera" size={20} color={colors.blue} />
              <Text style={s.pickBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.pickBtn} onPress={fromGallery}>
              <Ionicons name="images" size={20} color={colors.blue} />
              <Text style={s.pickBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
          {photos.length === 0 && (
            <Text style={s.photoHint}>At least 1 photo required to submit</Text>
          )}
        </View>

        {/* Behavior */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Ionicons name="paw-outline" size={18} color={colors.blue} style={{ marginRight: 6 }} />
            <Text style={s.cardTitle}>Behavior <Text style={s.optional}>(optional)</Text></Text>
          </View>
          <View style={s.chipRow}>
            {BEHAVIORS.map(b => {
              const isSelected = behavior === b.id
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[s.chip, isSelected && { backgroundColor: b.color + '12', borderColor: b.color }]}
                  onPress={() => setBehavior(v => v === b.id ? null : b.id)}
                >
                  <Ionicons name={b.icon} size={14} color={isSelected ? b.color : colors.textMuted} />
                  <Text style={[s.chipText, isSelected && { color: b.color, fontWeight: '600' }]}>{b.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Details */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.blue} style={{ marginRight: 6 }} />
            <Text style={s.cardTitle}>Incident Details</Text>
          </View>
          <View style={s.rowFields}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>How many dogs?</Text>
              <TextInput
                style={s.fieldInput}
                placeholder="e.g. 1"
                placeholderTextColor={colors.textMuted}
                value={dogCount}
                onChangeText={t => setDogCount(t.replace(/\D/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={{ width: 16 }} />
            <View style={{ flex: 2.2 }}>
              <Text style={s.fieldLabel}>Aggression/Attack involved?</Text>
              <View style={s.toggleRow}>
                <TouchableOpacity
                  style={[s.toggle, !attacked && s.toggleOn]}
                  onPress={() => setAttacked(false)}
                >
                  <Text style={[s.toggleText, !attacked && s.toggleTextOn]}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggle, attacked && { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: colors.red }]}
                  onPress={() => setAttacked(true)}
                >
                  <Text style={[s.toggleText, attacked && { color: colors.red }]}>Yes ⚠️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <Text style={[s.fieldLabel, { marginTop: 18 }]}>Additional Notes <Text style={s.optional}>(optional)</Text></Text>
          <TextInput
            style={s.textarea}
            placeholder="Describe behavior, collar, specific markings..."
            placeholderTextColor={colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Location */}
        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Ionicons name="location-outline" size={18} color={colors.blue} style={{ marginRight: 6 }} />
            <Text style={s.cardTitle}>Location</Text>
          </View>
          <View style={s.locRow}>
            {location
              ? <View style={s.locDot} />
              : <ActivityIndicator size="small" color={colors.blue} style={{ marginRight: 10 }} />
            }
            <View style={{ flex: 1 }}>
              <Text style={s.locName} numberOfLines={2}>{locName}</Text>
              {location && (
                <Text style={s.locCoords}>
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </Text>
              )}
            </View>
            {location && (
              <View style={s.gpsBadge}>
                <Text style={s.gpsBadgeText}>GPS Sync</Text>
              </View>
            )}
          </View>
        </View>

        {/* Session history */}
        {history.length > 0 && (
          <View style={s.card}>
            <View style={s.cardTitleRow}>
              <Ionicons name="time-outline" size={18} color={colors.blue} style={{ marginRight: 6 }} />
              <Text style={s.cardTitle}>Submitted this session</Text>
            </View>
            {history.map((h, i) => {
              const matchedBehavior = BEHAVIORS.find(b => b.id === h.behavior)
              return (
                <View key={i} style={[s.histRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <View style={[s.histRiskDot, { backgroundColor: h.riskColor || matchedBehavior?.color || colors.textMuted }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.histLoc} numberOfLines={1}>{h.locName}</Text>
                    <Text style={s.histSub}>
                      {h.photoCount} photo{h.photoCount !== 1 ? 's' : ''} &bull; ID: {h.id.slice(0, 8).toUpperCase()}
                      {h.riskScore != null ? `  ·  Risk ${h.riskScore}` : ''}
                    </Text>
                  </View>
                  <Text style={s.histTime}>
                    {h.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              )
            })}
          </View>
        )}

      </ScrollView>

      {/* Submit bar */}
      <View style={s.submitBar}>
        {uploading && (
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, {
              width: progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              backgroundColor: progress === 100 ? colors.green : colors.blue,
            }]} />
          </View>
        )}
        <TouchableOpacity
          style={[s.submitBtn, (uploading || photos.length === 0) && s.submitOff]}
          onPress={submit}
          disabled={uploading || photos.length === 0}
          activeOpacity={0.85}
        >
          {uploading ? (
            <View style={s.submitInner}>
              <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
              <Text style={s.submitText}>
                {progress < 78
                  ? `Uploading... ${progress}%`
                  : 'Saving report details...'}
              </Text>
            </View>
          ) : (
            <View style={s.submitInner}>
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={s.submitText}>
                {photos.length === 0
                  ? 'Add photos to submit'
                  : `Upload ${photos.length} Photo${photos.length !== 1 ? 's' : ''}`}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  headerSub:   { fontSize: 12, color: colors.textMuted, marginTop: 2, maxWidth: 200 },
  signOutBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  signOutText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },

  card: {
    marginHorizontal: 16,
    marginTop: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  cardCount: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  optional:  { fontWeight: '400', fontSize: 12, color: colors.textMuted },

  thumbRow:    { marginBottom: 14 },
  thumb:       { width: 72, height: 72, borderRadius: 10, marginRight: 10, overflow: 'hidden' },
  thumbImg:    { width: '100%', height: '100%' },
  thumbRemove: { position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  thumbNum:    { position: 'absolute', bottom: 3, left: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },

  btnRow:      { flexDirection: 'row', gap: 12 },
  pickBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface2, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.blue, borderRadius: 12, paddingVertical: 13 },
  pickBtnText: { fontSize: 14, fontWeight: '600', color: colors.blue },
  photoHint:   { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 12 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface2, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  chipText:{ fontSize: 13, color: colors.textMuted, fontWeight: '500' },

  rowFields:  { flexDirection: 'row', alignItems: 'flex-start', marginTop: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
  fieldInput: { backgroundColor: colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 11, color: colors.text, fontSize: 15 },

  toggleRow: { flexDirection: 'row', gap: 8 },
  toggle:    { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
  toggleOn:  { backgroundColor: '#EFF6FF', borderColor: colors.blue },
  toggleText:{ fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  toggleTextOn:{ color: colors.blue },

  textarea:  { backgroundColor: colors.surface2, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 14, color: colors.text, fontSize: 14, minHeight: 90, marginTop: 4 },

  locRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locDot:       { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.green, marginRight: 12 },
  locName:      { fontSize: 14, fontWeight: '600', color: colors.text },
  locCoords:    { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  gpsBadge:     { backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  gpsBadgeText: { fontSize: 11, color: colors.green, fontWeight: '700' },

  histRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  histRiskDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  histLoc:  { fontSize: 14, fontWeight: '600', color: colors.text },
  histSub:  { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  histTime: { fontSize: 12, color: colors.textMuted },

  submitBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 16, elevation: 12, shadowColor: '#000000', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.05, shadowRadius: 10 },
  progressTrack: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: 10, overflow: 'hidden' },
  progressFill:  { height: '100%', borderRadius: 2 },
  submitBtn:     { backgroundColor: colors.blue, borderRadius: 14, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  submitOff:     { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  submitInner:   { flexDirection: 'row', alignItems: 'center' },
  submitText:    { color: '#fff', fontSize: 15, fontWeight: '700' },

  doneWrap:  { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, backgroundColor: colors.bg },
  doneIcon:  { width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 8 },
  doneSub:   { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 24 },
  idBox:     { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 24, paddingVertical: 14, alignItems: 'center', marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  idLabel:   { fontSize: 11, color: colors.textMuted, marginBottom: 6, letterSpacing: 1, fontWeight: '600' },
  idValue:   { fontSize: 22, fontWeight: '800', color: colors.blue, letterSpacing: 3 },
  riskBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 24, width: '100%', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  riskDot:   { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  riskScore: { fontSize: 16, fontWeight: '700', color: colors.text },
  riskLvl:   { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  riskSub:   { fontSize: 12, color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' },
  riskScale: { flexDirection: 'row', gap: 2, marginLeft: 10 },
  whereBox:  { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 18, width: '100%', marginBottom: 32, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4 },
  whereTitle:{ fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
  whereItem: { fontSize: 13, color: colors.textMuted, marginBottom: 10, lineHeight: 18, flexDirection: 'row', alignItems: 'center' },
  hl:        { color: colors.blue, fontWeight: '600' },
  newBtn:    { backgroundColor: colors.blue, borderRadius: 14, paddingVertical: 15, paddingHorizontal: 48, elevation: 2, shadowColor: colors.blue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4 },
  newBtnText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
})
