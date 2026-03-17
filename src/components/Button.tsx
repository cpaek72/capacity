import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  View,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonPrimaryDisabled: {
    backgroundColor: '#F3B5B9',
  },
  buttonSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  buttonText: {
    backgroundColor: 'transparent',
  },
  buttonText_Primary: {
    color: colors.white,
  },
  buttonText_Secondary: {
    color: colors.primary,
  },
  buttonText_TextOnly: {
    color: colors.primary,
  },
  buttonText_Disabled: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  text: {
    ...typography.body,
    fontWeight: '600',
    marginRight: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
}) => {
  const isDisabled = disabled || loading;

  const getButtonStyle = () => {
    if (variant === 'primary') {
      return [
        styles.button,
        styles.buttonPrimary,
        isDisabled && styles.buttonPrimaryDisabled,
        style,
      ];
    }
    if (variant === 'secondary') {
      return [styles.button, styles.buttonSecondary, style];
    }
    return [styles.button, styles.buttonText, style];
  };

  const getTextStyle = () => {
    if (variant === 'primary') {
      return [
        styles.text,
        styles.buttonText_Primary,
        isDisabled && styles.buttonText_Disabled,
      ];
    }
    if (variant === 'secondary') {
      return [styles.text, styles.buttonText_Secondary];
    }
    return [styles.text, styles.buttonText_TextOnly];
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            color={variant === 'primary' ? colors.white : colors.primary}
            size="small"
          />
        </View>
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

export default Button;
