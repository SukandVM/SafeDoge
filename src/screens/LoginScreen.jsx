import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../hooks/useAuth'
import { colors } from '../lib/theme'

export default function LoginScreen() {
  const { signIn, signUp } = useAuth()

  const [mode, setMode]     = useState('login')   // 'login' | 'register'
  const [email, setEmail]   = useState('')
  const [password, setPass] = useState('')
  const [loading, setLoad]  = useState(false)
  const [error, setError]   = useState('')

  async function submit() {
    if (!email.trim() || !password) { setError('Please fill in all fields.'); return }
    setError(''); setLoad(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password)
        Alert.alert('Account created!', 'Check your email to confirm, then sign in.')
        setMode('login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoad(false)
    }
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>

        {/* Logo */}
        <View style={s.logoWrap}>
          <View style={s.logoCircle}>
            <Ionicons name="shield-checkmark" size={38} color={colors.blue} />
          </View>
          <Text style={s.title}>Stray Dog Alert</Text>
          <Text style={s.subtitle}>Community safety reporting</Text>
        </View>

        {/* Card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>

          {/* Email */}
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          {/* Password */}
          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPass}
            secureTextEntry
          />

          {/* Error */}
          {!!error && (
            <View style={s.errorBox}>
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity style={s.btn} onPress={submit} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.btnText}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
            }
          </TouchableOpacity>

          {/* Toggle mode */}
          <TouchableOpacity
            style={s.switchBtn}
            onPress={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError('') }}
          >
            <Text style={s.switchText}>
              {mode === 'login'
                ? "Don't have an account? Create one"
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  kav:  { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },

  logoWrap:   { alignItems: 'center', marginBottom: 36 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#E0E7FF',
  },
  title:     { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 6, letterSpacing: -0.5 },
  subtitle:  { fontSize: 14, color: colors.textMuted },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 24 },

  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: 8 },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 15,
    marginBottom: 18,
  },

  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10,
    borderWidth: 1, borderColor: colors.red,
    padding: 12, marginBottom: 18,
  },
  errorText: { color: colors.red, fontSize: 13, fontWeight: '500' },

  btn: {
    backgroundColor: colors.blue,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: colors.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  switchBtn:  { alignItems: 'center', paddingTop: 20 },
  switchText: { fontSize: 14, color: colors.blue, fontWeight: '600' },
})
