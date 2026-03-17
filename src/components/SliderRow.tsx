import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../lib/theme';

interface SliderRowProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  showValue?: boolean;
  disabled?: boolean;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    fontWeight: '500',
  },
  valueText: {
    ...typography.sectionHeader,
    color: colors.primary,
  },
  sliderContainer: {
    height: 60,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    height: 4,
    backgroundColor: colors.lightGray,
    borderRadius: 2,
    position: 'relative',
  },
  activeTrack: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
    position: 'absolute',
    top: '50%',
    marginTop: -14,
  },
  thumbDisabled: {
    borderColor: colors.lightGray,
  },
  tooltipContainer: {
    position: 'absolute',
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tooltip: {
    backgroundColor: colors.darkGray,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  tooltipText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
});

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  onValueChange,
  min = 0,
  max = 10,
  step = 1,
  showValue = true,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const trackWidthRef = useRef<number>(0);
  const containerXRef = useRef<number>(0);

  const calculateValueFromX = (x: number): number => {
    const relativeX = x - containerXRef.current;
    const percentage = Math.max(
      0,
      Math.min(1, relativeX / trackWidthRef.current)
    );
    const range = max - min;
    const rawValue = min + percentage * range;
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(min, Math.min(max, steppedValue));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {
        setIsDragging(true);
      },
      onPanResponderMove: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState
      ) => {
        const newValue = calculateValueFromX(gestureState.moveX);
        onValueChange(newValue);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    })
  ).current;

  const percentage = ((value - min) / (max - min)) * 100;
  const thumbPosition = (percentage / 100) * (trackWidthRef.current || 0);

  return (
    <View style={styles.container}>
      {showValue && (
        <View style={styles.header}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.valueText}>{value}</Text>
        </View>
      )}
      {!showValue && <Text style={styles.label}>{label}</Text>}

      <View
        style={styles.sliderContainer}
        {...panResponder.panHandlers}
        onLayout={(event) => {
          containerXRef.current = event.nativeEvent.layout.x;
          trackWidthRef.current = event.nativeEvent.layout.width;
        }}
      >
        <View style={styles.track}>
          <View
            style={[
              styles.activeTrack,
              {
                width: `${percentage}%`,
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.thumb,
            disabled && styles.thumbDisabled,
            {
              left: thumbPosition,
            },
          ]}
        >
          {isDragging && (
            <View style={styles.tooltipContainer}>
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>{value}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default SliderRow;
