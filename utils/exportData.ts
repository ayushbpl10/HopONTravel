/**
 * Export Data Utility
 * Generates Excel (CSV) and PDF exports for trip booking data
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { Booking, Trip } from '../data/trips';

export interface ExportData {
  trip: Trip;
  bookings: Booking[];
  exportDate: Date;
}

/**
 * Generate CSV content from bookings
 */
const generateCSV = (data: ExportData): string => {
  const { trip, bookings, exportDate } = data;
  
  // Header info
  let csv = `Trip Export Report\n`;
  csv += `Trip: ${trip.title}\n`;
  csv += `Vendor: ${trip.vendorName}\n`;
  csv += `Export Date: ${exportDate.toLocaleDateString()}\n`;
  csv += `Total Bookings: ${bookings.length}\n`;
  csv += `\n`;
  
  // Booking headers
  csv += `Booking ID,Traveller Name,Phone,Email,Package,Seats,Amount,Status,Booking Date\n`;
  
  // Booking rows
  bookings.forEach(booking => {
    const bookingDate = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A';
    csv += `${booking.bookingId || booking.id},`;
    csv += `"${booking.travelerName}",`;
    csv += `${booking.travelerPhone},`;
    csv += `${booking.travelerEmail || 'N/A'},`;
    csv += `"${booking.packageName}",`;
    csv += `${booking.seats || 1},`;
    csv += `₹${booking.totalPrice},`;
    csv += `${booking.status.toUpperCase()},`;
    csv += `${bookingDate}\n`;
  });
  
  // Summary
  csv += `\n`;
  csv += `Summary\n`;
  csv += `Total Confirmed,${bookings.filter(b => b.status === 'confirmed').length}\n`;
  csv += `Total Pending,${bookings.filter(b => b.status === 'pending').length}\n`;
  csv += `Total Revenue,₹${bookings.filter(b => b.status === 'confirmed').reduce((sum, b) => sum + b.totalPrice, 0)}\n`;
  
  return csv;
};

/**
 * Generate HTML for PDF export
 */
const generatePDFHtml = (data: ExportData): string => {
  const { trip, bookings, exportDate } = data;
  
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const totalRevenue = confirmedBookings.reduce((sum, b) => sum + b.totalPrice, 0);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Trip Export - ${trip.title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #00b0ff; padding-bottom: 20px; }
        .header h1 { color: #00b0ff; font-size: 24px; margin-bottom: 5px; }
        .header p { color: #666; font-size: 12px; }
        .trip-info { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .trip-info h2 { font-size: 18px; margin-bottom: 10px; }
        .trip-info p { font-size: 13px; margin: 5px 0; }
        .summary { display: flex; gap: 15px; margin-bottom: 25px; }
        .summary-card { flex: 1; background: #e0f7ff; padding: 15px; border-radius: 8px; text-align: center; }
        .summary-card.confirmed { background: #dcfce7; }
        .summary-card.pending { background: #fef3c7; }
        .summary-card .number { font-size: 28px; font-weight: bold; color: #00b0ff; }
        .summary-card.confirmed .number { color: #22c55e; }
        .summary-card.pending .number { color: #f59e0b; }
        .summary-card .label { font-size: 11px; color: #666; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th { background: #00b0ff; color: white; padding: 10px 8px; text-align: left; }
        td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #f8fafc; }
        .status { padding: 3px 8px; border-radius: 100px; font-size: 10px; font-weight: bold; }
        .status.confirmed { background: #dcfce7; color: #166534; }
        .status.pending { background: #fef3c7; color: #92400e; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #999; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Ab Toh Ghoom Le</h1>
        <p>Trip Booking Export Report</p>
      </div>
      
      <div class="trip-info">
        <h2>${trip.title}</h2>
        <p><strong>Vendor:</strong> ${trip.vendorName}</p>
        <p><strong>WhatsApp:</strong> ${trip.vendorWhatsApp}</p>
        <p><strong>Export Date:</strong> ${exportDate.toLocaleDateString()} ${exportDate.toLocaleTimeString()}</p>
      </div>
      
      <div class="summary">
        <div class="summary-card">
          <div class="number">${bookings.length}</div>
          <div class="label">Total Bookings</div>
        </div>
        <div class="summary-card confirmed">
          <div class="number">${confirmedBookings.length}</div>
          <div class="label">Confirmed</div>
        </div>
        <div class="summary-card pending">
          <div class="number">${pendingBookings.length}</div>
          <div class="label">Pending</div>
        </div>
        <div class="summary-card">
          <div class="number">₹${totalRevenue.toLocaleString()}</div>
          <div class="label">Total Revenue</div>
        </div>
      </div>
      
      <h3 style="margin-bottom: 10px;">Booking Details</h3>
      <table>
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Traveller</th>
            <th>Phone</th>
            <th>Package</th>
            <th>Seats</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(booking => `
            <tr>
              <td>${booking.bookingId || booking.id}</td>
              <td>${booking.travelerName}</td>
              <td>${booking.travelerPhone}</td>
              <td>${booking.packageName}</td>
              <td>${booking.seats || 1}</td>
              <td>₹${booking.totalPrice}</td>
              <td><span class="status ${booking.status}">${booking.status.toUpperCase()}</span></td>
              <td>${booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Generated by Ab Toh Ghoom Le App | ${exportDate.toISOString()}</p>
        <p>This is an official export document.</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Export bookings as CSV (Excel-compatible)
 */
export const exportToCSV = async (data: ExportData): Promise<boolean> => {
  try {
    const csvContent = generateCSV(data);
    const safeTitle = data.trip.title.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `bookings_${safeTitle}_${Date.now()}.csv`;
    
    if (Platform.OS === 'web') {
      // Web: Download directly
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    }
    
    // Mobile: Save to file and share
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Bookings (CSV)',
        UTI: 'public.comma-separated-values-text',
      });
      return true;
    } else {
      Alert.alert('Error', 'Sharing is not available on this device');
      return false;
    }
  } catch (error) {
    console.error('CSV Export Error:', error);
    Alert.alert('Export Failed', 'Could not generate CSV file. Please try again.');
    return false;
  }
};

/**
 * Export bookings as PDF
 */
export const exportToPDF = async (data: ExportData): Promise<boolean> => {
  try {
    const htmlContent = generatePDFHtml(data);
    const safeTitle = data.trip.title.replace(/[^a-zA-Z0-9]/g, '_');
    
    if (Platform.OS === 'web') {
      // Web: Open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.print();
      }
      return true;
    }
    
    // Mobile: Generate PDF and share
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Bookings (PDF)',
        UTI: 'com.adobe.pdf',
      });
      return true;
    } else {
      Alert.alert('Error', 'Sharing is not available on this device');
      return false;
    }
  } catch (error) {
    console.error('PDF Export Error:', error);
    Alert.alert('Export Failed', 'Could not generate PDF file. Please try again.');
    return false;
  }
};

/**
 * Show export options dialog
 */
export const showExportDialog = (
  data: ExportData,
  onExportComplete: () => void
): void => {
  Alert.alert(
    'Export Bookings',
    'Choose export format:',
    [
      {
        text: 'Excel (CSV)',
        onPress: async () => {
          const success = await exportToCSV(data);
          if (success) onExportComplete();
        },
      },
      {
        text: 'PDF',
        onPress: async () => {
          const success = await exportToPDF(data);
          if (success) onExportComplete();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
};
