import '@testing-library/jest-native/extend-expect';
import 'react-native';

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ user: { email: 'test@example.com', name: 'Test User' }, idToken: 'mock-id-token' })),
    signOut: jest.fn(() => Promise.resolve()),
    getTokens: jest.fn(() => Promise.resolve({ idToken: 'mock-id-token' })),
  },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'mock-push-token' })),
}));

// Provide minimal mock for location if needed
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({ coords: { latitude: 0, longitude: 0 } })),
}));

// Mock expo-constants for payment configuration
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      platformRazorpayKey: 'rzp_test_TWSNTBjCjlxWVy',
      imgbbApiKey: 'test-imgbb-key',
      freeimageApiKey: 'test-freeimage-key',
      supportEmail: 'test@abtohghoomle.com',
    },
  },
}));

// Mock expo-file-system for export functionality
const mockFileSystem = {
  documentDirectory: '/mock/documents/',
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  deleteAsync: jest.fn(() => Promise.resolve()),
  EncodingType: {
    UTF8: 'utf8',
    Base64: 'base64',
  },
};
jest.mock('expo-file-system', () => mockFileSystem);
jest.mock('expo-file-system/legacy', () => mockFileSystem);

// Mock expo-sharing for export sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-print for PDF export
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: '/mock/export.pdf' })),
}));

// Mock expo-screen-capture for screenshot prevention
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  addScreenshotListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock react-native-razorpay for payment processing
jest.mock('react-native-razorpay', () => ({
  default: {
    open: jest.fn(() => Promise.resolve({
      razorpay_payment_id: 'pay_mock_123',
      razorpay_order_id: 'order_mock_123',
      razorpay_signature: 'sig_mock_123',
    })),
  },
}));

// Global Firebase mocks
jest.mock('./config/firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'mock-user-1', email: 'test@example.com' },
  },
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn((db, path) => ({ type: 'collection', path })),
  doc: jest.fn((db, path, id) => ({ type: 'doc', path: id ? `${path}/${id}` : path })),
  query: jest.fn((...args) => ({ type: 'query', args })),
  where: jest.fn((field, op, value) => ({ type: 'where', field, op, value })),
  orderBy: jest.fn((field, dir) => ({ type: 'orderBy', field, dir })),
  limit: jest.fn((n) => ({ type: 'limit', limit: n })),
  startAfter: jest.fn((doc) => ({ type: 'startAfter', doc })),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [], forEach: jest.fn() })),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => true, data: () => ({}) })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
  updateDoc: jest.fn(() => Promise.resolve()),
  setDoc: jest.fn(() => Promise.resolve()),
  deleteDoc: jest.fn(() => Promise.resolve()),
  arrayUnion: jest.fn((...args) => args),
  onSnapshot: jest.fn((ref, callback) => {
    callback({ exists: () => true, data: () => ({}) });
    return jest.fn(); // Unsubscribe
  }),
}));

jest.mock('firebase/auth', () => ({
  signInAnonymously: jest.fn(() => Promise.resolve({ user: { uid: 'anon-1' } })),
  signInWithCredential: jest.fn(() => Promise.resolve({ user: { uid: 'cred-1', email: 'test@example.com' } })),
  GoogleAuthProvider: {
    credential: jest.fn(() => ({ providerId: 'google.com' })),
  },
  signOut: jest.fn(() => Promise.resolve()),
}));

// Global test utilities
global.__DEV__ = true;

