export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export type ProductTipo = "inventariable" | "elaborado";

export interface Tag {
  id: number;
  name: string;
  slug: string;
  color: string;
  productCount?: number;
}

/** Imagen de galería asociada a un producto (orden en listado = orden de visualización). */
export interface ProductImageResponse {
  id: number;
  url: string;
}

export interface ProductResponse {
  id: number;
  code: string;
  name: string;
  description: string;
  categoryId: number;
  precio: number;
  costo: number;
  imagenUrl: string;
  isAvailable: boolean;
  isForSale: boolean;
  tipo?: ProductTipo;
  tagIds?: number[];
  /** Tiendas donde se ofrece un producto elaborado (ProductLocationOffers). */
  offerLocationIds?: number[];
  createdAt: string;
  modifiedAt: string;
  /** Stock agregado (si el API lo envía en listados). */
  totalStock?: number;
  /** Galería opcional en detalle; la imagen principal sigue siendo siempre `imagenUrl`. */
  productImages?: ProductImageResponse[];
}

export interface CreateProductRequest {
  code: string;
  name: string;
  description: string;
  categoryId: number | null;
  precio: number;
  costo: number;
  imagenUrl: string;
  isAvailable: boolean;
  isForSale: boolean;
  tipo?: ProductTipo;
  tagIds?: number[];
  offerLocationIds?: number[];
}

export interface UpdateProductRequest {
  code?: string;
  name?: string;
  description?: string;
  categoryId?: number | null;
  precio?: number;
  costo?: number;
  imagenUrl?: string;
  isAvailable?: boolean;
  isForSale?: boolean;
  tipo?: ProductTipo;
  tagIds?: number[];
  offerLocationIds?: number[];
}

/** El Yerro Menú — vista previa (scraping, sin persistencia). */
export interface ElYerroPreviewProduct {
  nombre: string;
  descripcion: string;
  precio: number;
  precioOriginal?: number | null;
  moneda: string;
  imagenUrl: string;
  categoria: string;
  slug: string;
  disponible: boolean;
  tieneDescuento: boolean;
  porcentajeDescuento?: number | null;
}

export interface ElYerroPreviewCategory {
  nombre: string;
  slug: string;
  cantidadProductos: number;
  url: string;
  productos: ElYerroPreviewProduct[];
}

export interface ElYerroPreviewResult {
  nombreNegocio: string;
  businessUrlNormalizada: string;
  categorias: ElYerroPreviewCategory[];
  errores: string[];
}

export interface ElYerroImportPreviewRequest {
  businessUrl: string;
  categoriasAImportar?: string[] | null;
}

export interface ElYerroImportExecuteRequest
  extends ElYerroImportPreviewRequest {
  importarSoloDisponibles?: boolean;
  actualizarSiExiste?: boolean;
}

export interface ElYerroImportResult {
  nombreNegocio: string;
  totalImportados: number;
  totalOmitidos: number;
  errores: string[];
  /** Productos creados/actualizados según contrato de la API. */
  productosImportados: unknown[];
}

export interface ProductCategoryResponse {
  id: number;
  name: string;
  description?: string;
  color: string;
  icon: string;
  createdAt: string;
  modifiedAt: string;
}

export interface CreateProductCategoryRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface UpdateProductCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
}

// ─── Proveedor ─────────────────────────────────────────────────────────────────

