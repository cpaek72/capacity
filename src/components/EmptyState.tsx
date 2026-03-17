import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ReactNode,
} from 'react-native';
import { colors, spacing, typography } from '../lib/theme';
import Button from './Button';

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxxl,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.sectionHeader,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    ...typography.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    maxWidth: 280,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
});

const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction && (
        <View style={styles.buttonContainer}>
          <Button
            title={actionLabel}
            onPress={onAction}
            variant="primary"
          />
        </View>
      )}
    </View>
  );
};

export default EmptyState;
