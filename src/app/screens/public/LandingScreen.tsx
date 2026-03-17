import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { colors, spacing, typography } from '../../../lib/theme';
import Button from '../../../components/Button';

interface LandingScreenProps {
  navigation: any;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: colors.darkGray,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  tagline: {
    ...typography.secondary,
    textAlign: 'center',
    marginBottom: spacing.xxxl,
    lineHeight: 20,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  secondaryButtonContainer: {
    width: '100%',
    marginBottom: spacing.xxxl,
  },
  footerLinks: {
    marginTop: spacing.xxxl,
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
  },
  linkButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  linkText: {
    ...typography.secondary,
    color: colors.primary,
    textDecorationLine: 'underline' as const,
  },
  separator: {
    color: colors.lightGray,
    marginHorizontal: spacing.sm,
  },
});

const LandingScreen: React.FC<LandingScreenProps> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        scrollEnabled={false}
      >
        <View style={styles.content}>
          <Text style={styles.appName}>Capacity</Text>
          <Text style={styles.tagline}>
            Understand your limits. Expand your impact.
          </Text>

          <View style={styles.buttonContainer}>
            <Button
              title="Log In"
              onPress={() => navigation.navigate('Login')}
            />
          </View>

          <View style={styles.secondaryButtonContainer}>
            <Button
              title="Get Started"
              variant="secondary"
              onPress={() => navigation.navigate('Signup')}
            />
          </View>
        </View>

        <View style={styles.footerLinks}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Privacy')}
          >
            <Text style={styles.linkText}>Privacy</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>•</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Terms')}
          >
            <Text style={styles.linkText}>Terms</Text>
          </TouchableOpacity>
          <Text style={styles.separator}>•</Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('About')}
          >
            <Text style={styles.linkText}>About</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LandingScreen;
