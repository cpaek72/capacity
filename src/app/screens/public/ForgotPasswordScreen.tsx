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

interface ForgotPasswordScreenProps {
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
    lineHeight: 20,
  },
  form: {
    marginBottom: spacing.xxxl,
  },
  buttonContainer: {
    marginBottom: spacing.xl,
  },
  successMessage: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  successText: {
    ...typography.body,
    color: colors.primaryDark,
    lineHeight: 20,
  },
});

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  navigation,
}) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: 'capacityapp://reset-password',
        }
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setShowSuccess(true);
        setEmail('');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
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
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <Text style={styles.headerSubtitle}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
        </View>

        {showSuccess && (
          <View style={styles.successMessage}>
            <Text style={styles.successText}>
              Check your email for a password reset link. If you don't see it, check your spam folder.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) {
                setError('');
              }
            }}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            error={error}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Send Reset Link"
            onPress={handleSendResetLink}
            loading={loading}
            disabled={showSuccess}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
