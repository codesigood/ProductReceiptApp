import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Printer, Book, LogOut, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { formatNaira } from "../utils/formatCurrency";

const ManualReceiptPage = () => {
  const { token, logout, user } = useAuth();

  // ---- Printer states ----
  const [availablePrinters, setAvailablePrinters] = useState<{ name: string }[]>([]);
  const [selectedPrinterName, setSelectedPrinterName] = useState<string | null>(null);

  // ---- Form states ----
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [sg, setSg] = useState("");
  const [goldKarat, setGoldKarat] = useState("");
  const [amount, setAmount] = useState("");

  // ---- Feedback states ----
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---- Receipts & Dialog ----
  const [dailyReceipts, setDailyReceipts] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ---- Print Preview ----
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [companyProfile, setCompanyProfile] = useState<string | {}>({});

  // ---- Filtered receipts ----
  const filteredReceipts = useMemo(() => {
    if (!searchTerm) return dailyReceipts;
    return dailyReceipts.filter(receipt =>
      receipt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [dailyReceipts, searchTerm]);

  // ---- Fetch printers ----
  useEffect(() => {
    const fetchPrinters = async () => {
      try {
        const response = await window.printer.listDevices();
        if (response.success && response.devices?.length) {
          setAvailablePrinters(response.devices);
          setSelectedPrinterName(response.devices[0].name);
        }
      } catch (err) {
        console.error("Failed to fetch printers:", err);
      }
    };
    fetchPrinters();
  }, []);

  // ---- Fetch company profile ----
  useEffect(() => {
    const fetchCompanyProfileName = async () => {
      try {
        const response = await window.api.companyProfile.get(token);
        console.log(" Company Profile response:", response.profile);
        if (response.success && response.profile) {
          setCompanyProfile(response.profile);
        }
      } catch (err) {
        console.error("Failed to fetch company profile:", err);
      }
    };
    if (token) fetchCompanyProfileName();
  }, [token]);

  // ---- Fetch daily receipts ----
  const fetchDailyReceipts = async () => {
    if (!token) return;
    try {
      const response = await window.api.receipt.getDailyManualBySalesPerson(token);
      if (response.success) setDailyReceipts(response.data);
      else setError(response.message);
    } catch (err: any) {
      setError(err.message || "Failed to fetch daily receipts.");
    }
  };

  // ---- Create & Print Receipt ----
  const handleCreateReceipt = async () => {
    setError(null);
    setSuccess(null);

    if (!name || !weight || !sg || !goldKarat || !amount) {
      setError("Please fill out all fields.");
      return;
    }
    if (!selectedPrinterName) {
      setError("Please select a printer.");
      return;
    }
    console.log(" Selected company profile:", companyProfile);
    if (!companyProfile || Object.keys(companyProfile).length === 0) {
      setError("Company profile is not set. Please configure it before printing.");
      return;
    }
    const receiptData = {
      companyProfile,
      name,
      weight: parseFloat(weight),
      sg: parseFloat(sg),
      goldKarat,
      amount: parseFloat(amount),
      cashier: user?.email || "Unknown",
      transactionCode: `MAN-`,
      createdAt: new Date(),
    };

    try {
      const selectResponse = await window.printer.selectPrinter("epson", selectedPrinterName);
      if (!selectResponse.success) {
        setError(selectResponse.error || "Failed to select printer.");
        return;
      }

      const createResponse = await window.api.receipt.createManualReceipt({
        token,
        receiptData,
      });
      if (createResponse.success) {
        setSuccess("Receipt created successfully!");
          setName("");
          setWeight("");
          setSg("");
          setGoldKarat("");
          setAmount("");
      } else {
        setError("Failed to create receipt");
      }
          setName("");
          setWeight("");
          setSg("");
          setGoldKarat("");
          setAmount("");
       const printResponse = await window.printer.printReceipt(receiptData);
        if (printResponse.success) {
          setSuccess("Receipt printed successfully!");
          setName("");
          setWeight("");
          setSg("");
          setGoldKarat("");
          setAmount("");
        } else {
          setError(printResponse.error || "Printing failed. Transaction saved.");
          setName("");
          setWeight("");
          setSg("");
          setGoldKarat("");
          setAmount("");
        }
    } catch (err: any) {
      setError(err.message || "Unexpected error during printing.");
    }
  };

  // ---- Preview receipt ----
  const handlePreviewReceipt = async () => {
    if (!name || !weight || !sg || !goldKarat || !amount) {
      setError("Please fill out all fields to preview.");
      return;
    }
    const receiptData = {
      cashier: user?.email || "Preview User",
      name,
      weight: parseFloat(weight),
      sg: parseFloat(sg),
      goldKarat,
      amount: formatNaira(amount),
      createdAt: new Date(),
      transactionCode: `trans-pending`,
    };

    try {
      const response = await window.printer.generateManualPreview(receiptData);
      if (response.success && response.content) {
        setPreviewContent(response.content);
        setShowPreviewModal(true);
      } else {
        setError(response.error || "Failed to generate preview.");
      }
    } catch (err: any) {
      setError(err.message || "Preview failed.");
    }
  };

  // ---- Reprint receipt ----
  const handleReprint = async (receipt: any) => {
    if (!selectedPrinterName) {
      setError("Please select a printer before reprinting.");
      return;
    }
console.log(" Receipt:", companyProfile);

    if (!companyProfile || Object.keys(companyProfile).length === 0) {
      setError("Company profile is not set. Please configure it before printing.");
      return;
    }
    const manualReceiptData = {
      companyProfile,
      cashier: receipt.sales_person,
      name: receipt.name,
      weight: receipt.weight,
      sg: receipt.sg,
      goldKarat: receipt.gold_karat,
      amount: formatNaira(receipt.amount),
      createdAt: new Date(receipt.created_at),
      transactionCode: receipt.transaction_code,
    };

    try {
      const printResponse = await window.printer.printReceipt(manualReceiptData);
      if (printResponse.success) setSuccess("Receipt reprinted successfully!");
      else setError(printResponse.error || "Failed to print receipt.");
    } catch (err: any) {
      setError(err.message || "Reprint failed.");
    }
  };

  return (
    <motion.div
      className="flex flex-col h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-white/80 dark:bg-gray-900/80 border-b backdrop-blur-md shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Manual Receipt Entry
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {/* Printer Selection */}
          <Select onValueChange={(v) => setSelectedPrinterName(v)} value={selectedPrinterName || ""}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select Printer" />
            </SelectTrigger>
            <SelectContent>
              {availablePrinters.length > 0 ? (
                availablePrinters.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {p.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-printers" disabled>
                  No Printers Found
                </SelectItem>
              )}
            </SelectContent>
          </Select>

          {/* View Receipts */}
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (open) fetchDailyReceipts(); setIsDialogOpen(open); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Book className="h-4 w-4" /> Today’s Receipts
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Today’s Receipts</DialogTitle>
                 <Input
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mt-2"
                />
              </DialogHeader>
              <div className="max-h-[60vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>S.G</TableHead>
                      <TableHead>Karat</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReceipts.map((r) => (
                      <TableRow key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell>{r.id}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.weight}</TableCell>
                        <TableCell>{r.sg}</TableCell>
                        <TableCell>{r.gold_karat}</TableCell>
                        <TableCell>₦{r.amount.toFixed(2)}</TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => handleReprint(r)}>
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={logout} variant="destructive" className="gap-2">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      {/* Main Form */}
      <main className="flex justify-center items-center flex-1 px-4 py-8">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <Card className="w-full max-w-md shadow-lg rounded-2xl">
            <CardHeader>
              <CardTitle>Create Manual Receipt</CardTitle>
              <CardDescription>Fill in the details to generate and print.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="weight">Weight</Label>
                  <Input id="weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="10.5" />
                </div>
                <div>
                  <Label htmlFor="sg">S.G</Label>
                  <Input id="sg" type="number" value={sg} onChange={(e) => setSg(e.target.value)} placeholder="19.3" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="goldKarat">Gold Karat</Label>
                  <Input id="goldKarat" value={goldKarat} onChange={(e) => setGoldKarat(e.target.value)} placeholder="18K" />
                </div>
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="₦0.00" />
                </div>
              </div>
              {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm">{error}</motion.p>}
              {success && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-500 text-sm">{success}</motion.p>}
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button className="flex-1" onClick={handlePreviewReceipt} variant="outline">
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
              <Button className="flex-1" onClick={handleCreateReceipt}>
                <Printer className="mr-2 h-4 w-4" /> Generate & Print
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </main>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Print Preview</DialogTitle>
            <DialogDescription>Review the receipt before printing.</DialogDescription>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto rounded-md bg-gray-50 dark:bg-gray-800 p-4 font-mono text-sm shadow-inner">
            <pre className="whitespace-pre-wrap">{previewContent}</pre>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreviewModal(false)} variant="outline">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ManualReceiptPage;
