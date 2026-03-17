import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { colors, borderRadius, shadows, spacing } from '../lib/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.offWhite,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
});

const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const cardContent = <View style={[styles.card, style]}>{children}</View>;

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

export default Card;
