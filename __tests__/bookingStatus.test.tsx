import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import BookingStatusScreen from '../app/booking-status';
import { db } from '../config/firebase';
import { getDocs } from 'firebase/firestore';

// Mock Firebase
jest.mock('../config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
}));

describe('Booking Status Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows error if booking ID is empty', async () => {
    const { getByText, getByPlaceholderText } = render(<BookingStatusScreen />);
    
    const trackBtn = getByText('Track');
    fireEvent.press(trackBtn);

    expect(getByText('Please enter a valid Booking ID.')).toBeTruthy();
  });

  it('fetches and displays confirmed booking correctly', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: '123',
          data: () => ({
            bookingId: 'ORD-123',
            travelerName: 'Test Name',
            status: 'confirmed',
            totalPrice: 1500,
            packageName: 'Basic',
          }),
        },
      ],
    });

    const { getByText, getByPlaceholderText, queryByText } = render(<BookingStatusScreen />);
    
    const input = getByPlaceholderText('e.g. ATGL-XXXXX');
    fireEvent.changeText(input, 'ORD-123');

    const trackBtn = getByText('Track');
    fireEvent.press(trackBtn);

    await waitFor(() => {
      expect(getByText('BOOKING DETAILS')).toBeTruthy();
      expect(getByText('Test Name')).toBeTruthy();
      expect(getByText('CONFIRMED')).toBeTruthy();
      expect(getByText(/Booking Confirmed! Show this ID/)).toBeTruthy();
    });
  });

  it('shows pending message when booking is pending', async () => {
    (getDocs as jest.Mock).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: '123',
          data: () => ({
            bookingId: 'ORD-123',
            travelerName: 'Pending User',
            status: 'pending',
            totalPrice: 2000,
            packageName: 'Standard',
          }),
        },
      ],
    });

    const { getByText, getByPlaceholderText } = render(<BookingStatusScreen />);
    
    const input = getByPlaceholderText('e.g. ATGL-XXXXX');
    fireEvent.changeText(input, 'ORD-123');
    fireEvent.press(getByText('Track'));

    await waitFor(() => {
      expect(getByText('PENDING')).toBeTruthy();
      expect(getByText(/Your payment is pending manual verification/)).toBeTruthy();
    });
  });
});
