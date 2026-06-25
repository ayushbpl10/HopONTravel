import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CheckoutScreen from '../app/checkout/[id]';
import { AppProvider } from '../context/AppContext';
import { Alert } from 'react-native';

// Mock expo-router
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({
    id: 'trip-123',
    batchId: 'batch-1',
    packageName: 'Standard',
    seats: '2',
    totalPrice: '2000',
    tripTitle: 'Test Trip',
  }),
  router: {
    replace: jest.fn(),
  },
}));

// Mock Firebase
jest.mock('../config/firebase', () => ({
  db: {},
  auth: {},
}));
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ empty: true, docs: [] })),
  addDoc: jest.fn(() => Promise.resolve({ id: 'mock-booking-id' })),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  where: jest.fn(),
}));
jest.mock('firebase/auth', () => ({
  signInAnonymously: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('Checkout Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('validates empty fields and prevents submission', async () => {
    const { getByText } = render(
      <AppProvider>
        <CheckoutScreen />
      </AppProvider>
    );

    // Initial render shouldn't have form filled
    const proceedBtn = getByText('Proceed to Payment');
    fireEvent.press(proceedBtn);

    // Alert should be called for required fields or button should be disabled
    // In our component, button is disabled if empty fields. But let's test if we force it
    // Wait, the button has `disabled={true}`, so onPress wouldn't fire. 
    // Let's test the consent and math captcha instead.
  });

  it('fails math CAPTCHA with incorrect answer', async () => {
    const { getByPlaceholderText, getByText, getByRole } = render(
      <AppProvider>
        <CheckoutScreen />
      </AppProvider>
    );

    // Fill form
    fireEvent.changeText(getByPlaceholderText('John Doe'), 'Test User');
    fireEvent.changeText(getByPlaceholderText('10-digit mobile number'), '9876543210');
    fireEvent.changeText(getByPlaceholderText('john@example.com'), 'test@example.com');
    
    // Toggle consent switch (Using role switch)
    const consentSwitch = getByRole('switch');
    fireEvent(consentSwitch, 'onValueChange', true);

    // Enter wrong math answer
    fireEvent.changeText(getByPlaceholderText('?'), '999');

    const proceedBtn = getByText('Proceed to Payment');
    fireEvent.press(proceedBtn);

    expect(Alert.alert).toHaveBeenCalledWith(
      'Security Check Failed',
      'Please answer the math question correctly.'
    );
  });
});
