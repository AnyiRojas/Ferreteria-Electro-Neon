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
