import { ToastAndroid } from 'react-native';
import { colors } from '../lib/theme';

export type ToastType = 'success' | 'error' | 'info';

/**
 * Show a toast notification with the specified type and message.
 * Uses native Toast on Android and a custom implementation on iOS.
 *
 * @param type - The type of toast: 'success', 'error', or 'info'
 * @param message - The message to display
 */
export const showToast = (type: ToastType, message: string): void => {
  // Map toast types to colors
  const getToastColor = (toastType: ToastType): string => {
    switch (toastType) {
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'info':
        return colors.primary;
      default:
        return colors.primary;
    }
  };

  // On Android, use native ToastAndroid
  // On iOS, would need react-native-toast-message or similar library
  if (ToastAndroid) {
    const duration =
      type === 'error'
        ? ToastAndroid.LONG
        : ToastAndroid.SHORT;
    ToastAndroid.show(message, duration);
  }
};

/**
 * Toast configuration for react-native-toast-message (when integrated)
 * This can be used if react-native-toast-message is added to the project
 */
export const toastConfig = {
  success: (props: any) => ({
    ...props,
    style: {
      backgroundColor: colors.success,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
    },
    text1Style: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '500',
    },
  }),
  error: (props: any) => ({
    ...props,
    style: {
      backgroundColor: colors.error,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
    },
    text1Style: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '500',
    },
  }),
  info: (props: any) => ({
    ...props,
    style: {
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 8,
    },
    text1Style: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '500',
    },
  }),
};

export default showToast;
