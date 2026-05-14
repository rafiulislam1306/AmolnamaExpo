// src/core/theme.ts
import { Platform, StyleSheet } from 'react-native';

export const COLORS = {
  // Base Theme
  background: '#f0f2f5',
  surface: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  accent: '#3390ec',
  border: '#e2e8f0',
  navBg: '#ffffff',

  // Semantic Alerts & Cards
  dangerBg: '#fef2f2',
  dangerBorder: '#fecaca',
  dangerText: '#b91c1c',

  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
  successText: '#15803d',

  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#b45309',

  infoBg: '#f0f9ff',
  infoBorder: '#bae6fd',
  infoText: '#0369a1',

  purpleBg: '#f5f3ff',
  purpleBorder: '#ddd6fe',
  purpleText: '#7c3aed',
};

export const GLOBAL_STYLES = StyleSheet.create({
  // Global App Container
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  // The exact frosted glass header from your PWA
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingTop: Platform.OS === 'ios' ? 50 : 20, // Safe area equivalent
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 8500,
    // Note: True blur is hard on Android, so we simulate the shadow
    elevation: 2, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
    marginLeft: 12,
  },

  // The bottom sheet / modal design
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },

  // Your signature "admin-form-card"
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },

  // Your signature "btn-primary-full"
  primaryButton: {
    backgroundColor: COLORS.accent, // We will use gradient libraries later if needed, solid for now
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});