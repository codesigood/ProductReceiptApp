# Backend Features Summary

The backend logic is primarily handled within the **Electron application** using IPC (Inter-Process Communication). The `server` directory contains a minimal Express.js server that appears to be for development or testing, as its functionality is duplicated and more fully realized in the Electron backend.

---

### Core Backend Features (Electron)

#### 1. User Management & Authentication
- **CRUD Operations:** Full Create, Read, Update, and Delete for users.
- **Authentication:** Handles user login and logout.
- **Session Management:** Manages user sessions with a 1-hour expiration, persisting them to the database to handle app restarts.

#### 2. Product Management
- **CRUD Operations:** Full Create, Read, Update, and Delete for products (including name, price, type, and size options).
- **Access Control:** Only users with the "admin" role can create, update, or delete products. All authenticated users can view products.

#### 3. Receipt & Sales Management
- **Receipt Creation:** Allows authenticated users to create new sales receipts.
- **Reporting:**
    - Salespersons can retrieve their own receipts.
    - Admins can retrieve all receipts and search them by date range, product name, or salesperson.

#### 4. Company Profile Management
- Admins can get and update company details like name, address, phone number, and tax rate.

#### 5. Hardware Integration (Receipt Printer)
- **Printer Configuration:** Allows saving and retrieving settings for receipt printers (supporting Epson and Star models) across various connection types (LAN, USB, etc.).
- **Printing:** Handles the actual printing of receipts and can generate a text-based print preview.

---

### Express Server (`server` directory)

- **Mock Login:** Contains a single `/login` endpoint with a hardcoded, non-functional user. This is likely a remnant from early development and is not part of the core application logic.

---

In summary, the application is a feature-rich desktop application whose backend is almost entirely self-contained within the Electron main process.