export interface SupplierResponse {
  id: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateSupplierRequest {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  isActive?: boolean;
}

// ─── CRM: Contacto (cliente) ───────────────────────────────────────────────────

export interface ContactResponse {
  id: number;
  name: string;
  company?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  origin?: string | null;
  isActive: boolean;
  assignedUserId?: number | null;
  createdAt: string;
  modifiedAt: string;
}

export interface CreateContactRequest {
  name: string;
  company?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  origin?: string;
  isActive?: boolean;
  assignedUserId?: number | null;
}

export interface UpdateContactRequest {
  name?: string;
  company?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  origin?: string;
  isActive?: boolean;
  assignedUserId?: number | null;
}

// ─── CRM: Lead ────────────────────────────────────────────────────────────────

export interface LeadResponse {
  id: number;
  name: string;
  company?: string | null;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  origin?: string | null;
  status: string;
  notes?: string | null;
  assignedUserId?: number | null;
  convertedToContactId?: number | null;
  convertedAt?: string | null;
  createdAt: string;
  modifiedAt: string;
}

export interface CreateLeadRequest {
  name: string;
  company?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  origin?: string;
  status?: string;
  notes?: string;
  assignedUserId?: number | null;
}

export interface UpdateLeadRequest {
  name?: string;
  company?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  origin?: string;
  status?: string;
  notes?: string;
  assignedUserId?: number | null;
}

// ─── Préstamos (Loan) ─────────────────────────────────────────────────────────

export interface LoanPaymentResponse {
  id: number;
  amount: number;
  paidAt: string;
  notes?: string | null;
  createdAt: string;
}

export interface LoanResponse {
  id: number;
  debtorName: string;
  principalAmount: number;
  /** Moneda en la que está expresado el capital prestado (catálogo de configuración). */
  principalCurrencyId?: number | null;
  /** Código ISO / corto para listados cuando el API lo envía. */
  principalCurrencyCode?: string | null;
  notes?: string | null;
  /** Porcentaje de interés; el significado depende de `interestRatePeriod`. */
  interestPercent?: number | null;
  /** daily | weekly | monthly | annual (minúsculas, inglés). Obligatorio en respuestas API. */
  interestRatePeriod?: string;
  interestStartDate?: string | null;
  /** Puede omitirse en listados; el detalle suele traerlo completo. */
  dueDates?: string[];
  totalPaid: number;
  outstandingPrincipal: number;
  /** Interés estimado (simple, según el período indicado). */
  estimatedInterest: number;
  estimatedTotalDue: number;
  payments?: LoanPaymentResponse[];
  createdAt: string;
  modifiedAt: string;
}

export interface CreateLoanRequest {
  debtorName: string;
  principalAmount: number;
  /** Moneda del capital (id de `/currency`). */
  principalCurrencyId?: number | null;
  notes?: string | null;
  interestPercent?: number | null;
  /** Si se omite, el backend asume `annual`. */
  interestRatePeriod?: string | null;
  interestStartDate?: string | null;
  dueDates?: string[];
}

export interface UpdateLoanRequest {
  debtorName?: string | null;
  principalAmount?: number | null;
  principalCurrencyId?: number | null;
  notes?: string | null;
  interestPercent?: number | null;
  interestRatePeriod?: string | null;
  interestStartDate?: string | null;
  dueDates?: string[] | null;
}

export interface RegisterLoanPaymentRequest {
  amount: number;
  paidAt: string;
  notes?: string | null;
}

// ─── Ubicación (LocationResponse en auth-types) ───────────────────────────────

/** Categorías de negocio para ubicaciones (GET /business-category). */
export interface BusinessCategoryResponse {
  id: number;
  name: string;
  isActive?: boolean;
  icon?: string | null;
  iconUrl?: string | null;
}

export interface UpdateBusinessCategoryRequest {
  name?: string;
  isActive?: boolean;
}

export interface CreateLocationRequest {
  organizationId: number;
  name: string;
  code: string;
  description?: string;
  whatsAppContact?: string;
  photoUrl?: string;
  province?: string;
  municipality?: string;
  street?: string;
  /** Coordenadas: enviar en raíz para compatibilidad con backend .NET */
  latitude?: number | null;
  longitude?: number | null;
  coordinates?: { lat: number; lng: number } | null;
  businessHours?: BusinessHoursDto;
  businessCategoryId?: number | null;
  offersDelivery?: boolean;
  offersPickup?: boolean;
}

export interface UpdateLocationRequest {
  organizationId?: number;
  name?: string;
  code?: string;
  description?: string;
  whatsAppContact?: string;
  photoUrl?: string;
  province?: string;
  municipality?: string;
  street?: string;
  latitude?: number | null;
  longitude?: number | null;
  coordinates?: { lat: number; lng: number } | null;
  businessHours?: BusinessHoursDto;
  businessCategoryId?: number | null;
  /** En PUT, `null` = no modificar (según contrato backend) */
  offersDelivery?: boolean | null;
  offersPickup?: boolean | null;
}

// ─── Inventario ───────────────────────────────────────────────────────────────

export interface InventoryResponse {
  id: number;
  productId: number;
  currentStock: number;
  minimumStock: number;
  unitOfMeasure: string;
  locationId: number;
  createdAt: string;
  modifiedAt: string;
  /** Enriquecimiento opcional en listados */
  productName?: string;
  locationName?: string;
  categoryName?: string;
  maximumStock?: number;
  modifiedByUserName?: string;
}

export interface CreateInventoryRequest {
  productId: number;
  locationId: number;
  currentStock: number;
  minimumStock: number;
  unitOfMeasure?: string;
}

export interface UpdateInventoryRequest {
  productId?: number;
  locationId?: number;
  currentStock?: number;
  minimumStock?: number;
  unitOfMeasure?: string;
}

// ─── Movimiento de inventario ─────────────────────────────────────────────────

export interface InventoryMovementResponse {
  id: number;
  productId: number;
  productName?: string;
  locationId: number;
  locationName?: string;
  type: string;
  quantity: number;
  previousStock?: number;
  newStock?: number;
  unitCost?: number;
  unitPrice?: number;
  reason?: string;
  supplierId?: number;
  referenceDocument?: string;
  userId?: number;
  /** Si el backend lo envía, evita depender solo del listado de usuarios */
  userFullName?: string;
  userName?: string;
  createdAt: string;
}

export interface CreateInventoryMovementRequest {
  productId: number;
  locationId: number;
  type: number;
  quantity: number;
  unitCost?: number;
  unitPrice?: number;
  reason?: string;
  supplierId?: number;
  referenceDocument?: string;
  userId?: number;
}

// ─── Rol y permisos ───────────────────────────────────────────────────────────

export interface RoleResponse {
  id: number;
  name: string;
  description?: string;
  isSystem: boolean;
  createdAt: string;
  modifiedAt: string;
  permissionIds: number[];
}

export interface PermissionResponse {
  id: number;
  code: string;
  name: string;
}

export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds: number[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionIds?: number[];
}

// ─── Usuario (UserResponse en auth-types; Create/Update aquí) ──────────────────

export interface CreateUserRequest {
  fullName: string;
  password: string;
  email: string;
  phone?: string;
  birthDate?: string;
  locationId?: number;
  organizationId?: number;
  roleId?: number;
}

export interface UpdateUserRequest {
  fullName?: string;
  oldPassword?: string;
  password?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  locationId?: number;
  organizationId?: number;
  roleId?: number;
  /** Estado de cuenta (p. ej. activo / inactivo); depende del backend */
  statusId?: number;
}

// ─── Configuración ───────────────────────────────────────────────────────────

export interface SettingResponse {
  id: number;
  key: string;
  value: string;
}

export type InventoryValuationMethod = "FIFO" | "LIFO" | "weighted_average";

export interface InventorySettingsDto {
  roundingDecimals: number;
  priceRoundingDecimals: number;
  allowNegativeStock: boolean;
  defaultUnitOfMeasure: string;
  /** Stock mínimo global; se usa para alertas de stock bajo cuando no hay mínimo por ítem. */
  defaultMinimumStock?: number;
  /** Método de valoración (si el backend lo soporta). */
  inventoryValuationMethod?: InventoryValuationMethod;
}

export interface CompanySettingsDto {
  name: string;
  taxId: string;
}

export type NotificationFrequency = "immediate" | "daily" | "weekly";

export interface NotificationsSettingsDto {
  alertOnLowStock: boolean;
  lowStockRecipients: string;
  /** Umbral global de stock crítico para alertas */
  criticalStockThreshold?: number;
  notificationFrequency?: NotificationFrequency;
}

export interface GroupedSettingsResponse {
  inventory?: InventorySettingsDto;
  company?: CompanySettingsDto;
  notifications?: NotificationsSettingsDto;
}

export interface UpdateGroupedSettingsRequest {
  inventory?: Partial<InventorySettingsDto>;
  company?: Partial<CompanySettingsDto>;
  notifications?: Partial<NotificationsSettingsDto>;
}

/** POST /account/update-profile — campos admitidos dependen del backend */
export interface AccountUpdateProfileRequest {
  fullName?: string;
  genderId?: number;
  birthDate?: string;
}

// ─── Monedas (GET/POST/PUT/DELETE /currency, PUT /currency/default) ─────────

export interface CurrencyResponse {
  id: number;
  code: string;
  name: string;
  /** Siempre respecto a CUP (base = 1) */
  exchangeRate: number;
  isActive: boolean;
  isBase: boolean;
  isDefaultDisplay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCurrencyRequest {
  code: string;
  name: string;
  exchangeRate: number;
  isActive?: boolean;
}

export interface UpdateCurrencyRequest {
  name?: string;
  exchangeRate?: number | null;
  isActive?: boolean | null;
}

export interface SetDefaultCurrencyRequest {
  currencyId: number;
}

// ─── Log ─────────────────────────────────────────────────────────────────────

export interface LogResponse {
  id: number;
  eventType: string;
  logType: string;
  createdAt: string;
  userId: number;
  description: string;
  ipAddress?: string;
}

// ─── Catálogo público ─────────────────────────────────────────────────────────

export type BusinessHoursDto = {
  [K in
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday"]?: {
    open: string;
    close: string;
  } | null;
};

export interface PublicLocation {
  id: number;
  name: string;
  description: string | null;
  organizationId: number;
  organizationName: string;
  whatsAppContact: string | null;
  photoUrl?: string | null;
  province?: string | null;
  municipality?: string | null;
  street?: string | null;
  /** Horarios completos enviados por el backend (sin procesar) */
  businessHours?: Record<
    string,
    {
      open: string;
      close: string;
    } | null
  > | null;
  /** Coordenadas crudas enviadas como objeto */
  coordinates?: {
    lat: number;
    lng: number;
  } | null;
  /** Indica si la tienda está abierta "ahora" según su horario */
  isOpenNow?: boolean | null;
  /** Hora de apertura de hoy (ej. "09:00") */
  todayOpen?: string | null;
  /** Hora de cierre de hoy (ej. "18:00") */
  todayClose?: string | null;
  /** Coordenadas opcionales para mapa */
  latitude?: number | null;
  longitude?: number | null;
  /** Alias por compatibilidad con posibles nombres del backend */
  lat?: number | null;
  lng?: number | null;
  productCount?: number;
  hasPromo?: boolean;
  offersDelivery?: boolean;
  offersPickup?: boolean;
}

export interface PublicCatalogItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  imagenUrl: string | null;
  precio: number;
  categoryId: number;
  categoryName: string | null;
  categoryColor: string | null;
  /** IDs de etiquetas del producto (para filtrar en catálogo público) */
  tagIds?: number[];
  /** Objetos tag del API (para búsqueda fuzzy por tags.name) */
  tags?: { id: number; name: string; slug: string; color?: string }[];
  stockAtLocation: number;
  tipo: ProductTipo;
  /** Indica si la tienda asociada está abierta "ahora" según su horario */
  isOpenNow: boolean | null;
  /** Identificador de la tienda a la que pertenece este producto (puede ser null en catálogos agregados) */
  locationId: number | null;
  /** Nombre de la tienda a la que pertenece este producto */
  locationName: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─── Carrito ──────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  imagenUrl: string | null;
  stockAtLocation: number;
  tipo?: ProductTipo;
}

// ─── Órdenes de venta ─────────────────────────────────────────────────────────

export type SaleOrderStatus = "Draft" | "Confirmed" | "Cancelled";

export interface SaleOrderItemResponse {
  id: number;
  saleOrderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  discount: number;
  lineTotal: number;
  grossMargin: number;
}

export interface SaleOrderResponse {
  id: number;
  folio: string;
  organizationId: number;
  locationId: number;
  locationName: string;
  contactId: number | null;
  contactName: string | null;
  status: SaleOrderStatus;
  notes: string | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  userId: number;
  createdAt: string;
  modifiedAt: string;
  items: SaleOrderItemResponse[];
}

export interface CreateSaleOrderItem {
  productId: number;
  quantity: number;
  /** Si se omite o es null, la API usa el precio actual del producto. */
  unitPrice?: number | null;
  /** Por defecto 0 en servidor si no se envía. */
  discount?: number;
}

export interface CreateSaleOrderRequest {
  locationId: number;
  contactId: number | null;
  notes: string | null;
  discountAmount: number;
  items: CreateSaleOrderItem[];
}

export interface UpdateSaleOrderRequest {
  contactId?: number | null;
  notes?: string;
  discountAmount?: number;
}

// ─── Tabla genérica ───────────────────────────────────────────────────────────

export interface TableColumn {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "boolean" | "currency" | "badge";
  width?: string;
}

// ─── Suscripción (GET /subscription/my-subscription) ─────────────────────────

export type SubscriptionStatus = "active" | "pending" | "expired" | "cancelled";
export type SubscriptionBillingCycle = "monthly" | "annual";

export interface MySubscriptionDto {
  planName: string;
  /** Id del plan actual (útil para upgrades). */
  planId: number | null;
  status: SubscriptionStatus;
  billingCycle: SubscriptionBillingCycle;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  /** null = no informado por la API; -1 = ilimitado explícito */
  productsLimit: number | null;
  usersLimit: number | null;
  locationsLimit: number | null;
}
