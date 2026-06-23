import { Stack, Link } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '../context/AppContext';
import { FontAwesome } from '@expo/vector-icons';
import { TouchableOpacity, Alert } from 'react-native';
import '../config/i18n';
import { changeLanguage } from '../config/i18n';
import { useTranslation } from 'react-i18next';

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#f8f9fa' },
          headerTitleStyle: { fontWeight: 'bold' },
          headerTintColor: '#333',
        }}
      >
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'HopON',
            headerLeft: () => (
              <TouchableOpacity 
                style={{ marginLeft: 15 }}
                onPress={() => {
                  Alert.alert("Select Language", "Choose your preferred language", [
                    { text: "English", onPress: () => changeLanguage('en') },
                    { text: "हिंदी", onPress: () => changeLanguage('hi') },
                    { text: "मराठी", onPress: () => changeLanguage('mr') },
                    { text: "ಕನ್ನಡ", onPress: () => changeLanguage('kn') },
                    { text: "Cancel", style: "cancel" }
                  ]);
                }}
              >
                <FontAwesome name="language" size={24} color="#00b0ff" />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <Link href={"/vendor-dashboard" as any} asChild>
                <TouchableOpacity style={{ marginRight: 15 }}>
                  <FontAwesome name="user-circle" size={24} color="#00b0ff" />
                </TouchableOpacity>
              </Link>
            )
          }} 
        />
        <Stack.Screen name="trip/[id]" options={{ title: 'Trip Details', headerBackTitle: 'Back' }} />
        <Stack.Screen name="vendor-dashboard" options={{ title: 'Vendor Portal', presentation: 'modal' }} />
      </Stack>
    </AppProvider>
  );
}
