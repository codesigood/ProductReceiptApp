import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, CheckCircle, Printer } from 'lucide-react';

const PrinterSettings: React.FC = () => {
  const [printerType, setPrinterType] = useState('');
  const [connectionType, setConnectionType] = useState('');
  const [printerInterface, setPrinterInterface] = useState('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [printerStatus, setPrinterStatus] = useState<{ connected: boolean; device?: any }>({ connected: false });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await window.printer.getSettings();
        const isConnected = await window.printer.isConnected();
        console.log("My settings",respnse);
        
         console.log("My Initial printer connection status:", isConnected);
        if (response.success && response.settings) {
          setPrinterType(response.settings.type);
          setConnectionType(response.settings.connectionType);
          setPrinterInterface(response.settings.interface);
        }
        // Removed initial connection status check, relying on IPC event

      } catch (err: any) {
        setError(err.message || 'Failed to fetch printer settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();

    // Listen for status updates from the main process
    const handlePrinterStatus = (status: { connected: boolean; device?: any }) => {
      console.log("Received printer status update:", status);
      setPrinterStatus(status);
    };

    const cleanup = window.printer.onPrinterStatus(handlePrinterStatus);

    return () => {
      cleanup();
    };
  }, []);

  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await window.printer.saveSettings(printerType, connectionType, printerInterface);
      if (response.success) {
        setMessage("Printer settings saved successfully!");
      } else {
        setError(response.message || "Failed to save printer settings.");
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while saving settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const testData = {
        cashier: 'Test User',
        items: [
          { name: 'Sample Item 1', price: 10.00, quantity: 1 },
          { name: 'Sample Item 2', price: 5.50, quantity: 2 },
        ],
        total: 21.00,
        paymentMethod: 'Cash',
      };
      const response = await window.printer.printReceipt(testData);
      if (response.success) {
        setMessage("Test print sent successfully!");
      } else {
        setError(response.error || "Failed to send test print.");
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during test print.');
    } finally {
      setLoading(false);
    }
  };

  const getInterfacePlaceholder = () => {
    switch (connectionType) {
      case 'usb':
        return 'e.g., 0x04b8/0x0202 (VendorID/ProductID)';
      case 'lan':
        return 'e.g., 192.168.1.55 (IP Address)';
      case 'bluetooth':
        return 'e.g., 00:11:22:33:44:55 (MAC Address)';
      case 'serial':
        return 'e.g., /dev/ttyS0 or COM1';
      case 'test':
        return 'Xp-virtual-printer';
      default:
        return 'Enter printer interface string';
    }
  };

  const getHelpText = () => {
    switch (connectionType) {
      case 'usb':
        return (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            For USB printers, you need the Vendor ID (VID) and Product ID (PID).
            You can often find these in your operating system's device manager.
            Format: <code>0x[VendorID]/0x[ProductID]</code>
          </p>
        );
      case 'lan':
        return (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            For LAN printers, enter the IP address of the printer.
            Ensure the printer is on the same network as this application.
          </p>
        );
      case 'bluetooth':
        return (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            For Bluetooth printers, enter the MAC address of the printer.
            Ensure Bluetooth is enabled on your computer and the printer is paired.
          </p>
        );
        case 'serial':
        return (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            For Serial printers, enter the serial port path.
            e.g., <code>/dev/ttyS0</code> on Linux/macOS or <code>COM1</code> on Windows.
          </p>
        );
        case 'test':
        return (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            For test printers, enter the virtual printer.
            e.g., Xp-virtual-printer on Windows.
          </p>
        );
      default:
        return <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Select a connection type to see help for the interface string.</p>;
    }
  };

  if (loading && !printerType) return <div>Loading printer settings...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Printer Settings</CardTitle>
        <div className={`flex items-center gap-2 ${printerStatus.connected ? 'text-green-500' : 'text-red-500'}`}>
          <Printer size={18} />
          <span>{printerStatus.connected ? `Connected to ${printerStatus.device?.deviceName || 'printer'}` : 'Disconnected'}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert variant="default">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="printerType">Printer Type</Label>
            <Select value={printerType} onValueChange={setPrinterType}>
              <SelectTrigger id="printerType">
                <SelectValue placeholder="Select Printer Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="epson">Epson</SelectItem>
                <SelectItem value="star">Star</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="connectionType">Connection Type</Label>
            <Select value={connectionType} onValueChange={setConnectionType}>
              <SelectTrigger id="connectionType">
                <SelectValue placeholder="Select Connection Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lan">LAN (TCP/IP)</SelectItem>
                <SelectItem value="usb">USB</SelectItem>
                <SelectItem value="bluetooth">Bluetooth</SelectItem>
                <SelectItem value="serial">Serial</SelectItem>
                <SelectItem value="test">Testing</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="printerInterface">Printer Interface</Label>
          <Input
            id="printerInterface"
            value={printerInterface}
            onChange={(e) => setPrinterInterface(e.target.value)}
            placeholder={getInterfacePlaceholder()}
          />
          {getHelpText()}
        </div>
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleTestPrint}
            disabled={!printerStatus.connected || loading}
            variant="outline"
          >
            {loading ? 'Printing...' : 'Test Print'}
          </Button>
          <Button onClick={handleSaveSettings} disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PrinterSettings;