// For physical Android/iOS device: use your PC's local Wi-Fi IP (e.g. 192.168.1.42).
// For Android emulator: use 10.0.2.2 instead.
// Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
const DEV_URL = 'http://192.168.101.176:3000';

// TODO: set this once you deploy to Vercel — not needed until you do a production build.
const PROD_URL = 'https://REPLACE_WITH_YOUR_VERCEL_URL.vercel.app';

export const APP_URL = __DEV__ ? DEV_URL : PROD_URL;

export const APP_CONFIG = {
  name: 'FastGet',
  version: '1.0.0',
  primaryColor: '#F5A623',
};
