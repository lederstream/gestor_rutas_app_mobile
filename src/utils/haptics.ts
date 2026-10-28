/**
 * ============================================================================
 * UTILITY: haptics.ts
 * Retroalimentación táctil y sensorial para interacciones en ruta
 * Con fallback seguro si el dispositivo no soporta haptics o en web
 * ============================================================================
 */

import { Platform } from 'react-native';

let HapticsModule: any = null;
try {
  HapticsModule = require('expo-haptics');
} catch {
  // Graceful fallback
}

export const hapticImpact = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
  if (Platform.OS === 'web') return;
  try {
    if (HapticsModule && HapticsModule.impactAsync) {
      const impactStyle =
        style === 'light'
          ? HapticsModule.ImpactFeedbackStyle?.Light || 'light'
          : style === 'heavy'
          ? HapticsModule.ImpactFeedbackStyle?.Heavy || 'heavy'
          : HapticsModule.ImpactFeedbackStyle?.Medium || 'medium';
      HapticsModule.impactAsync(impactStyle);
    }
  } catch {
    // Ignore errors silently on unsupported devices
  }
};

export const hapticNotification = (type: 'success' | 'warning' | 'error' = 'success') => {
  if (Platform.OS === 'web') return;
  try {
    if (HapticsModule && HapticsModule.notificationAsync) {
      const notifType =
        type === 'error'
          ? HapticsModule.NotificationFeedbackType?.Error || 'error'
          : type === 'warning'
          ? HapticsModule.NotificationFeedbackType?.Warning || 'warning'
          : HapticsModule.NotificationFeedbackType?.Success || 'success';
      HapticsModule.notificationAsync(notifType);
    }
  } catch {
    // Ignore errors silently on unsupported devices
  }
};

export const hapticSelection = () => {
  if (Platform.OS === 'web') return;
  try {
    if (HapticsModule && HapticsModule.selectionAsync) {
      HapticsModule.selectionAsync();
    }
  } catch {
    // Ignore errors silently
  }
};
