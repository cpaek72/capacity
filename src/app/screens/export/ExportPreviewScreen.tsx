import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { colors, spacing, borderRadius, typography } from '../../../lib/theme';
import Button from '../../../components/Button';
import Card from '../../../components/Card';

type RootStackParamList = {
  ExportPreview: { reportText: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'ExportPreview'>;

const ExportPreviewScreen: React.FC<Props> = ({ route, navigation }) => {
  const { reportText } = route.params;
  const [sharing, setSharing] = useState(false);
  const [copying, setCopying] = useState(false);
  const [shareError, setShareError] = useState('');

  const handleShare = async () => {
    setShareError('');
    setSharing(true);

    try {
      const fileName = 'capacity-report.txt';
      const fileUri = FileSystem.documentDirectory + fileName;

      // Write the report to a temporary file
      await FileSystem.writeAsStringAsync(fileUri, reportText, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Check if the file exists and can be shared
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        setShareError('Failed to create report file');
        return;
      }

      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setShareError('Sharing is not available on this device');
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'Share Health Report',
        UTI: 'public.plain-text',
      });
    } catch (error) {
      console.error('Error sharing report:', error);
      setShareError('Failed to share report. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setCopying(true);

    try {
      await Clipboard.setStringAsync(reportText);
      // Visual feedback would be nice here - show a toast or alert
      // For now, we'll just update the UI state
      alert('Report copied to clipboard!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      alert('Failed to copy to clipboard');
    } finally {
      setCopying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.reportCard}>
          <Text style={styles.reportText}>{reportText}</Text>
        </Card>

        {shareError && (
          <Card style={[styles.errorCard, { marginBottom: spacing.lg }]}>
            <Text style={styles.errorText}>{shareError}</Text>
          </Card>
        )}

        <View style={styles.buttonContainer}>
          <Button
            title={sharing ? 'Sharing...' : 'Share'}
            onPress={handleShare}
            disabled={sharing || copying}
            style={styles.button}
          />
          <Button
            title={copying ? 'Copying...' : 'Copy to clipboard'}
            onPress={handleCopyToClipboard}
            disabled={sharing || copying}
            variant="secondary"
            style={styles.button}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  reportCard: {
    marginBottom: spacing.lg,
    backgroundColor: colors.offWhite,
  },
  reportText: {
    ...typography.body,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
    color: colors.darkGray,
    letterSpacing: 0.2,
  },
  errorCard: {
    backgroundColor: '#FDEAEA',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
  },
  buttonContainer: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  button: {
    // Button styling handled by Button component
  },
});

export default ExportPreviewScreen;
