import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
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
    render(<BookingStatusScreen />);
    
    const trackBtn = screen.getByText('Track');
    fireEvent.press(trackBtn);

    expect(screen.getByText('Please enter a valid Booking ID.')).toBeTruthy();
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

    render(<BookingStatusScreen />);
    
    const input = screen.getByPlaceholderText('e.g. ATGL-XXXXX');
    fireEvent.changeText(input, 'ORD-123');

    const trackBtn = screen.getByText('Track');
    fireEvent.press(trackBtn);

    await waitFor(() => {
      expect(screen.getByText('BOOKING DETAILS')).toBeTruthy();
      expect(screen.getByText('Test Name')).toBeTruthy();
      expect(screen.getByText('CONFIRMED')).toBeTruthy();
      expect(screen.getByText(/Booking Confirmed! Show this ID/)).toBeTruthy();
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

    render(<BookingStatusScreen />);
    
    const input = screen.getByPlaceholderText('e.g. ATGL-XXXXX');
    fireEvent.changeText(input, 'ORD-123');
    fireEvent.press(screen.getByText('Track'));

    await waitFor(() => {
      expect(screen.getByText('PENDING')).toBeTruthy();
      expect(screen.getByText(/Your payment is pending manual verification/)).toBeTruthy();
    });
  });
});
