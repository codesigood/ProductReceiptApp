
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { PlusCircle, Edit, Trash2, AlertCircle, MoreVertical } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

interface Product {
  id: number;
  name: string;
  product_code?: string; // Add this line
  price: number;
  type: string;
  sizeOptions?: string;
}

interface ValidationErrors {
  name?: string;
  price?: string;
  type?: string;
}

const ProductManagement: React.FC = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [newProductData, setNewProductData] = useState({
    name: '',
    product_code: '',
    price: '',
    type: '',
    sizeOptions: '',
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const validateProduct = (product: { name: string; price: string; type: string }) => {
    const errors: ValidationErrors = {};
    if (!product.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!product.price.trim() || isNaN(parseFloat(product.price)) || parseFloat(product.price) <= 0) {
      errors.price = 'Price must be a positive number';
    }
    if (!product.type.trim()) {
      errors.type = 'Type is required';
    }
    return errors;
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await window.electron.ipcRenderer.invoke('product:getAll', { token });
      if (response.success) {
        setProducts(response.products);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [token]);

  const handleAddProduct = async () => {
    const errors = validateProduct(newProductData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    try {
      const response = await window.electron.ipcRenderer.invoke('product:create', {
        token,
        ...newProductData,
        price: parseFloat(newProductData.price),
      });
      if (response.success) {
        fetchProducts();
        setIsAddDialogOpen(false);
        setNewProductData({ name: '', price: '', type: '', sizeOptions: '' });
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add product');
    }
  };

  const handleUpdateProduct = async () => {
    if (!currentProduct) return;

    const errors = validateProduct({ name: currentProduct.name, price: String(currentProduct.price), type: currentProduct.type });
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    try {
      const response = await window.electron.ipcRenderer.invoke('product:update', {
        token,
        id: currentProduct.id,
        name: currentProduct.name,
        price: parseFloat(currentProduct.price as any),
        type: currentProduct.type,
        sizeOptions: currentProduct.sizeOptions,
      });
      if (response.success) {
        fetchProducts();
        setIsEditDialogOpen(false);
        setCurrentProduct(null);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    }
  };

  const handleDeleteProduct = async () => {
    if (!currentProduct) return;
    try {
      const response = await window.electron.ipcRenderer.invoke('product:delete', { token, id: currentProduct.id });
      if (response.success) {
        fetchProducts();
        setIsDeleteDialogOpen(false);
        setCurrentProduct(null);
      } else {
        setError(response.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete product');
    }
  };

  if (loading) return <div>Loading products...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Product Management</CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={(isOpen) => { setIsAddDialogOpen(isOpen); setValidationErrors({}); }}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" value={newProductData.name} onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })} className="col-span-3" />
                {validationErrors.name && <p className="col-span-4 text-red-500 text-sm text-right">{validationErrors.name}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="product_code" className="text-right">Product Code</Label>
                <Input id="product_code" value={newProductData.product_code} onChange={(e) => setNewProductData({ ...newProductData, product_code: e.target.value })} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="price" className="text-right">Price</Label>
                <Input id="price" type="number" value={newProductData.price} onChange={(e) => setNewProductData({ ...newProductData, price: e.target.value })} className="col-span-3" />
                {validationErrors.price && <p className="col-span-4 text-red-500 text-sm text-right">{validationErrors.price}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">Type</Label>
                <Input id="type" value={newProductData.type} onChange={(e) => setNewProductData({ ...newProductData, type: e.target.value })} className="col-span-3" />
                {validationErrors.type && <p className="col-span-4 text-red-500 text-sm text-right">{validationErrors.type}</p>}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="sizeOptions" className="text-right">Size Options</Label>
                <Input id="sizeOptions" value={newProductData.sizeOptions} onChange={(e) => setNewProductData({ ...newProductData, sizeOptions: e.target.value })} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddProduct} disabled={Object.keys(validateProduct(newProductData)).length > 0 && Object.keys(validationErrors).length > 0}>Add Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {/* Table for larger screens */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Product Code</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size Options</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.product_code}</TableCell>
                  <TableCell>{product.price}</TableCell>
                  <TableCell>{product.type}</TableCell>
                  <TableCell>{product.sizeOptions}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setCurrentProduct(product); setIsEditDialogOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setCurrentProduct(product); setIsDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Cards for smaller screens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
          {products.map((product) => (
            <Card key={product.id} className="p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg">{product.name}</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => { setCurrentProduct(product); setIsEditDialogOpen(true); }}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setCurrentProduct(product); setIsDeleteDialogOpen(true); }} className="text-red-500">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Code: {product.product_code}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{product.type}</p>
                <p className="text-lg font-semibold">${product.price.toFixed(2)}</p>
                {product.sizeOptions && <p className="text-sm">Sizes: {product.sizeOptions}</p>}
              </div>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(isOpen) => { setIsEditDialogOpen(isOpen); setValidationErrors({}); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            {currentProduct && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">Name</Label>
                  <Input id="edit-name" value={currentProduct.name} onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })} className="col-span-3" />
                  {validationErrors.name && <p className="col-span-4 text-red-500 text-sm text-right">{validationErrors.name}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-price" className="text-right">Price</Label>
                  <Input id="edit-price" type="number" value={currentProduct.price} onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })} className="col-span-3" />
                  {validationErrors.price && <p className="col-span-4 text-red-500 text-sm text-right">{validationErrors.price}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-type" className="text-right">Type</Label>
                  <Input id="edit-type" value={currentProduct.type} onChange={(e) => setCurrentProduct({ ...currentProduct, type: e.target.value })} className="col-span-3" />
                  {validationErrors.type && <p className="col-span-4 text-red-500 text-sm text-right">{validationErrors.type}</p>}
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-sizeOptions" className="text-right">Size Options</Label>
                  <Input id="edit-sizeOptions" value={currentProduct.sizeOptions || ''} onChange={(e) => setCurrentProduct({ ...currentProduct, sizeOptions: e.target.value })} className="col-span-3" />
                </div>
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                 <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              </DialogClose>
              <Button onClick={handleUpdateProduct} disabled={currentProduct ? Object.keys(validateProduct({ name: currentProduct.name, price: String(currentProduct.price), type: currentProduct.type })).length > 0 : false}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={(isOpen) => !isOpen && setIsDeleteDialogOpen(false)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to delete the product "{currentProduct?.name}"?</p>
            <DialogFooter>
               <DialogClose asChild>
                 <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDeleteProduct}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </CardContent>
    </Card>
  );
};

export default ProductManagement;
