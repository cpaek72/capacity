import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { colors, spacing, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { supabase } from '../../../lib/supabase';

interface ResetPasswordScreenProps {
  navigation: any;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxxl,
  },
  headerTitle: {
    ...typography.screenTitle,
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: spacing.md,
  },
  headerSubtitle: {
    ...typography.secondary,
  },
  form: {
    marginBottom: spacing.xxxl,
  },
  buttonContainer: {
    marginBottom: spacing.xl,
  },
  passwordRequirements: {
    backgroundColor: colors.offWhite,
    borderRadius: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  requirementsTitle: {
    ...typography.sectionHeader,
    marginBottom: spacing.md,
  },
  requirement: {
    ...typography.secondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
});

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({
  navigation,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Success',
          'Your password has been reset successfully.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <Text style={styles.headerSubtitle}>
            Create a new password for your account
          </Text>
        </View>

        <View style={styles.passwordRequirements}>
          <Text style={styles.requirementsTitle}>Password Requirements</Text>
          <Text style={styles.requirement}>
            • At least 6 characters long
          </Text>
          <Text style={styles.requirement}>
            • Should include a mix of upper and lowercase letters
          </Text>
          <Text style={styles.requirement}>
            • Consider adding numbers and special characters for extra security
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="New Password"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              if (errors.newPassword) {
                setErrors({ ...errors, newPassword: '' });
              }
            }}
            placeholder="••••••••"
            secureTextEntry
            error={errors.newPassword}
          />
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) {
                setErrors({ ...errors, confirmPassword: '' });
              }
            }}
            placeholder="••••••••"
            secureTextEntry
            error={errors.confirmPassword}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Reset Password"
            onPress={handleResetPassword}
            loading={loading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;
