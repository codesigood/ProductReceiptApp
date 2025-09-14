import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Printer, Eye, Search, ChevronDown } from 'lucide-react';

interface ReceiptItem {
  product_name: string;
  product_code?: string;
  price: number;
  quantity: number;
  size: string | null;
}

interface Receipt {
  id: number;
  total: number;
  sales_person: string;
  created_at: string;
  items: ReceiptItem[];
}

interface User {
  id: number;
  email: string;
  role: 'admin' | 'sales_person';
}

const ReprintReceiptReport: React.FC = () => {
  const { token } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState({
    startDate: '',
    endDate: '',
    productName: '',
    salesPersonId: '' as string | number,
  });
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [receiptToPrint, setReceiptToPrint] = useState<Receipt | null>(null);
  const [expandedReceipt, setExpandedReceipt] = useState<number | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        if (!token) return;
        const response = await window.api.user.getAll(token);
        console.log("Response from getAllUsers (Reprint):", response);
        if (response.success) {
          setUsers(response.users || []);
        } else {
          setError(response.message || 'Failed to fetch users for filter.');
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred while fetching users.');
      }
    };
    fetchUsers();
  }, [token]);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }

      const response = await window.api.receipt.search(token, 
        searchParams.startDate || undefined,
        searchParams.endDate || undefined,
        searchParams.productName || undefined,
        searchParams.salesPersonId ? Number(searchParams.salesPersonId) : undefined
      );
      console.log("Response from search (Reprint):", response);

      if (response.success) {
        setReceipts(response.data.map(r => ({...r, items: typeof r.items === 'string' ? JSON.parse(r.items) : []})) || []);
      } else {
        setError(response.message || "Failed to search receipts.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during search.");
    } finally {
      setLoading(false);
    }
  };

  const generateReceiptDataForPrinter = (receipt: Receipt) => {
    return {
      receiptId: receipt.id,
      cashier: receipt.sales_person,
      items: receipt.items,
      total: receipt.total,
      paymentMethod: "Cash", // Or dynamically get payment method
      createdAt: new Date(receipt.created_at),
    };
  };

  const handlePreview = async (receipt: Receipt) => {
    setError(null);
    try {
      const receiptData = generateReceiptDataForPrinter(receipt);
      const response = await window.printer.generatePreview(receiptData);
      if (response.success && response.content) {
        setPreviewContent(response.content);
        setReceiptToPrint(receipt);
        setShowPreviewModal(true);
      } else {
        setError(response.error || "Failed to generate preview.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during preview generation.");
    }
  };

  const handlePrint = async (receipt: Receipt) => {
    try {
      const isConnected = await window.printer.isConnected();
      if (!isConnected) {
        alert("Printer not connected. Please ensure the printer is on and connected.");
        return;
      }
      const receiptData = generateReceiptDataForPrinter(receipt);
      const printResponse = await window.printer.printReceipt(receiptData);
      if (printResponse.success) {
        alert("Receipt sent to printer successfully!");
        setShowPreviewModal(false);
      } else {
        alert(`Failed to print receipt: ${printResponse.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      alert(`Error printing receipt: ${err.message || 'An unexpected error occurred.'}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reprint Receipt Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" value={searchParams.startDate} onChange={(e) => setSearchParams({ ...searchParams, startDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" value={searchParams.endDate} onChange={(e) => setSearchParams({ ...searchParams, endDate: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name</Label>
            <Input id="productName" placeholder="Enter product name..." value={searchParams.productName} onChange={(e) => setSearchParams({ ...searchParams, productName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salesPerson">Sales Person</Label>
            <Select value={String(searchParams.salesPersonId)} onValueChange={(value) => setSearchParams({ ...searchParams, salesPersonId: value === "all-sales-persons" ? "" : value })}>
              <SelectTrigger id="salesPerson">
                <SelectValue placeholder="All Sales Persons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-sales-persons">All Sales Persons</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>{user.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end mb-6">
          <Button onClick={handleSearch} disabled={loading}>
            <Search className="mr-2 h-4 w-4" />
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {receipts.length === 0 && !loading && !error && (
          <p className="text-center text-gray-500">No receipts found matching your criteria.</p>
        )}

        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Sales Person</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.map((receipt) => (
                <React.Fragment key={receipt.id}>
                  <TableRow>
                    <TableCell>{receipt.id}</TableCell>
                    <TableCell>{receipt.sales_person}</TableCell>
                    <TableCell>₦{(receipt.total || 0).toFixed(2)}</TableCell>
                    <TableCell>{new Date(receipt.created_at).toLocaleString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setExpandedReceipt(expandedReceipt === receipt.id ? null : receipt.id)}>
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedReceipt === receipt.id ? 'rotate-180' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handlePreview(receipt)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handlePrint(receipt)}><Printer className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                  {expandedReceipt === receipt.id && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                          <h4 className="font-bold mb-2">Receipt Items</h4>
                          <ul>
                            {receipt.items.map((item, index) => (
                              <li key={index} className="flex justify-between">
                                <span>{item.quantity}x {item.product_name} {item.product_code && `(${item.product_code})`} {item.size && `(${item.size})`}</span>
                                <span>₦{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
          {receipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Receipt #{receipt.id}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handlePreview(receipt)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handlePrint(receipt)}><Printer className="h-4 w-4" /></Button>
                  </div>
                </CardTitle>
                <CardDescription>{new Date(receipt.created_at).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Sales Person: {receipt.sales_person}</p>
                <p>Total: ₦{(receipt.total || 0).toFixed(2)}</p>
                <div className="mt-4">
                  <h4 className="font-bold mb-2">Receipt Items</h4>
                  <ul>
                    {receipt.items.map((item, index) => (
                      <li key={index} className="flex justify-between">
                        <span>{item.quantity}x {item.product_name} {item.product_code && `(${item.product_code})`} {item.size && `(${item.size})`}</span>
                        <span>₦{((item.price || 0) * (item.quantity || 0)).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Print Preview</DialogTitle>
              <DialogDescription>Review the receipt content before printing.</DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto rounded-md bg-gray-50 dark:bg-gray-800 p-4 font-mono text-sm">
              <pre className="whitespace-pre-wrap">{previewContent}</pre>
            </div>
            <DialogFooter>
              <Button onClick={() => receiptToPrint && handlePrint(receiptToPrint)}>Print</Button>
              <Button onClick={() => setShowPreviewModal(false)} variant="outline">Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
};

export default ReprintReceiptReport;