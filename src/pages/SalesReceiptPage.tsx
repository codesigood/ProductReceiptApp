import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { PlusCircle, Trash2, Search, Printer, Eye, Plus, Minus, User, Clock, ChevronDown, RefreshCw } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  product_code?: string; // Add this line
  price: number;
  type: string;
  size_options?: string;
}

interface CartItem {
  [x: string]: any;
  productId: number;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  product_code?: string;
}

interface FetchedReceiptItem {
  productName: string;
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
  transaction_code: string; // Add this line
  items: FetchedReceiptItem[];
}

const SalesReceiptPage = () => {
  const { logout, token, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [dailyReceipts, setDailyReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchProducts = async () => {
    try {
      if (!token) return;
      const response = await window.electron.ipcRenderer.invoke('product:getAll', { token });
      if (response.success) {
        setProducts(response.products);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    }
  };

    const [expandedReceipt, setExpandedReceipt] = useState<number | null>(null);

  const fetchDailyReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }
      const response = await window.api.receipt.getBySalesPerson(token);
      if (response.success) {
        const today = new Date().toDateString();
        const filteredReceipts = (response.data || []).filter(
          (receipt: Receipt) => new Date(receipt.created_at).toDateString() === today
        );
        setDailyReceipts(filteredReceipts);
      } else {
        setError(response.message || "Failed to fetch daily receipts.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while fetching daily receipts.");
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const addToCart = (product: Product, size?: string) => {
    const existingItem = cart.find(item => item.productId === product.id && item.size === size);
    if (existingItem) {
      setCart(cart.map(item => item.productId === product.id && item.size === size ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1, size, product_code: product.product_code }]);
    }
  };

  const removeFromCart = (productId: number, size?: string) => {
    setCart(cart.filter(item => !(item.productId === productId && item.size === size)));
  };

  const incrementQuantity = (productId: number, size?: string) => {
    setCart(cart.map(item => item.productId === productId && item.size === size ? { ...item, quantity: item.quantity + 1 } : item));
  };

  const decrementQuantity = (productId: number, size?: string) => {
    const existingItem = cart.find(item => item.productId === productId && item.size === size);
    if (existingItem && existingItem.quantity > 1) {
      setCart(cart.map(item => item.productId === productId && item.size === size ? { ...item, quantity: item.quantity - 1 } : item));
    } else {
      removeFromCart(productId, size);
    }
  };

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const generateReceiptDataForPrinter = (items: CartItem[], total: number) => {
    return {
      cashier: user?.email || "N/A",
      items: items.map(item => ({
        name: item.name,
        size: item.size,
        price: item.price,
        quantity: item.quantity,
        product_code: item.product_code,
      })),
      total,
      paymentMethod: "Cash",
      createdAt: new Date(),
    };
  };

  const handlePreviewReceipt = async () => {
    if (cart.length === 0) {
      setError("Cart is empty.");
      return;
    }
    setError(null);
    try {
      const receiptData = generateReceiptDataForPrinter(cart, total);
      const response = await window.printer.generatePreview(receiptData);
      if (response.success && response.content) {
        setPreviewContent(response.content);
        setShowPreviewModal(true);
      } else {
        setError(response.error || "Failed to generate preview.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during preview generation.");
    }
  };

  const handleGenerateAndPrintReceipt = async () => {
    if (cart.length === 0) {
      setError("Cart is empty.");
      return;
    }
    setError(null);
    try {
      if (!token) {
        setError("Authentication token not found.");
        return;
      }

      const createResponse = await window.api.receipt.create({
        token,
        total,
        items: cart.map(item => ({
          productName: item.name,
          price: item.price,
          quantity: item.quantity,
          product_code: item.product_code,
          size: item.size
        }))
      });

      if (createResponse.success) {
        const receiptDataForPrint = generateReceiptDataForPrinter(cart, total);

        setCart([]);
        setShowPreviewModal(false);
        fetchDailyReceipts();
        alert("Receipt created successfully!");

        if (!await window.printer.isConnected()) {
          alert("Printer not connected. Please check connection and reprint from 'Today\'s Receipts'.");
          return;
        }

        const printResponse = await window.printer.printReceipt(receiptDataForPrint);

        if (!printResponse.success) {
          alert(`Printing failed: ${printResponse.message || 'Unknown error'}. You can reprint from 'Today\'s Receipts'.`);
        }
      } else {
        setError(createResponse.message || "Failed to save receipt to database.");
      }
    } catch (err: any) {
      console.error("Error in handleGenerateAndPrintReceipt:", err);
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const handleReprint = async (receipt: Receipt) => {
    setError(null);
    try {
      const receiptData = {
        cashier: receipt.sales_person,
        items: receipt.items.map(item => ({
          name: item.productName,
          size: item.size,
          price: item.price,
          quantity: item.quantity,
          product_code: item.product_code,
        })),
        total: receipt.total,
        paymentMethod: "Cash",
        createdAt: new Date(receipt.created_at),
        receiptId: receipt.id,
        transaction_code: receipt.transaction_code
      };

      if (!await window.printer.isConnected()) {
        alert("Printer not connected. Please ensure the printer is on and connected.");
        return;
      }

      const printResponse = await window.printer.printReceipt(receiptData);

      if (printResponse.success) {
        alert("Receipt sent to printer successfully!");
      } else {
        alert(`Failed to print receipt: ${printResponse.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during reprinting.");
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100 dark:bg-gray-950">
      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sales Dashboard</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Dialog onOpenChange={(isOpen) => { if (isOpen) fetchDailyReceipts(); }}>
              <DialogTrigger asChild>
                <Button variant="outline">Today's Receipts</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Today's Receipts</DialogTitle>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Transaction Code</TableHead>
                        <TableHead>Sales Person</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyReceipts.map((receipt) => (
                        <React.Fragment key={receipt.id}>
                          <TableRow>
                            <TableCell>{receipt.id}</TableCell>
                            <TableCell>{receipt.transaction_code}</TableCell>
                            <TableCell>{receipt.sales_person}</TableCell>
                            <TableCell>₦{(receipt.total || 0).toFixed(2)}</TableCell>
                            <TableCell>{new Date(receipt.created_at).toLocaleString()}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => setExpandedReceipt(expandedReceipt === receipt.id ? null : receipt.id)}>
                                <ChevronDown className={`h-4 w-4 transition-transform ${expandedReceipt === receipt.id ? 'rotate-180' : ''}`} />
                              </Button>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleReprint(receipt)}>
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedReceipt === receipt.id && (
                            <TableRow>
                              <TableCell colSpan={7}>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
                                  <h4 className="font-bold mb-2">Receipt Items</h4>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Product Code</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Price</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(receipt.items || []).map((item, itemIndex) => (
                                        <TableRow key={itemIndex}>
                                          <TableCell>{item.productName}</TableCell>
                                          <TableCell>{item.size || 'N/A'}</TableCell>
                                          <TableCell>{item.product_code || 'N/A'}</TableCell>
                                          <TableCell>{item.quantity}</TableCell>
                                          <TableCell>₦{(item.price || 0).toFixed(2)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={logout} variant="outline">Logout</Button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <Input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredProducts.map(product => (
            <Card key={product.id} className="overflow-hidden transform transition-all duration-200 hover:scale-105 hover:shadow-xl">
              <CardContent className="p-4 text-center">
                <h3 className="text-lg font-semibold mb-2">{product.name}</h3>
                {product.product_code && <p className="text-sm text-gray-500 dark:text-gray-400">Code: {product.product_code}</p>}
                <p className="text-xl font-bold text-gray-800 dark:text-gray-200">₦{product.price.toFixed(2)}</p>
                <Button className="mt-4 w-full" onClick={() => addToCart(product)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Receipt Sidebar */}
      <aside className="w-full md:w-96 bg-white dark:bg-gray-900 p-6 border-l border-gray-200 dark:border-gray-800 flex flex-col">
        <h2 className="text-2xl font-bold mb-4">Current Receipt</h2>
        <div className="flex-1 overflow-y-auto -mr-6 pr-6">
          {cart.length === 0 ? (
            <p className="text-center text-gray-500">Cart is empty</p>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <div key={`${item.productId}-${item.size}`} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <div>
                    <p className="font-semibold">{item.name} {item.size && `(${item.size})`}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => decrementQuantity(item.productId, item.size)}><Minus className="h-4 w-4" /></Button>
                      <p className="text-sm font-bold">{item.quantity}</p>
                      <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => incrementQuantity(item.productId, item.size)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold">₦{(item.price * item.quantity).toFixed(2)}</p>
                    <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.productId, item.size)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center text-xl font-bold mb-4">
            <p>Total</p>
            <p>₦{total.toFixed(2)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="w-full" onClick={handlePreviewReceipt} disabled={cart.length === 0}>
              <Eye className="mr-2 h-4 w-4" /> Preview
            </Button>
            <Button className="w-full" onClick={handleGenerateAndPrintReceipt} disabled={cart.length === 0}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
          </div>
        </div>
      </aside>

      {/* Print Preview Modal */}
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
            <Button onClick={handleGenerateAndPrintReceipt}>Print</Button>
            <Button onClick={() => setShowPreviewModal(false)} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default SalesReceiptPage;