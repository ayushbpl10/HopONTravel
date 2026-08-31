/**
 * Export Data Utility Tests
 * Tests for CSV and PDF export functionality
 */

import { Alert, Platform } from 'react-native';

// Mock react-native
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios', // Default to iOS for mobile tests
  },
}));

// Mock expo modules
jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  EncodingType: {
    UTF8: 'utf8',
  },
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: '/mock/export.pdf' })),
}));

import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Booking, Trip } from '../data/trips';
import { ExportData, exportToCSV, exportToPDF, showExportDialog } from '../utils/exportData';

describe('Export Data Utility', () => {
  const mockTrip: Trip = {
    id: 'trip_123',
    title: 'Manali Adventure',
    description: 'A beautiful trek',
    vendorName: 'Mountain Tours',
    vendorWhatsApp: '+919876543210',
    vendorUPI: ['vendor@upi'],
    vendorId: 'vendor_001',
    images: [],
    packages: [{ name: 'Standard', price: 1500 }],
    batches: [{ id: 'b1', dateDuration: '15-17 Dec', totalSeats: 20, bookedSeats: 5 }],
    pickupPoints: [],
    addOns: [],
    itinerary: 'Day 1: Arrival',
    inclusions: ['Transport'],
    exclusions: ['Personal expenses'],
    thingsToCarry: ['Warm clothes'],
    cancellationPolicy: ['No refunds'],
    status: 'published',
  };

  const mockBookings: Booking[] = [
    {
      id: 'booking_1',
      tripId: 'trip_123',
      batchId: 'b1',
      packageName: 'Standard',
      travelerName: 'John Doe',
      travelerPhone: '+919876543210',
      travelerEmail: 'john@example.com',
      seats: 2,
      totalPrice: 3000,
      status: 'confirmed',
      createdAt: Date.now() - 86400000, // Yesterday
      bookingId: 'ATGL-12345678',
    },
    {
      id: 'booking_2',
      tripId: 'trip_123',
      batchId: 'b1',
      packageName: 'Standard',
      travelerName: 'Jane Smith',
      travelerPhone: '+919876543211',
      travelerEmail: 'jane@example.com',
      seats: 1,
      totalPrice: 1500,
      status: 'pending',
      createdAt: Date.now(),
      bookingId: 'ATGL-87654321',
    },
  ];

  const mockExportData: ExportData = {
    trip: mockTrip,
    bookings: mockBookings,
    exportDate: new Date('2024-01-15T10:30:00Z'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Platform as any).OS = 'ios';
  });

  describe('exportToCSV', () => {
    it('should generate CSV with correct headers', async () => {
      await exportToCSV(mockExportData);

      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('bookings_Manali_Adventure'),
        expect.stringContaining('Booking ID,Traveller Name,Phone,Email,Package,Seats,Amount,Status,Booking Date'),
        expect.any(Object)
      );
    });

    it('should include trip info in CSV', async () => {
      await exportToCSV(mockExportData);

      const csvContent = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      expect(csvContent).toContain('Manali Adventure');
      expect(csvContent).toContain('Mountain Tours');
      expect(csvContent).toContain('Total Bookings: 2');
    });

    it('should include booking data in CSV', async () => {
      await exportToCSV(mockExportData);

      const csvContent = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      expect(csvContent).toContain('John Doe');
      expect(csvContent).toContain('Jane Smith');
      expect(csvContent).toContain('ATGL-12345678');
      expect(csvContent).toContain('ATGL-87654321');
      expect(csvContent).toContain('CONFIRMED');
      expect(csvContent).toContain('PENDING');
    });

    it('should include summary in CSV', async () => {
      await exportToCSV(mockExportData);

      const csvContent = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      expect(csvContent).toContain('Summary');
      expect(csvContent).toContain('Total Confirmed,1');
      expect(csvContent).toContain('Total Pending,1');
    });

    it('should sanitize filename to prevent filesystem issues', async () => {
      const tripWithSpecialChars: Trip = {
        ...mockTrip,
        title: 'LIVE: Trek / Version 2.0!',
      };
      const dataWithSpecialChars: ExportData = {
        ...mockExportData,
        trip: tripWithSpecialChars,
      };

      await exportToCSV(dataWithSpecialChars);

      const filePath = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][0];
      expect(filePath).not.toContain(':');
      expect(filePath).not.toContain('/');
      expect(filePath).not.toContain('!');
      expect(filePath).toContain('LIVE__Trek___Version_2_0_');
    });

    it('should share CSV file after creation', async () => {
      await exportToCSV(mockExportData);

      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.stringContaining('.csv'),
        expect.objectContaining({
          mimeType: 'text/csv',
        })
      );
    });

    it('should return true on successful export', async () => {
      const result = await exportToCSV(mockExportData);
      expect(result).toBe(true);
    });

    it('should handle sharing unavailable gracefully', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      const result = await exportToCSV(mockExportData);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Error', expect.any(String));
    });

    it('should handle file write errors', async () => {
      (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValue(new Error('Disk full'));

      const result = await exportToCSV(mockExportData);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Export Failed', expect.any(String));
    });
  });

  describe('exportToPDF', () => {
    it('should generate PDF with trip details', async () => {
      await exportToPDF(mockExportData);

      expect(Print.printToFileAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Manali Adventure'),
        })
      );
    });

    it('should include vendor info in PDF', async () => {
      await exportToPDF(mockExportData);

      const htmlContent = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
      expect(htmlContent).toContain('Mountain Tours');
      expect(htmlContent).toContain('+919876543210');
    });

    it('should include booking table in PDF', async () => {
      await exportToPDF(mockExportData);

      const htmlContent = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
      expect(htmlContent).toContain('<table>');
      expect(htmlContent).toContain('John Doe');
      expect(htmlContent).toContain('Jane Smith');
      expect(htmlContent).toContain('₹3000');
      expect(htmlContent).toContain('₹1500');
    });

    it('should include summary statistics in PDF', async () => {
      await exportToPDF(mockExportData);

      const htmlContent = (Print.printToFileAsync as jest.Mock).mock.calls[0][0].html;
      expect(htmlContent).toContain('Total Bookings');
      expect(htmlContent).toContain('Confirmed');
      expect(htmlContent).toContain('Pending');
    });

    it('should share PDF after generation', async () => {
      await exportToPDF(mockExportData);

      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        '/mock/export.pdf',
        expect.objectContaining({
          mimeType: 'application/pdf',
        })
      );
    });

    it('should return true on successful export', async () => {
      const result = await exportToPDF(mockExportData);
      expect(result).toBe(true);
    });

    it('should handle print errors', async () => {
      (Print.printToFileAsync as jest.Mock).mockRejectedValue(new Error('Print failed'));

      const result = await exportToPDF(mockExportData);

      expect(result).toBe(false);
      expect(Alert.alert).toHaveBeenCalledWith('Export Failed', expect.any(String));
    });
  });

  describe('showExportDialog', () => {
    it('should show alert with CSV and PDF options', () => {
      const onComplete = jest.fn();
      
      showExportDialog(mockExportData, onComplete);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Export Bookings',
        'Choose export format:',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Excel (CSV)' }),
          expect.objectContaining({ text: 'PDF' }),
          expect.objectContaining({ text: 'Cancel' }),
        ])
      );
    });
  });

  describe('CSV Content Formatting', () => {
    it('should escape commas in traveler names', async () => {
      const bookingsWithComma: Booking[] = [
        {
          ...mockBookings[0],
          travelerName: 'Doe, John',
        },
      ];
      const dataWithComma: ExportData = {
        ...mockExportData,
        bookings: bookingsWithComma,
      };

      await exportToCSV(dataWithComma);

      const csvContent = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      expect(csvContent).toContain('"Doe, John"');
    });

    it('should handle missing email gracefully', async () => {
      const bookingsNoEmail: Booking[] = [
        {
          ...mockBookings[0],
          travelerEmail: undefined as any,
        },
      ];
      const dataNoEmail: ExportData = {
        ...mockExportData,
        bookings: bookingsNoEmail,
      };

      await exportToCSV(dataNoEmail);

      const csvContent = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      expect(csvContent).toContain('N/A');
    });

    it('should calculate total revenue correctly', async () => {
      await exportToCSV(mockExportData);

      const csvContent = (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1];
      // Only confirmed booking (John Doe) counts toward revenue
      expect(csvContent).toContain('Total Revenue,₹3000');
    });
  });
});

describe('Web Export Behavior', () => {
  beforeEach(() => {
    (Platform as any).OS = 'web';
    // Mock window and document for web tests
    (global as any).window = {
      open: jest.fn(() => ({
        document: {
          write: jest.fn(),
          close: jest.fn(),
        },
        print: jest.fn(),
      })),
    };
    (global as any).document = {
      createElement: jest.fn(() => ({
        href: '',
        download: '',
        click: jest.fn(),
      })),
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn(),
      },
    };
    (global as any).URL = {
      createObjectURL: jest.fn(() => 'blob:mock-url'),
    };
    (global as any).Blob = jest.fn();
  });

  afterEach(() => {
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).URL;
    delete (global as any).Blob;
  });

  // Web-specific tests would go here
  // Note: These require more complex mocking of browser APIs
});
