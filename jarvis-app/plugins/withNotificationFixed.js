const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to resolve Manifest Merger conflict between 
 * expo-notifications and @react-native-firebase/messaging.
 */
module.exports = function withNotificationFixed(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;
    const application = androidManifest.application[0];

    // Ensure the tools namespace exists for the manifest merger
    androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    if (application['meta-data']) {
      // Find the conflicting firebase notification color entry
      const metaData = application['meta-data'].find(
        (item) => item.$['android:name'] === 'com.google.firebase.messaging.default_notification_color'
      );

      if (metaData) {
        // Apply tools:replace to instruct the merger to prefer this value
        metaData.$['tools:replace'] = 'android:resource';
      }
    }

    return config;
  });
};
