// Location permissions make Play Store treat GPS hardware as required, which
// hides the app from devices without GPS (e.g. Wi-Fi tablets). Location is only
// used for the optional checkout map pin, so mark the features as not required.
const { withAndroidManifest } = require('@expo/config-plugins');

const FEATURES = [
  'android.hardware.location',
  'android.hardware.location.gps',
  'android.hardware.location.network',
];

module.exports = function withOptionalLocationFeatures(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const existing = manifest['uses-feature'] || [];
    const rest = existing.filter((f) => !FEATURES.includes(f.$['android:name']));
    manifest['uses-feature'] = [
      ...rest,
      ...FEATURES.map((name) => ({
        $: { 'android:name': name, 'android:required': 'false' },
      })),
    ];
    return cfg;
  });
};
