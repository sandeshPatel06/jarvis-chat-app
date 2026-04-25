const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * 100% Robust Fix for Manifest Merger Conflict.
 * This version filters out any existing duplicates and ensures ONLY ONE 
 * meta-data entry exists with the required 'tools:replace' attribute.
 */
module.exports = function withNotificationFixed(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults.manifest;
    const application = androidManifest.application[0];

    // Ensure tools namespace
    if (!androidManifest.$['xmlns:tools']) {
      androidManifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const META_DATA_NAME = 'com.google.firebase.messaging.default_notification_color';
    
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Deep Fix: Filter out ANY existing entries with this name to avoid duplicates
    // in the same AndroidManifest.xml file which causes interior merger failures.
    application['meta-data'] = application['meta-data'].filter(
      (item) => !(item.$ && item.$['android:name'] === META_DATA_NAME)
    );

    // Now push the one and only "Source of Truth" entry
    application['meta-data'].push({
      $: {
        'android:name': META_DATA_NAME,
        'android:resource': '@color/notification_icon_color',
        'tools:replace': 'android:resource',
      },
    });

    return config;
  });
};
