import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { isDark, toggleTheme, colors } = useTheme();
  const styles = getStyles(colors);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t('settings.title', 'Settings'), 
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.textPrimary,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <FontAwesome name="arrow-left" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          )
        }} 
      />
      <View style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.appearance', 'Appearance')}</Text>
          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <FontAwesome name={isDark ? "moon-o" : "sun-o"} size={20} color={colors.primary} style={{ marginRight: 12, width: 24, textAlign: 'center' }} />
              <Text style={styles.settingLabel}>{t('settings.darkMode', 'Cinematic Dark Mode')}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#cbd5e0', true: colors.primary }}
              thumbColor={'#fff'}
            />
          </View>
        </View>
      </View>
    </>
  );
}

const getStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
