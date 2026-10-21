// ─── Database Entity Types ───────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  stock: number;
  min_stock: number;
  image_url: string | null;
  category_id: string | null;
  barcode: string | null;
  unit: string;
  supplier: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
}

export interface Sale {
  id: string;
  total: number;
  discount: number;
  payment_method: PaymentMethod;
  cash_received: number | null;
  change_given: number | null;
  notes: string | null;
  created_at: string;
  sale_items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  reference_id: string | null;
  created_at: string;
  product?: Product;
}

// ─── Enum / Union Types ──────────────────────────────────────────────────────

export type PaymentMethod = 'cash' | 'card' | 'transfer';

export type StockMovementType = 'in' | 'out' | 'adjustment';

export type SortOrder = 'asc' | 'desc';

export type DateFilter = 'today' | 'week' | 'month' | 'year';

// ─── Form Types ──────────────────────────────────────────────────────────────

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  cost: string;
  stock: string;
  min_stock: string;
  category_id: string;
  barcode: string;
  unit: string;
  supplier: string;
  image_url: string;
}

export interface StockAdjustmentData {
  product_id: string;
  type: StockMovementType;
  quantity: number;
  reason: string;
}

// ─── Cart / POS Types ────────────────────────────────────────────────────────

export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CheckoutData {
  payment_method: PaymentMethod;
  cash_received: number;
  discount: number;
  notes: string;
}

// ─── Dashboard / Analytics Types ─────────────────────────────────────────────

export interface KPIStats {
  todayRevenue: number;
  todaySalesCount: number;
  totalProducts: number;
  lowStockCount: number;
  revenueChange: number;
  salesCountChange: number;
}

export interface SalesChartData {
  date: string;
  revenue: number;
  count: number;
}

export interface TopProductData {
  name: string;
  quantity: number;
  revenue: number;
}

// ─── UI / Component Types ────────────────────────────────────────────────────

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface FilterState {
  search: string;
  categoryId: string;
  sortBy: string;
  sortOrder: SortOrder;
  activeOnly: boolean;
}

// ─── Supabase Response Helpers ────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// ─── Cash Register (Apertura/Cierre de Caja) ─────────────────────────────────

export type CashRegisterStatus = 'open' | 'closed';

export interface CashRegister {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
  status: CashRegisterStatus;
  notes: string | null;
  total_cash: number | null;
  total_card: number | null;
  total_transfer: number | null;
  total_sales: number | null;
  difference: number | null;
  created_by: string | null;
}

export interface CashMovement {
  id: string;
  register_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  created_at: string;
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  document_type: 'CC' | 'NIT' | 'CE' | 'PP';
  document_number: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  active: boolean;
  created_at: string;
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string;
  name: string;
  nit: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  active: boolean;
  created_at: string;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  status: 'pending' | 'received' | 'cancelled';
  total: number;
  notes: string | null;
  created_at: string;
  received_at: string | null;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  product?: Product;
}

// ─── Quotes / Cotizaciones ────────────────────────────────────────────────────

export interface Quote {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  total: number;
  discount: number;
  valid_until: string | null;
  notes: string | null;
  created_at: string;
  customer?: Customer;
  items?: QuoteItem[];
}

export interface QuoteItem {
  id: string;
  quote_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
}

// ─── Returns / Devoluciones ───────────────────────────────────────────────────

export interface Return {
  id: string;
  sale_id: string | null;
  reason: string;
  total: number;
  status: 'pending' | 'approved' | 'rejected';
  notes: string | null;
  created_at: string;
  items?: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  return_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  company_name: string;
  nit: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  dian_resolution: string;
  dian_prefix: string;
  dian_from: number;
  dian_to: number;
  dian_valid_until: string;
  printer_name: string;
  drawer_enabled: boolean;
  drawer_port: string;
}
