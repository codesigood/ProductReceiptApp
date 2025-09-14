import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Search, Calendar, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatNaira } from '../../utils/formatCurrency';

interface ManualReceipt {
  id: number;
  sales_person_id: number;
  name: string;
  weight: number;
  sg: number;
  gold_karat: string;
  amount: number;
  transaction_code: string;
  created_at: string;
  sales_person: string;
}

interface User {
  id: number;
  email: string;
  role: 'admin' | 'sales_person';
}

interface DailySale {
  date: string;
  total: number;
}

const ManualReceiptsReport: React.FC = () => {
  const { token } = useAuth();
  const [receipts, setReceipts] = useState<ManualReceipt[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string>('all');
  const [searchType, setSearchType] = useState<string>('name');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showAllReceipts, setShowAllReceipts] = useState<boolean>(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [totalReceiptsCount, setTotalReceiptsCount] = useState(0);

  const [dailySalesData, setDailySalesData] = useState<DailySale[]>([]);

  const fetchUsers = async () => {
    try {
      const response = await window.api.user.getAll(token);
      if (response.success) {
        setUsers(response.users);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    }
  };

  const processDailySales = (receipts: ManualReceipt[]) => {
    const salesByDay: { [key: string]: number } = {};
    receipts.forEach(receipt => {
      const date = new Date(receipt.created_at).toLocaleDateString();
      if (salesByDay[date]) {
        salesByDay[date] += receipt.amount;
      } else {
        salesByDay[date] = receipt.amount;
      }
    });

    const chartData = Object.keys(salesByDay).map(date => ({
      date,
      total: salesByDay[date]
    }));

    setDailySalesData(chartData);
  };

  const handleSearch = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * itemsPerPage;

      const response = await window.api.receipt.searchManual({
        token,
        startDate: showAllReceipts ? undefined : startDate || undefined,
        endDate: showAllReceipts ? undefined : endDate || undefined,
        salesPersonId:
          selectedSalesPersonId && selectedSalesPersonId !== 'all'
            ? parseInt(selectedSalesPersonId)
            : undefined,
        search: searchType && searchTerm ? { type: searchType, term: searchTerm } : undefined,
        limit: 1000,
        offset
      });

      if (response.success) {
        setReceipts(response.receipts.slice(0, itemsPerPage));
        setTotalReceiptsCount(response.totalCount);
        processDailySales(response.receipts);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search manual receipts');
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setShowAllReceipts(false);
    setStartDate(today);
    setEndDate(today);
    setSelectedSalesPersonId('all');
    setSearchType('name');
    setSearchTerm('');
    setCurrentPage(1);
    handleSearch(1);
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  useEffect(() => {
    resetFilters();
  }, []);

  if (loading && !dailySalesData.length) return <div>Loading manual receipts...</div>;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manual Receipts Report</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {error && <div className="text-red-500 mb-4">{error}</div>}

        {/* Chart Section */}
        <div className="mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-semibold mb-2">Daily Sales Chart</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailySalesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatNaira(Number(value))} />
              <Legend />
              <Bar dataKey="total" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Filters Section */}
        <div className="mb-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center mb-4">
            <input
              type="checkbox"
              id="showAll"
              checked={showAllReceipts}
              onChange={(e) => setShowAllReceipts(e.target.checked)}
              className="mr-2"
            />
            <Label htmlFor="showAll" className="cursor-pointer">Show All Receipts (ignore date)</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Start Date */}
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="date"
                  id="startDate"
                  value={startDate}
                  disabled={showAllReceipts}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* End Date */}
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <div className="relative mt-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  type="date"
                  id="endDate"
                  value={endDate}
                  disabled={showAllReceipts}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sales Person */}
            <div>
              <Label htmlFor="salesPerson">Sales Person</Label>
              <Select value={selectedSalesPersonId} onValueChange={setSelectedSalesPersonId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All Sales Persons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sales Persons</SelectItem>
                  {users.filter(user => user.role === 'sales_person').map(user => (
                    <SelectItem key={user.id} value={String(user.id)}>{user.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <Label>Search</Label>
              <div className="flex gap-2 mt-1">
                <div className="w-1/2">
                  <Select value={searchType} onValueChange={setSearchType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Field" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="transaction_code">Transaction Code</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-1/2 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter term..."
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Apply & Reset Filters */}
          <div className="flex flex-col md:flex-row justify-end gap-2 mt-4">
            <Button onClick={() => { setCurrentPage(1); handleSearch(1); }} className="w-full md:w-auto">
              <Search className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
            <Button onClick={resetFilters} variant="outline" className="w-full md:w-auto">
              <RefreshCw className="mr-2 h-4 w-4" /> Reset Filters
            </Button>
          </div>
        </div>

        {/* Table Section */}
        <div className="flex-1 border rounded-lg overflow-hidden">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-100 dark:bg-gray-800 z-10">
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Transaction Code</TableHead>
                  <TableHead>Sales Person</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>S.G</TableHead>
                  <TableHead>Gold Karat</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : receipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center">No receipts found.</TableCell>
                  </TableRow>
                ) : (
                  receipts.map((receipt, index) => (
                    <TableRow key={receipt.id}>
                      <TableCell>{(currentPage - 1) * itemsPerPage + index + 1}</TableCell>
                      <TableCell>{receipt.transaction_code}</TableCell>
                      <TableCell>{receipt.sales_person}</TableCell>
                      <TableCell>{receipt.name}</TableCell>
                      <TableCell>{receipt.weight}</TableCell>
                      <TableCell>{receipt.sg}</TableCell>
                      <TableCell>{receipt.gold_karat}</TableCell>
                      <TableCell>{formatNaira(receipt.amount)}</TableCell>
                      <TableCell>{new Date(receipt.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || loading}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {Math.ceil(totalReceiptsCount / itemsPerPage)}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage * itemsPerPage >= totalReceiptsCount || loading}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ManualReceiptsReport;
