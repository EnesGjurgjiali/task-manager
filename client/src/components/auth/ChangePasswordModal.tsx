import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Pressable, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedView } from '@/components/ui/themed-view';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/services/api';

interface ChangePasswordModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ visible, onClose }: ChangePasswordModalProps) {
  const theme = useTheme();
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const getPasswordStrength = () => {
    if (!newPassword) return null;
    if (newPassword.length < 6) return { label: 'Weak', color: '#ef4444' };
    
    const hasNumbers = /\d/.test(newPassword);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    
    if (newPassword.length >= 8 && hasNumbers && (hasSpecial || hasUpper)) {
      return { label: 'Strong', color: '#10b981' };
    }
    
    return { label: 'Medium', color: '#f59e0b' };
  };

  const strength = getPasswordStrength();

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setIsSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'An error occurred while updating the password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <ThemedView style={[styles.modalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <View style={styles.header}>
            <ThemedText type="subtitle">Change Password</ThemedText>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </Pressable>
          </View>

          {isSuccess ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10b981" />
              <ThemedText type="subtitle" style={styles.successTitle}>Success!</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.successText}>
                Your password has been updated successfully.
              </ThemedText>
              <Pressable 
                onPress={handleClose} 
                style={[styles.submitButton, { backgroundColor: theme.accent, width: '100%', marginTop: Spacing.six }]}
              >
                <ThemedText style={{ color: '#ffffff', textAlign: 'center' }} type="smallBold">
                  Done
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              {error ? (
                <View style={styles.errorContainer}>
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              ) : null}

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>Current Password</ThemedText>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Enter current password"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>New Password</ThemedText>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Enter new password"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                  {strength && (
                    <ThemedText style={{ color: strength.color, fontSize: 12, marginTop: Spacing.one, textAlign: 'right', fontWeight: '600' }}>
                      Strength: {strength.label}
                    </ThemedText>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="smallBold" style={{ marginBottom: Spacing.two }}>Confirm New Password</ThemedText>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected, backgroundColor: theme.background }]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor={theme.textSecondary}
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                      <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={theme.textSecondary} />
                    </Pressable>
                  </View>
                </View>
              </View>

              <Pressable 
                onPress={handleSubmit} 
                disabled={isLoading}
                style={[styles.submitButton, { backgroundColor: isLoading ? theme.backgroundSelected : theme.accent }]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText style={{ color: '#ffffff', textAlign: 'center' }} type="smallBold">
                    Update Password
                  </ThemedText>
                )}
              </Pressable>
            </>
          )}
        </ThemedView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    padding: Spacing.five,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.six,
  },
  closeButton: {
    padding: Spacing.two,
  },
  form: {
    gap: Spacing.three,
  },
  inputGroup: {
    marginBottom: 0,
  },
  inputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    paddingRight: 40,
    fontSize: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: Spacing.three,
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.four,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  submitButton: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    marginTop: Spacing.four,
    marginBottom: Spacing.four,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  successTitle: {
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
  },
  successText: {
    textAlign: 'center',
    fontSize: 16,
  },
});
