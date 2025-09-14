
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

interface ReceiptItem {
  product_name: string;
  size: string | null;
  price: number;
  quantity: number;
}

interface Receipt {
  id: number;
  total: number;
  sales_person: string;
  created_at: string;
  items: ReceiptItem[];
}

const Reports: React.FC = () => {
  const { token } = useAuth();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReceipts = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!token) {
          setError("Authentication token not found.");
          setLoading(false);
          return;
        }
        const response = await window.api.receipt.getAll(token);
        if (response.success) {
          setReceipts(response.data || []);
        } else {
          setError(response.message || "Failed to fetch receipts.");
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchReceipts();
  }, [token]);

  if (loading) return <div>Loading reports...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Receipts Report</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {receipts.length === 0 && !error ? (
          <p>No receipts found.</p>
        ) : (
          <>
            {/* Table for larger screens */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt ID</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Sales Person</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt.id}>
                      <TableCell>{receipt.id}</TableCell>
                      <TableCell>₦{receipt.total.toFixed(2)}</TableCell>
                      <TableCell>{receipt.sales_person}</TableCell>
                      <TableCell>{new Date(receipt.created_at).toLocaleString()}</TableCell>
                      <TableCell>
                        {
                          receipt.items.map((item, index) => (
                            <div key={index}>
                              {item.product_name} ({item.quantity} x ₦{item.price.toFixed(2)}) {item.size ? `(${item.size})` : ''}
                            </div>
                          ))
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Cards for smaller screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
              {receipts.map((receipt) => (
                <Card key={receipt.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-lg">Receipt #{receipt.id}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(receipt.created_at).toLocaleString()}</p>
                  </div>
                  <p className="font-semibold">Total: ₦{receipt.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sold by: {receipt.sales_person}</p>
                  <div className="mt-2">
                    <h4 className="font-semibold">Items:</h4>
                    {receipt.items.map((item, index) => (
                      <p key={index} className="text-sm">
                        {item.product_name} ({item.quantity} x ₦{item.price.toFixed(2)}) {item.size ? `(${item.size})` : ''}
                      </p>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default Reports;
