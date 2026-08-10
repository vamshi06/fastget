// For physical Android/iOS device: use your PC's local Wi-Fi IP (e.g. 192.168.1.42).
// For Android emulator: use 10.0.2.2 instead.
// Find your IP with: ipconfig (Windows) or ifconfig (Mac/Linux)
const DEV_URL = 'http://192.168.101.69:3000';

const PROD_URL = 'https://fastget.in';

export const APP_URL = __DEV__ ? DEV_URL : PROD_URL;

export const APP_CONFIG = {
  name: 'FastGet',
  version: '1.0.0',
  primaryColor: '#F5A623',
};
