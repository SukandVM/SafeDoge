import 'react-native-gesture-handler'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
 
import { AuthProvider, useAuth } from './src/hooks/useAuth'
import { colors } from './src/lib/theme'
import LoginScreen  from './src/screens/LoginScreen'
import TabNavigator  from './src/navigation/TabNavigator'

const Stack = createNativeStackNavigator()

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card:        colors.surface,
    border:      colors.border,
    text:        colors.text,
  },
}

function RootNavigator() {
  const { user, loading } = useAuth()
  if (loading) return null   // keeps the splash screen visible while restoring session

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {user
        ? <Stack.Screen name="MainTabs" component={TabNavigator} />
        : <Stack.Screen name="Login"    component={LoginScreen}  />
      }
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
