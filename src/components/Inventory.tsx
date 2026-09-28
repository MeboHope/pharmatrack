import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Search,
  Upload,
  Plus,
  Edit3,
  CheckCircle2,
  PackageCheck,
  Filter,
  RefreshCw,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import type {
  Drug,
  PharmacySettings,
} from "../types";

import {
  apiGet,
} from "../services/api";

import { exportToExcel } from "../utils/exportExcel";

interface InventoryBatch {
  id: string;
  organizationId?: string;
  productId: string;
  batchNo: string;
  manufactureDate?: string | null;
  expiryDate: string;
  initialQty: number;
  qty: number;
  buyingPrice: number;
  sellingPrice: number;
  status?: "ACTIVE" | "INACTIVE" | string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryProduct {
  id: string;
  organizationId?: string;
  code: string;
  name: string;
  genericName?: string | null;
  category?: string | null;
  formulation?: string | null;
  unit?: string | null;
  notes?: string | null;
  status?: "ACTIVE" | "INACTIVE" | string;
  createdAt?: string;
  updatedAt?: string;
  batches?: InventoryBatch[];
  totalQuantity?: number;
  activeBatchCount?: number;
  movementCount?: number;
  earliestExpiry?: string | null;
}

export interface ReceiveStockInput {
  productId: string;
  batchNo: string;
  manufactureDate?: string;
  expiryDate: string;
  quantity: number;
  buyingPrice: number;
  sellingPrice: number;
  referenceType?: string;
  referenceId?: string;
  notes?: string;
}

export interface InventoryProps {
  products: InventoryProduct[];
  settings: PharmacySettings;
  readOnly?: boolean;
  onAddProduct: () => void;
  onEditProduct: (product: InventoryProduct) => void;
  onReceiveStockSubmit: (
    input: ReceiveStockInput,
  ) => Promise<void>;

  // Temporary legacy compatibility while the remaining modules migrate.
  drugs?: Drug[];
  onAddDrug?: () => void;
  onEditDrug?: (drug: Drug) => void;
}

interface StockMovement {
  id: string;
  organizationId?: string;
  productId: string;
  batchId: string;
  type: string;
  quantityDelta: number;
  previousQty: number;
  resultingQty: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  notes?: string | null;
  userId?: string | null;
  createdAt: string;
  batch?: {
    id: string;
    batchNo: string;
    expiryDate: string;
  } | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
}

interface ProductApiResponse {
  success?: boolean;
  data?: unknown;
  message?: string;
}

interface BatchApiResponse {
  success?: boolean;
  data?: unknown;
  message?: string;
}

interface MovementApiResponse {
  success?: boolean;
  data?: unknown;
  message?: string;
}

type InventoryStatus =
  | "In Stock"
  | "Low Stock"
  | "Expired"
  | "Out of Stock";

type SortField =
  | "code"
  | "name"
  | "category"
  | "expiryDate"
  | "qty"
  | "sellingPrice"
  | "status"
  | "";

const LOW_STOCK_THRESHOLD = 10;

const normaliseProducts = (
  response: ProductApiResponse | unknown,
): InventoryProduct[] => {
  const source =
    response &&
    typeof response === "object" &&
    "data" in response
      ? (response as { data?: unknown }).data
      : response;

  if (Array.isArray(source)) {
    return source as InventoryProduct[];
  }

  if (
    source &&
    typeof source === "object" &&
    "products" in source
  ) {
    const products = (
      source as {
        products?: unknown;
      }
    ).products;

    return Array.isArray(products)
      ? (products as InventoryProduct[])
      : [];
  }

  return [];
};

const normaliseBatches = (
  response: BatchApiResponse | unknown,
): InventoryBatch[] => {
  const source =
    response &&
    typeof response === "object" &&
    "data" in response
      ? (response as { data?: unknown }).data
      : response;

  if (Array.isArray(source)) {
    return source as InventoryBatch[];
  }

  if (
    source &&
    typeof source === "object" &&
    "batches" in source
  ) {
    const batches = (
      source as {
        batches?: unknown;
      }
    ).batches;

    return Array.isArray(batches)
      ? (batches as InventoryBatch[])
      : [];
  }

  return [];
};

const normaliseMovements = (
  response: MovementApiResponse | unknown,
): StockMovement[] => {
  const source =
    response &&
    typeof response === "object" &&
    "data" in response
      ? (response as { data?: unknown }).data
      : response;

  if (Array.isArray(source)) {
    return source as StockMovement[];
  }

  if (
    source &&
    typeof source === "object" &&
    "movements" in source
  ) {
    const movements = (
      source as {
        movements?: unknown;
      }
    ).movements;

    return Array.isArray(movements)
      ? (movements as StockMovement[])
      : [];
  }

  return [];
};

const getInventoryStatus = (
  quantity: number,
  batches: InventoryBatch[],
): InventoryStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasExpiredBatch = batches.some(
    (batch) => {
      const expiry = new Date(
        batch.expiryDate,
      );

      expiry.setHours(
        0,
        0,
        0,
        0,
      );

      return (
        expiry < today &&
        batch.qty > 0
      );
    },
  );

  if (
    quantity <= 0
  ) {
    return "Out of Stock";
  }

  if (hasExpiredBatch) {
    return "Expired";
  }

  if (
    quantity <= LOW_STOCK_THRESHOLD
  ) {
    return "Low Stock";
  }

  return "In Stock";
};

const formatDate = (
  value?: string | null,
): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toISOString().slice(0, 10);
};

const isExpired = (
  expiryDate: string,
): boolean => {
  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  const expiry = new Date(
    expiryDate,
  );

  expiry.setHours(
    0,
    0,
    0,
    0,
  );

  return expiry < today;
};

const extractApiMessage = (
  error: unknown,
): string => {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    const message = (
      error as {
        message?: unknown;
      }
    ).message;

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  return "The requested inventory operation failed. Please try again.";
};

export const Inventory: React.FC<
  InventoryProps
> = ({
  products: propProducts,
  settings,
  readOnly = false,
  onAddProduct,
  onEditProduct,
  onReceiveStockSubmit,
  drugs = [],
}) => {
  const [
    activeSubTab,
    setActiveSubTab,
  ] = useState<
    "database" | "receive"
  >("database");

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    sortField,
    setSortField,
  ] = useState<SortField>("");

  const [
    sortOrder,
    setSortOrder,
  ] = useState<
    "asc" | "desc"
  >("asc");

  const [
    receiveSearch,
    setReceiveSearch,
  ] = useState("");

  const [
    selectedProduct,
    setSelectedProduct,
  ] =
    useState<InventoryProduct | null>(
      null,
    );

  const [
    selectedBatch,
    setSelectedBatch,
  ] =
    useState<InventoryBatch | null>(
      null,
    );

  const [
    selectedProductBatches,
    setSelectedProductBatches,
  ] = useState<
    InventoryBatch[]
  >([]);

  const [
    receiveQty,
    setReceiveQty,
  ] = useState("");

  const [
    receiveBatchNo,
    setReceiveBatchNo,
  ] = useState("");

  const [
    receiveManufactureDate,
    setReceiveManufactureDate,
  ] = useState("");

  const [
    receiveExpiryDate,
    setReceiveExpiryDate,
  ] = useState("");

  const [
    receiveBuyingPrice,
    setReceiveBuyingPrice,
  ] = useState("");

  const [
    receiveSellingPrice,
    setReceiveSellingPrice,
  ] = useState("");

  const [
    invoiceNo,
    setInvoiceNo,
  ] = useState("");

  const [
    receiveNotes,
    setReceiveNotes,
  ] = useState("");

  const [
    receiveSuccess,
    setReceiveSuccess,
  ] = useState<
    string | null
  >(null);

  const [
    receiveError,
    setReceiveError,
  ] = useState<
    string | null
  >(null);

  const [
    isReceiving,
    setIsReceiving,
  ] = useState(false);

  const [
    isExporting,
    setIsExporting,
  ] = useState(false);

  const [
    products,
    setProducts,
  ] = useState<
    InventoryProduct[]
  >([]);

  const [
    productsLoading,
    setProductsLoading,
  ] = useState(false);

  const [
    productsError,
    setProductsError,
  ] = useState<
    string | null
  >(null);

  const [
    expandedProductId,
    setExpandedProductId,
  ] = useState<
    string | null
  >(null);

  const [
    productBatches,
    setProductBatches,
  ] = useState<
    Record<
      string,
      InventoryBatch[]
    >
  >({});

  const [
    loadingBatches,
    setLoadingBatches,
  ] = useState<
    Record<string, boolean>
  >({});

  const [
    movements,
    setMovements,
  ] = useState<
    StockMovement[]
  >([]);

  const [
    movementsLoading,
    setMovementsLoading,
  ] = useState(false);

  const [
    showMovementHistory,
    setShowMovementHistory,
  ] = useState(false);

  const [
    movementProduct,
    setMovementProduct,
  ] =
    useState<InventoryProduct | null>(
      null,
    );

  const [
    refreshKey,
    setRefreshKey,
  ] = useState(0);

  useEffect(() => {
    setProducts(propProducts);
  }, [propProducts]);

  /*
   * Load the new Product catalogue.
   *
   * This is deliberately independent of the
   * legacy drugs prop so the component can begin
   * using the new inventory architecture before
   * App.tsx is migrated completely.
   */
  useEffect(() => {
    let cancelled = false;

    const loadProducts =
      async () => {
        try {
          setProductsLoading(
            true,
          );

          setProductsError(
            null,
          );

          const response =
            await apiGet<
              ProductApiResponse
            >("/products");

          if (cancelled) {
            return;
          }

          const loadedProducts =
            normaliseProducts(
              response,
            );

          setProducts(
            loadedProducts,
          );
        } catch (error) {
          if (!cancelled) {
            console.error(
              "Load inventory products:",
              error,
            );

            setProductsError(
              extractApiMessage(
                error,
              ),
            );
          }
        } finally {
          if (!cancelled) {
            setProductsLoading(
              false,
            );
          }
        }
      };

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  /*
   * The new product API is authoritative.
   * If it has not been populated yet, the legacy
   * list remains visible so the existing application
   * does not suddenly become blank during migration.
   */
  const displayProducts =
    products.length > 0
      ? products
      : drugs.map(
          (drug) => ({
            id: drug.id,
            code: drug.code,
            name: drug.name,
            genericName:
              drug.genericName,
            category:
              drug.category,
            formulation:
              drug.formulation,
            unit: drug.unit,
            status:
              "ACTIVE",
          }),
        );

  const categories =
    useMemo(() => {
      const values =
        displayProducts
          .map(
            (product) =>
              product.category?.trim(),
          )
          .filter(
            (
              value,
            ): value is string =>
              Boolean(value),
          );

      return Array.from(
        new Set(values),
      ).sort(
        (a, b) =>
          a.localeCompare(b),
      );
    }, [displayProducts]);

  /*
   * Convert legacy Drug records into a
   * temporary batch representation only when
   * the new Product API has not yet returned data.
   *
   * This compatibility layer can be removed once
   * App.tsx is fully migrated.
   */
  const legacyBatchesByProduct =
    useMemo(() => {
      const result: Record<
        string,
        InventoryBatch[]
      > = {};

      for (const drug of drugs) {
        result[drug.id] = [
          {
            id: `legacy-${drug.id}`,
            productId:
              drug.id,
            batchNo:
              drug.batchNo,
            expiryDate:
              drug.expiryDate,
            initialQty:
              drug.qty,
            qty: drug.qty,
            buyingPrice:
              Number(
                drug.buyingPrice,
              ),
            sellingPrice:
              Number(
                drug.sellingPrice,
              ),
            status:
              drug.status ===
              "Expired"
                ? "INACTIVE"
                : "ACTIVE",
          },
        ];
      }

      return result;
    }, [drugs]);

  const getBatchesForProduct =
    (
      productId: string,
    ): InventoryBatch[] => {
      return (
        productBatches[
          productId
        ] ??
        legacyBatchesByProduct[
          productId
        ] ??
        []
      );
    };

  /*
   * Fetch authoritative batch data from the
   * server. This helper returns the data directly
   * instead of relying on React state being updated
   * immediately.
   */
  const fetchBatchesFromServer =
    async (
      productId: string,
    ): Promise<
      InventoryBatch[]
    > => {
      try {
        const response =
          await apiGet<
            BatchApiResponse
          >(
            `/inventory/batches/${productId}`,
          );

        const batches =
          normaliseBatches(
            response,
          );

        return batches;
      } catch (error) {
        console.error(
          "Fetch inventory batches:",
          error,
        );

        return (
          productBatches[
            productId
          ] ??
          legacyBatchesByProduct[
            productId
          ] ??
          []
        );
      }
    };

  const loadBatches = async (
    productId: string,
  ) => {
    if (
      productBatches[
        productId
      ]
    ) {
      return;
    }

    try {
      setLoadingBatches(
        (previous) => ({
          ...previous,
          [productId]: true,
        }),
      );

      const response =
        await apiGet<
          BatchApiResponse
        >(
          `/inventory/batches/${productId}`,
        );

      const batches =
        normaliseBatches(
          response,
        );

      setProductBatches(
        (previous) => ({
          ...previous,
          [productId]:
            batches,
        }),
      );
    } catch (error) {
      console.error(
        "Load inventory batches:",
        error,
      );

      /*
       * Only use legacy data as a temporary
       * compatibility fallback.
       */
      setProductBatches(
        (previous) => ({
          ...previous,
          [productId]:
            legacyBatchesByProduct[
              productId
            ] ?? [],
        }),
      );
    } finally {
      setLoadingBatches(
        (previous) => ({
          ...previous,
          [productId]: false,
        }),
      );
    }
  };

  const toggleProduct =
    async (
      productId: string,
    ) => {
      if (
        expandedProductId ===
        productId
      ) {
        setExpandedProductId(
          null,
        );

        return;
      }

      setExpandedProductId(
        productId,
      );

      await loadBatches(
        productId,
      );
    };

  const filteredProducts =
    displayProducts.filter(
      (product) => {
        const query =
          searchQuery
            .trim()
            .toLowerCase();

        const matchesSearch =
          !query ||
          product.name
            .toLowerCase()
            .includes(query) ||
          product.code
            .toLowerCase()
            .includes(query) ||
          (
            product.genericName ??
            ""
          )
            .toLowerCase()
            .includes(query);

        const matchesCategory =
          categoryFilter ===
            "all" ||
          product.category ===
            categoryFilter;

        const batches =
          getBatchesForProduct(
            product.id,
          );

        const totalQty =
          batches.reduce(
            (
              total,
              batch,
            ) =>
              total +
              Number(
                batch.qty,
              ),
            0,
          );

        const status =
          getInventoryStatus(
            totalQty,
            batches,
          );

        const matchesStatus =
          statusFilter ===
            "all" ||
          status ===
            statusFilter;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesStatus
        );
      },
    );

  const productRows =
    filteredProducts.map(
      (product) => {
        const batches =
          getBatchesForProduct(
            product.id,
          );

        const totalQty =
          batches.reduce(
            (
              total,
              batch,
            ) =>
              total +
              Number(
                batch.qty,
              ),
            0,
          );

        const status =
          getInventoryStatus(
            totalQty,
            batches,
          );

        const activeBatches =
          batches.filter(
            (batch) =>
              batch.qty > 0 &&
              !isExpired(
                batch.expiryDate,
              ),
          );

        const nearestExpiry =
          activeBatches
            .sort(
              (
                a,
                b,
              ) =>
                new Date(
                  a.expiryDate,
                ).getTime() -
                new Date(
                  b.expiryDate,
                ).getTime(),
            )[0];

        const sellingPrice =
          nearestExpiry
            ? Number(
                nearestExpiry.sellingPrice,
              )
            : 0;

        return {
          product,
          batches,
          totalQty,
          status,
          nearestExpiry,
          sellingPrice,
        };
      },
    );

  const sortedProducts =
    [...productRows].sort(
      (a, b) => {
        if (!sortField) {
          return 0;
        }

        let aValue:
          | string
          | number = "";

        let bValue:
          | string
          | number = "";

        switch (
          sortField
        ) {
          case "code":
            aValue =
              a.product.code;
            bValue =
              b.product.code;
            break;

          case "name":
            aValue =
              a.product.name;
            bValue =
              b.product.name;
            break;

          case "category":
            aValue =
              a.product
                .category ??
              "";

            bValue =
              b.product
                .category ??
              "";
            break;

          case "expiryDate":
            aValue =
              a.nearestExpiry
                ? new Date(
                    a.nearestExpiry.expiryDate,
                  ).getTime()
                : Number.MAX_SAFE_INTEGER;

            bValue =
              b.nearestExpiry
                ? new Date(
                    b.nearestExpiry.expiryDate,
                  ).getTime()
                : Number.MAX_SAFE_INTEGER;
            break;

          case "qty":
            aValue =
              a.totalQty;

            bValue =
              b.totalQty;
            break;

          case "sellingPrice":
            aValue =
              a.sellingPrice;

            bValue =
              b.sellingPrice;
            break;

          case "status":
            aValue =
              a.status;

            bValue =
              b.status;
            break;

          default:
            return 0;
        }

        if (
          aValue <
          bValue
        ) {
          return sortOrder ===
            "asc"
            ? -1
            : 1;
        }

        if (
          aValue >
          bValue
        ) {
          return sortOrder ===
            "asc"
            ? 1
            : -1;
        }

        return 0;
      },
    );

  const receiveMatchingProducts =
    displayProducts.filter(
      (product) => {
        const query =
          receiveSearch
            .trim()
            .toLowerCase();

        if (!query) {
          return false;
        }

        return (
          product.name
            .toLowerCase()
            .includes(query) ||
          product.code
            .toLowerCase()
            .includes(query) ||
          (
            product.genericName ??
            ""
          )
            .toLowerCase()
            .includes(query)
        );
      },
    );

  const totalInventoryUnits =
    productRows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.totalQty,
      0,
    );

  const productsInStock =
    productRows.filter(
      (row) =>
        row.totalQty > 0,
    ).length;

  const lowStockProducts =
    productRows.filter(
      (row) =>
        row.status ===
        "Low Stock",
    ).length;

  const expiredProducts =
    productRows.filter(
      (row) =>
        row.status ===
        "Expired",
    ).length;

  const handleSort = (
    field: SortField,
  ) => {
    if (
      sortField ===
      field
    ) {
      setSortOrder(
        (previous) =>
          previous ===
          "asc"
            ? "desc"
            : "asc",
      );
    } else {
      setSortField(
        field,
      );

      setSortOrder(
        "asc",
      );
    }
  };

  const sortIndicator = (
    field: SortField,
  ) => {
    if (
      sortField !==
      field
    ) {
      return "↕";
    }

    return sortOrder ===
      "asc"
      ? "↑"
      : "↓";
  };

  /*
   * Export the inventory at BATCH level.
   *
   * IMPORTANT:
   * The visible Inventory table is product-level,
   * but Excel needs batch-level records for proper
   * pharmacy stock control.
   *
   * We therefore fetch the authoritative batches
   * for every product being exported instead of
   * relying only on products whose batch section
   * has already been expanded in the UI.
   */
  const handleExportExcel =
    async () => {
      if (
        isExporting ||
        sortedProducts.length ===
          0
      ) {
        return;
      }

      try {
        setIsExporting(
          true,
        );

        const exportRows =
          await Promise.all(
            sortedProducts.map(
              async (row) => {
                /*
                 * Always request the latest batch
                 * information from the server for
                 * the export. This prevents the Excel
                 * report from depending on which
                 * products the user has expanded.
                 */
                const batches =
                  await fetchBatchesFromServer(
                    row.product.id,
                  );

                /*
                 * Update the local cache too so that
                 * the screen can immediately benefit
                 * from the authoritative batch data.
                 */
                setProductBatches(
                  (previous) => ({
                    ...previous,
                    [row.product.id]:
                      batches,
                  }),
                );

                const totalQty =
                  batches.reduce(
                    (
                      total,
                      batch,
                    ) =>
                      total +
                      Number(
                        batch.qty,
                      ),
                    0,
                  );

                const productStatus =
                  getInventoryStatus(
                    totalQty,
                    batches,
                  );

                /*
                 * One Excel row per physical batch.
                 */
                if (
                  batches.length >
                  0
                ) {
                  return batches.map(
                    (
                      batch,
                    ) => ({
                      Code:
                        row
                          .product
                          .code,

                      "Drug Name":
                        row
                          .product
                          .name,

                      "Generic Name":
                        row
                          .product
                          .genericName ??
                        "",

                      Category:
                        row
                          .product
                          .category ??
                        "",

                      Formulation:
                        row
                          .product
                          .formulation ??
                        "",

                      Batch:
                        batch.batchNo,

                      "Manufacture Date":
                        batch.manufactureDate
                          ? formatDate(
                              batch.manufactureDate,
                            )
                          : "",

                      "Expiry Date":
                        formatDate(
                          batch.expiryDate,
                        ),

                      "Qty in Batch":
                        Number(
                          batch.qty,
                        ),

                      "Total Product Qty":
                        totalQty,

                      Unit:
                        row
                          .product
                          .unit ??
                        "",

                      "Buying Price":
                        Number(
                          batch.buyingPrice,
                        ),

                      "Selling Price":
                        Number(
                          batch.sellingPrice,
                        ),

                      "Batch Status":
                        isExpired(
                          batch.expiryDate,
                        )
                          ? "Expired"
                          : batch.qty <=
                              0
                            ? "Out of Stock"
                            : "Active",

                      "Product Status":
                        productStatus,

                      "Invoice / Reference":
                        batch.notes ??
                        "",

                      "Product ID":
                        row
                          .product
                          .id,

                      "Batch ID":
                        batch.id,
                    }),
                  );
                }

                /*
                 * Keep products with no batches in the
                 * export instead of silently dropping them.
                 */
                return [
                  {
                    Code:
                      row
                        .product
                        .code,

                    "Drug Name":
                      row
                        .product
                        .name,

                    "Generic Name":
                      row
                        .product
                        .genericName ??
                      "",

                    Category:
                      row
                        .product
                        .category ??
                      "",

                    Formulation:
                      row
                        .product
                        .formulation ??
                      "",

                    Batch:
                      "",

                    "Manufacture Date":
                      "",

                    "Expiry Date":
                      "",

                    "Qty in Batch":
                      0,

                    "Total Product Qty":
                      0,

                    Unit:
                      row
                        .product
                        .unit ??
                      "",

                    "Buying Price":
                      0,

                    "Selling Price":
                      0,

                    "Batch Status":
                      "No Batch",

                    "Product Status":
                      "Out of Stock",

                    "Invoice / Reference":
                      "",

                    "Product ID":
                      row
                        .product
                        .id,

                    "Batch ID":
                      "",
                  },
                ];
              },
            ),
          );

        const exportData =
          exportRows.flat();

        if (
          exportData.length ===
          0
        ) {
          return;
        }

        exportToExcel(
          exportData,
          `PharmaTrack_Inventory_${new Date()
            .toISOString()
            .slice(
              0,
              10,
            )}`,
          "Inventory",
        );
      } catch (error) {
        console.error(
          "Export inventory to Excel:",
          error,
        );
      } finally {
        setIsExporting(
          false,
        );
      }
    };

  const resetReceivingForm =
    () => {
      setSelectedProduct(
        null,
      );

      setSelectedBatch(
        null,
      );

      setSelectedProductBatches(
        [],
      );

      setReceiveSearch(
        "",
      );

      setReceiveQty(
        "",
      );

      setReceiveBatchNo(
        "",
      );

      setReceiveManufactureDate(
        "",
      );

      setReceiveExpiryDate(
        "",
      );

      setReceiveBuyingPrice(
        "",
      );

      setReceiveSellingPrice(
        "",
      );

      setInvoiceNo(
        "",
      );

      setReceiveNotes(
        "",
      );
    };

  const handleSelectProduct =
    async (
      product: InventoryProduct,
    ) => {
      setSelectedProduct(
        product,
      );

      setSelectedBatch(
        null,
      );

      setReceiveSearch(
        "",
      );

      setReceiveError(
        null,
      );

      setReceiveSuccess(
        null,
      );

      await loadBatches(
        product.id,
      );

      /*
       * Read the cached result after loading.
       * React state updates asynchronously, so we
       * use the latest known cache when available.
       */
      const batches =
        productBatches[
          product.id
        ] ??
        legacyBatchesByProduct[
          product.id
        ] ??
        [];

      setSelectedProductBatches(
        batches,
      );

      /*
       * If there is exactly one existing batch,
       * preselecting it is convenient but we do not
       * automatically reuse its expiry because a
       * new receipt must explicitly identify its batch.
       */
      if (
        batches.length ===
          1 &&
        batches[0]
      ) {
        setReceiveBatchNo(
          batches[0]
            .batchNo,
        );

        setReceiveExpiryDate(
          formatDate(
            batches[0]
              .expiryDate,
          ),
        );

        setReceiveBuyingPrice(
          String(
            batches[0]
              .buyingPrice,
          ),
        );

        setReceiveSellingPrice(
          String(
            batches[0]
              .sellingPrice,
          ),
        );
      }
    };

  const handleSelectExistingBatch =
    (
      batch: InventoryBatch,
    ) => {
      setSelectedBatch(
        batch,
      );

      setReceiveBatchNo(
        batch.batchNo,
      );

      setReceiveExpiryDate(
        formatDate(
          batch.expiryDate,
        ),
      );

      setReceiveBuyingPrice(
        String(
          batch.buyingPrice,
        ),
      );

      setReceiveSellingPrice(
        String(
          batch.sellingPrice,
        ),
      );

      setReceiveError(
        null,
      );
    };

  const handleProcessReception =
    async (
      e: React.FormEvent,
    ) => {
      e.preventDefault();

      setReceiveError(
        null,
      );

      setReceiveSuccess(
        null,
      );

      if (readOnly) {
        setReceiveError(
          "You have read-only access to inventory.",
        );

        return;
      }

      if (!selectedProduct) {
        setReceiveError(
          "Please select a product.",
        );

        return;
      }

      const quantity =
        Number(
          receiveQty,
        );

      if (
        !Number.isInteger(
          quantity,
        ) ||
        quantity <= 0
      ) {
        setReceiveError(
          "Quantity received must be a positive whole number.",
        );

        return;
      }

      const batchNo =
        receiveBatchNo.trim();

      if (!batchNo) {
        setReceiveError(
          "Batch number is required.",
        );

        return;
      }

      const expiryDate =
        receiveExpiryDate.trim();

      if (!expiryDate) {
        setReceiveError(
          "Expiry date is required.",
        );

        return;
      }

      const expiry =
        new Date(
          expiryDate,
        );

      if (
        Number.isNaN(
          expiry.getTime(),
        )
      ) {
        setReceiveError(
          "Please enter a valid expiry date.",
        );

        return;
      }

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0,
      );

      expiry.setHours(
        0,
        0,
        0,
        0,
      );

      if (
        expiry <= today
      ) {
        setReceiveError(
          "Stock cannot be received with an expired expiry date.",
        );

        return;
      }

      let manufactureDate:
        | string
        | undefined;

      if (
        receiveManufactureDate.trim()
      ) {
        const manufacture =
          new Date(
            receiveManufactureDate,
          );

        if (
          Number.isNaN(
            manufacture.getTime(),
          )
        ) {
          setReceiveError(
            "Please enter a valid manufacture date.",
          );

          return;
        }

        if (
          manufacture >
          expiry
        ) {
          setReceiveError(
            "Manufacture date cannot be later than the expiry date.",
          );

          return;
        }

        manufactureDate =
          receiveManufactureDate.trim();
      }

      const buyingPrice =
        Number(
          receiveBuyingPrice,
        );

      if (
        !Number.isFinite(
          buyingPrice,
        ) ||
        buyingPrice < 0
      ) {
        setReceiveError(
          "Please enter a valid buying price.",
        );

        return;
      }

      const sellingPrice =
        Number(
          receiveSellingPrice,
        );

      if (
        !Number.isFinite(
          sellingPrice,
        ) ||
        sellingPrice < 0
      ) {
        setReceiveError(
          "Please enter a valid selling price.",
        );

        return;
      }

      if (
        sellingPrice <
        buyingPrice
      ) {
        setReceiveError(
          "Selling price cannot be lower than buying price.",
        );

        return;
      }

      try {
        setIsReceiving(
          true,
        );

        /*
         * NEW INVENTORY FLOW
         *
         * This writes to:
         * Product -> DrugBatch -> StockMovement
         *
         * The backend performs the authoritative
         * quantity update inside a database transaction.
         */
        const input: ReceiveStockInput = {
          productId:
            selectedProduct.id,

          batchNo,

          manufactureDate,

          expiryDate,

          quantity,

          buyingPrice,

          sellingPrice,

          referenceType:
            "PURCHASE_INVOICE",

          referenceId:
            invoiceNo.trim() ||
            undefined,

          notes:
            receiveNotes.trim() ||
            undefined,
        };

        await onReceiveStockSubmit(
          input,
        );

        const receivedQuantity =
          quantity;

        setReceiveSuccess(
          `Successfully received ${receivedQuantity} units of ${selectedProduct.name}. Batch ${batchNo} is now recorded in the inventory ledger.`,
        );

        /*
         * Clear cached batch data for this product
         * so the next view retrieves the authoritative
         * server state.
         */
        setProductBatches(
          (previous) => {
            const next = {
              ...previous,
            };

            delete next[
              selectedProduct.id
            ];

            return next;
          },
        );

        setSelectedProductBatches(
          [],
        );

        setSelectedBatch(
          null,
        );

        /*
         * Refresh the Product catalogue as well.
         */
        setRefreshKey(
          (previous) =>
            previous + 1,
        );

        setReceiveQty(
          "",
        );

        setReceiveBatchNo(
          "",
        );

        setReceiveManufactureDate(
          "",
        );

        setReceiveExpiryDate(
          "",
        );

        setReceiveBuyingPrice(
          "",
        );

        setReceiveSellingPrice(
          "",
        );

        setInvoiceNo(
          "",
        );

        setReceiveNotes(
          "",
        );
      } catch (error) {
        console.error(
          "Receive inventory stock:",
          error,
        );

        setReceiveError(
          extractApiMessage(
            error,
          ),
        );
      } finally {
        setIsReceiving(
          false,
        );
      }
    };

  const handleLoadMovements =
    async (
      product: InventoryProduct,
    ) => {
      try {
        setMovementProduct(
          product,
        );

        setShowMovementHistory(
          true,
        );

        setMovementsLoading(
          true,
        );

        const response =
          await apiGet<
            MovementApiResponse
          >(
            `/inventory/movements/${product.id}`,
          );

        setMovements(
          normaliseMovements(
            response,
          ),
        );
      } catch (error) {
        console.error(
          "Load stock movements:",
          error,
        );

        setMovements(
          [],
        );
      } finally {
        setMovementsLoading(
          false,
        );
      }
    };

  const handleCloseMovementHistory =
    () => {
      setShowMovementHistory(
        false,
      );

      setMovementProduct(
        null,
      );

      setMovements(
        [],
      );
    };

  const handleRefresh =
    () => {
      setProductBatches(
        {},
      );

      setExpandedProductId(
        null,
      );

      setRefreshKey(
        (previous) =>
          previous + 1,
      );
    };

  return (
    <div className="p-6 space-y-6 max-w-[1500px] mx-auto">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Inventory Management
          </h1>

          <p className="text-sm text-slate-500 font-medium mt-1">
            {displayProducts.length} products •{" "}
            {totalInventoryUnits.toLocaleString()} units in stock
            {readOnly
              ? " • Read-only access"
              : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="tab-drug-database"
              type="button"
              onClick={() =>
                setActiveSubTab(
                  "database",
                )
              }
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeSubTab ===
                "database"
                  ? "bg-[#0D8065]/10 text-[#0D8065] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Product Database
            </button>

            {!readOnly && (
              <button
                id="tab-receive-stock"
                type="button"
                onClick={() =>
                  setActiveSubTab(
                    "receive",
                  )
                }
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                  activeSubTab ===
                  "receive"
                    ? "bg-[#0D8065]/10 text-[#0D8065] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Receive Stock
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={
              handleRefresh
            }
            disabled={
              productsLoading
            }
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh inventory"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                productsLoading
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>
        </div>
      </div>

      {activeSubTab ===
        "database" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Products
              </p>

              <p className="text-2xl font-bold text-slate-900 mt-1">
                {
                  displayProducts.length
                }
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                In Stock
              </p>

              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {
                  productsInStock
                }
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Low Stock
              </p>

              <p className="text-2xl font-bold text-amber-600 mt-1">
                {
                  lowStockProducts
                }
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Expiry Attention
              </p>

              <p className="text-2xl font-bold text-rose-600 mt-1">
                {
                  expiredProducts
                }
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />

                <input
                  type="text"
                  id="search-drug-input"
                  placeholder="Search products by name, code, generic..."
                  value={
                    searchQuery
                  }
                  onChange={(
                    e,
                  ) =>
                    setSearchQuery(
                      e.target
                        .value,
                    )
                  }
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#22577A] focus:outline-hidden"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />

                  <select
                    value={
                      categoryFilter
                    }
                    onChange={(
                      e,
                    ) =>
                      setCategoryFilter(
                        e.target
                          .value,
                      )
                    }
                    className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                  >
                    <option value="all">
                      All Categories
                    </option>

                    {categories.map(
                      (
                        category,
                      ) => (
                        <option
                          key={
                            category
                          }
                          value={
                            category
                          }
                        >
                          {
                            category
                          }
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    e,
                  ) =>
                    setStatusFilter(
                      e.target
                        .value,
                    )
                  }
                  className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden text-slate-700"
                >
                  <option value="all">
                    All Statuses
                  </option>

                  <option value="In Stock">
                    In Stock
                  </option>

                  <option value="Low Stock">
                    Low Stock
                  </option>

                  <option value="Expired">
                    Expired
                  </option>

                  <option value="Out of Stock">
                    Out of Stock
                  </option>
                </select>

                <button
                  id="btn-export-excel"
                  type="button"
                  onClick={() =>
                    void handleExportExcel()
                  }
                  disabled={
                    isExporting ||
                    productsLoading ||
                    sortedProducts.length ===
                      0
                  }
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}

                  {isExporting
                    ? "Preparing Excel..."
                    : "Export to Excel"}
                </button>

                {!readOnly && (
                  <button
                    id="btn-add-drug-main"
                    type="button"
                    onClick={
                      onAddProduct
                    }
                    className="px-4 py-2 text-xs font-bold text-white bg-[#0d8065] hover:bg-[#0a6d56] rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    Add Product
                  </button>
                )}
              </div>
            </div>

            {productsError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                The new product catalogue could
                not be loaded. Showing the
                currently available inventory data
                while the connection is retried.
              </div>
            )}

            {readOnly && (
              <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-800">
                You are viewing inventory in
                read-only mode. Stock, pricing,
                product definitions, and receiving
                cannot be changed from this account.
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs font-semibold uppercase tracking-wider">
                    {[
                      [
                        "code",
                        "Code",
                      ],
                      [
                        "name",
                        "Product",
                      ],
                      [
                        "category",
                        "Category",
                      ],
                      [
                        "expiryDate",
                        "Nearest Expiry",
                      ],
                      [
                        "qty",
                        "Qty",
                      ],
                      [
                        "sellingPrice",
                        "Price",
                      ],
                      [
                        "status",
                        "Status",
                      ],
                    ].map(
                      ([
                        field,
                        label,
                      ]) => (
                        <th
                          key={
                            field
                          }
                          onClick={() =>
                            handleSort(
                              field as SortField,
                            )
                          }
                          className="py-2.5 px-2.5 whitespace-nowrap cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                        >
                          {
                            label
                          }{" "}
                          <span className="text-slate-400 font-normal">
                            {sortIndicator(
                              field as SortField,
                            )}
                          </span>
                        </th>
                      ),
                    )}

                    <th className="py-2.5 px-2 text-right whitespace-nowrap">
                      Details
                    </th>

                    {!readOnly && (
                      <th className="py-2.5 px-2 text-right whitespace-nowrap">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {productsLoading &&
                  sortedProducts.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan={
                          readOnly
                            ? 8
                            : 9
                        }
                        className="py-12 text-center text-slate-400"
                      >
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                        Loading inventory...
                      </td>
                    </tr>
                  ) : sortedProducts.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan={
                          readOnly
                            ? 8
                            : 9
                        }
                        className="py-10 text-center text-slate-400"
                      >
                        No products found matching
                        your search.
                      </td>
                    </tr>
                  ) : (
                    sortedProducts.map(
                      (row) => {
                        const isExpanded =
                          expandedProductId ===
                          row.product
                            .id;

                        return (
                          <React.Fragment
                            key={
                              row
                                .product
                                .id
                            }
                          >
                            <tr className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-2 text-xs font-semibold text-[#22577A] whitespace-nowrap">
                                {
                                  row
                                    .product
                                    .code
                                }
                              </td>

                              <td className="py-2.5 pl-2 pr-1 max-w-[220px] min-w-[150px]">
                                <div className="font-bold text-slate-900 text-xs sm:text-sm whitespace-normal leading-snug break-words">
                                  {
                                    row
                                      .product
                                      .name
                                  }
                                </div>

                                <div className="text-[11px] text-slate-400 font-normal whitespace-normal leading-tight break-words">
                                  {
                                    row
                                      .product
                                      .genericName ??
                                    ""
                                  }
                                </div>

                                <div className="text-[10px] text-slate-400 mt-1">
                                  {
                                    row
                                      .product
                                      .formulation ??
                                    ""
                                  }

                                  {row
                                    .product
                                    .unit
                                    ? ` • ${row.product.unit}`
                                    : ""}
                                </div>
                              </td>

                              <td className="py-2.5 pl-1 pr-2 text-xs text-slate-600 whitespace-nowrap">
                                {
                                  row
                                    .product
                                    .category ??
                                  "—"
                                }
                              </td>

                              <td className="py-2.5 px-2 text-xs font-semibold whitespace-nowrap">
                                {row.nearestExpiry ? (
                                  isExpired(
                                    row
                                      .nearestExpiry
                                      .expiryDate,
                                  ) ? (
                                    <span className="px-1.5 py-0.5 rounded-md text-white text-[11px] inline-block font-semibold bg-[#D71D2D]">
                                      {formatDate(
                                        row
                                          .nearestExpiry
                                          .expiryDate,
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 font-medium">
                                      {formatDate(
                                        row
                                          .nearestExpiry
                                          .expiryDate,
                                      )}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-slate-400">
                                    —
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-2 whitespace-nowrap">
                                <span className="font-semibold text-xs sm:text-sm">
                                  {row.totalQty.toLocaleString()}
                                </span>

                                <span className="text-xs text-slate-400 ml-1">
                                  {
                                    row
                                      .product
                                      .unit ??
                                    "units"
                                  }
                                </span>
                              </td>

                              <td className="py-2.5 px-2 font-semibold text-slate-900 text-xs sm:text-sm whitespace-nowrap">
                                {
                                  settings.currency
                                }{" "}
                                {row.sellingPrice.toFixed(
                                  2,
                                )}
                              </td>

                              <td className="py-2.5 px-2 whitespace-nowrap">
                                {row.status ===
                                  "Expired" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white bg-[#D71D2D]">
                                    Expired
                                  </span>
                                )}

                                {row.status ===
                                  "In Stock" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                                    In Stock
                                  </span>
                                )}

                                {row.status ===
                                  "Low Stock" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                                    Low Stock
                                  </span>
                                )}

                                {row.status ===
                                  "Out of Stock" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                                    Out of Stock
                                  </span>
                                )}
                              </td>

                              <td className="py-2.5 px-2 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void toggleProduct(
                                      row
                                        .product
                                        .id,
                                    )
                                  }
                                  className="px-2.5 py-1 text-xs font-semibold text-[#22577A] hover:bg-sky-50 rounded-lg transition-colors inline-flex items-center gap-1"
                                >
                                  {row
                                    .batches
                                    .length}{" "}
                                  batch
                                  {row
                                    .batches
                                    .length !==
                                  1
                                    ? "es"
                                    : ""}

                                  {isExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </td>

                              {!readOnly && (
                                <td className="py-2.5 px-2 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      id={`btn-edit-product-${row.product.id}`}
                                      type="button"
                                      onClick={() =>
                                        onEditProduct(
                                          row.product,
                                        )
                                      }
                                      className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-white bg-slate-100 hover:bg-[#22577A] cursor-pointer rounded-lg transition-colors flex items-center gap-1 inline-flex"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                      Edit
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedProduct(
                                          row.product,
                                        );

                                        setActiveSubTab(
                                          "receive",
                                        );

                                        void handleSelectProduct(
                                          row.product,
                                        );
                                      }}
                                      className="px-2.5 py-1 text-xs font-semibold text-white bg-[#0d8065] hover:bg-[#0a6d56] rounded-lg transition-colors inline-flex items-center gap-1"
                                    >
                                      <PackageCheck className="w-3.5 h-3.5" />
                                      Receive
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>

                            {isExpanded && (
                              <tr>
                                <td
                                  colSpan={
                                    readOnly
                                      ? 8
                                      : 9
                                  }
                                  className="bg-slate-50 p-4"
                                >
                                  <div className="border border-slate-200 bg-white rounded-xl overflow-hidden">
                                    <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div>
                                        <h3 className="text-sm font-bold text-slate-900">
                                          Batch Inventory
                                        </h3>

                                        <p className="text-xs text-slate-500 mt-0.5">
                                          {
                                            row
                                              .product
                                              .name
                                          }{" "}
                                          •{" "}
                                          {
                                            row
                                              .product
                                              .code
                                          }
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          void handleLoadMovements(
                                            row.product,
                                          )
                                        }
                                        className="px-3 py-1.5 text-xs font-semibold text-[#22577A] bg-sky-50 hover:bg-sky-100 rounded-lg inline-flex items-center gap-1.5"
                                      >
                                        <History className="w-3.5 h-3.5" />
                                        Movement History
                                      </button>
                                    </div>

                                    {loadingBatches[
                                      row
                                        .product
                                        .id
                                    ] ? (
                                      <div className="p-6 text-center text-xs text-slate-400">
                                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                                        Loading batches...
                                      </div>
                                    ) : row.batches.length ===
                                      0 ? (
                                      <div className="p-6 text-center text-xs text-slate-400">
                                        No batches have been
                                        recorded for this
                                        product yet.
                                      </div>
                                    ) : (
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                          <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider">
                                              <th className="text-left px-4 py-2.5">
                                                Batch
                                              </th>

                                              <th className="text-left px-4 py-2.5">
                                                Expiry
                                              </th>

                                              <th className="text-right px-4 py-2.5">
                                                Qty
                                              </th>

                                              <th className="text-right px-4 py-2.5">
                                                Buying
                                              </th>

                                              <th className="text-right px-4 py-2.5">
                                                Selling
                                              </th>

                                              <th className="text-left px-4 py-2.5">
                                                Status
                                              </th>
                                            </tr>
                                          </thead>

                                          <tbody className="divide-y divide-slate-100">
                                            {row.batches.map(
                                              (
                                                batch,
                                              ) => (
                                                <tr
                                                  key={
                                                    batch.id
                                                  }
                                                  className="hover:bg-slate-50"
                                                >
                                                  <td className="px-4 py-2.5 font-semibold text-slate-800">
                                                    {
                                                      batch.batchNo
                                                    }
                                                  </td>

                                                  <td className="px-4 py-2.5">
                                                    <span
                                                      className={
                                                        isExpired(
                                                          batch.expiryDate,
                                                        )
                                                          ? "text-rose-600 font-bold"
                                                          : "text-slate-600"
                                                      }
                                                    >
                                                      {formatDate(
                                                        batch.expiryDate,
                                                      )}
                                                    </span>
                                                  </td>

                                                  <td className="px-4 py-2.5 text-right font-semibold">
                                                    {Number(
                                                      batch.qty,
                                                    ).toLocaleString()}
                                                  </td>

                                                  <td className="px-4 py-2.5 text-right">
                                                    {
                                                      settings.currency
                                                    }{" "}
                                                    {Number(
                                                      batch.buyingPrice,
                                                    ).toFixed(
                                                      2,
                                                    )}
                                                  </td>

                                                  <td className="px-4 py-2.5 text-right font-semibold">
                                                    {
                                                      settings.currency
                                                    }{" "}
                                                    {Number(
                                                      batch.sellingPrice,
                                                    ).toFixed(
                                                      2,
                                                    )}
                                                  </td>

                                                  <td className="px-4 py-2.5">
                                                    {isExpired(
                                                      batch.expiryDate,
                                                    ) ? (
                                                      <span className="text-rose-600 font-semibold">
                                                        Expired
                                                      </span>
                                                    ) : batch.qty <=
                                                      0 ? (
                                                      <span className="text-slate-500 font-semibold">
                                                        Out of Stock
                                                      </span>
                                                    ) : (
                                                      <span className="text-emerald-700 font-semibold">
                                                        Active
                                                      </span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ),
                                            )}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      },
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!readOnly &&
        activeSubTab ===
          "receive" && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-3xl mx-auto space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Receive New Stock
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    Record incoming stock against a
                    specific product and physical
                    batch.
                  </p>
                </div>

                <div className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                  Batch-controlled inventory
                </div>
              </div>

              <p className="text-[11px] text-slate-500 font-normal mt-2">
                Fields marked with{" "}
                <span className="text-red-500 font-bold">
                  *
                </span>{" "}
                are required.
              </p>
            </div>

            {receiveSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />

                <span>
                  {
                    receiveSuccess
                  }
                </span>
              </div>
            )}

            {receiveError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium rounded-xl">
                {
                  receiveError
                }
              </div>
            )}

            <form
              onSubmit={
                handleProcessReception
              }
              className="space-y-5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Product{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search product by name, code, or generic name..."
                    value={
                      selectedProduct
                        ? selectedProduct.name
                        : receiveSearch
                    }
                    disabled={
                      isReceiving
                    }
                    onChange={(
                      e,
                    ) => {
                      setSelectedProduct(
                        null,
                      );

                      setSelectedBatch(
                        null,
                      );

                      setReceiveSearch(
                        e.target
                          .value,
                      );

                      setReceiveError(
                        null,
                      );
                    }}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                  />

                  {!selectedProduct &&
                    receiveSearch.trim()
                      .length >
                      0 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {receiveMatchingProducts.length ===
                        0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">
                            No products found.
                            Use{" "}
                            <button
                              type="button"
                              onClick={
                                onAddProduct
                              }
                              className="text-[#22577A] font-bold underline"
                            >
                              Add Product
                            </button>{" "}
                            to create the
                            product definition.
                          </div>
                        ) : (
                          receiveMatchingProducts.map(
                            (
                              product,
                            ) => (
                              <button
                                key={
                                  product.id
                                }
                                type="button"
                                onClick={() =>
                                  void handleSelectProduct(
                                    product,
                                  )
                                }
                                className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 text-sm"
                              >
                                <div>
                                  <span className="font-bold text-slate-900">
                                    {
                                      product.name
                                    }
                                  </span>

                                  <div className="text-xs text-slate-400 mt-0.5">
                                    {
                                      product.code
                                    }

                                    {product.genericName
                                      ? ` • ${product.genericName}`
                                      : ""}
                                  </div>
                                </div>

                                <div className="text-xs font-semibold text-[#22577A] whitespace-nowrap">
                                  {
                                    product.category ??
                                    "Uncategorised"
                                  }
                                </div>
                              </button>
                            ),
                          )
                        )}
                      </div>
                    )}
                </div>

                {selectedProduct && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-700 font-medium">
                        Selected:{" "}
                        <strong>
                          {
                            selectedProduct.name
                          }
                        </strong>{" "}
                        (
                        {
                          selectedProduct.code
                        }
                        )
                      </span>

                      <button
                        type="button"
                        disabled={
                          isReceiving
                        }
                        onClick={() => {
                          setSelectedProduct(
                            null,
                          );

                          setSelectedBatch(
                            null,
                          );

                          setSelectedProductBatches(
                            [],
                          );

                          setReceiveSearch(
                            "",
                          );
                        }}
                        className="text-slate-400 hover:text-slate-600 underline disabled:opacity-50"
                      >
                        Change
                      </button>
                    </div>

                    {selectedProductBatches.length >
                      0 && (
                      <div className="mt-3">
                        <p className="text-[11px] font-semibold text-slate-500 mb-2">
                          Existing batches
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {selectedProductBatches.map(
                            (
                              batch,
                            ) => (
                              <button
                                key={
                                  batch.id
                                }
                                type="button"
                                onClick={() =>
                                  handleSelectExistingBatch(
                                    batch,
                                  )
                                }
                                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                                  selectedBatch?.id ===
                                  batch.id
                                    ? "border-[#0d8065] bg-emerald-50 text-[#0d8065]"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {
                                  batch.batchNo
                                }{" "}
                                • Qty{" "}
                                {
                                  batch.qty
                                }{" "}
                                • Exp{" "}
                                {formatDate(
                                  batch.expiryDate,
                                )}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batch Number{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    required
                    disabled={
                      isReceiving
                    }
                    placeholder="e.g. PCM-2026-001"
                    value={
                      receiveBatchNo
                    }
                    onChange={(
                      e,
                    ) =>
                      setReceiveBatchNo(
                        e.target
                          .value,
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Quantity Received{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    disabled={
                      isReceiving
                    }
                    placeholder="e.g. 500"
                    value={
                      receiveQty
                    }
                    onChange={(
                      e,
                    ) =>
                      setReceiveQty(
                        e.target
                          .value,
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Manufacture Date
                  </label>

                  <input
                    type="date"
                    disabled={
                      isReceiving
                    }
                    value={
                      receiveManufactureDate
                    }
                    onChange={(
                      e,
                    ) =>
                      setReceiveManufactureDate(
                        e.target
                          .value,
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiry Date{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="date"
                    required
                    disabled={
                      isReceiving
                    }
                    value={
                      receiveExpiryDate
                    }
                    onChange={(
                      e,
                    ) =>
                      setReceiveExpiryDate(
                        e.target
                          .value,
                      )
                    }
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Buying Price{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      {
                        settings.currency
                      }
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      disabled={
                        isReceiving
                      }
                      placeholder="0.00"
                      value={
                        receiveBuyingPrice
                      }
                      onChange={(
                        e,
                      ) =>
                        setReceiveBuyingPrice(
                          e.target
                            .value,
                        )
                      }
                      className="w-full pl-12 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      {
                        settings.currency
                      }
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      disabled={
                        isReceiving
                      }
                      placeholder="0.00"
                      value={
                        receiveSellingPrice
                      }
                      onChange={(
                        e,
                      ) =>
                        setReceiveSellingPrice(
                          e.target
                            .value,
                        )
                      }
                      className="w-full pl-12 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice / LPO Number
                </label>

                <input
                  type="text"
                  disabled={
                    isReceiving
                  }
                  placeholder="e.g. INV-2026-0001"
                  value={
                    invoiceNo
                  }
                  onChange={(
                    e,
                  ) =>
                    setInvoiceNo(
                      e.target
                        .value,
                    )
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>

                <textarea
                  rows={3}
                  disabled={
                    isReceiving
                  }
                  placeholder="Optional receiving notes..."
                  value={
                    receiveNotes
                  }
                  onChange={(
                    e,
                  ) =>
                    setReceiveNotes(
                      e.target
                        .value,
                    )
                  }
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:border-[#22577A] focus:outline-hidden disabled:bg-slate-100 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-process-reception"
                  disabled={
                    isReceiving ||
                    !selectedProduct
                  }
                  className="w-full py-3 px-6 text-sm font-bold text-white bg-[#0d8065] hover:bg-[#0a6d56] disabled:opacity-60 disabled:cursor-not-allowed rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <PackageCheck className="w-5 h-5" />

                  {isReceiving
                    ? "Processing..."
                    : "Process Reception"}
                </button>
              </div>
            </form>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
              <strong>Inventory control:</strong>{" "}
              Each receipt is recorded against a
              physical batch. The server creates an
              immutable stock movement and updates the
              batch quantity inside a database
              transaction. This prevents the receiving
              screen from directly changing stock
              balances.
            </div>

            <button
              type="button"
              onClick={
                resetReceivingForm
              }
              disabled={
                isReceiving
              }
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-50"
            >
              Clear Receiving Form
            </button>
          </div>
        )}

      {showMovementHistory &&
        movementProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40">
            <div className="w-full max-w-5xl max-h-[85vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-200">
              <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Stock Movement History
                  </h2>

                  <p className="text-xs text-slate-500 mt-1">
                    {
                      movementProduct.name
                    }{" "}
                    •{" "}
                    {
                      movementProduct.code
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleCloseMovementHistory
                  }
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Close
                </button>
              </div>

              <div className="overflow-auto max-h-[65vh]">
                {movementsLoading ? (
                  <div className="p-10 text-center text-xs text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading movement history...
                  </div>
                ) : movements.length ===
                  0 ? (
                  <div className="p-10 text-center text-xs text-slate-400">
                    No stock movements have been
                    recorded for this product.
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                      <tr className="text-left text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-3">
                          Date
                        </th>

                        <th className="px-4 py-3">
                          Type
                        </th>

                        <th className="px-4 py-3">
                          Batch
                        </th>

                        <th className="px-4 py-3 text-right">
                          Change
                        </th>

                        <th className="px-4 py-3 text-right">
                          Previous
                        </th>

                        <th className="px-4 py-3 text-right">
                          Result
                        </th>

                        <th className="px-4 py-3">
                          Reference
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {movements.map(
                        (
                          movement,
                        ) => (
                          <tr
                            key={
                              movement.id
                            }
                            className="hover:bg-slate-50"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                              {formatDate(
                                movement.createdAt,
                              )}
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-semibold">
                                {
                                  movement.type
                                }
                              </span>
                            </td>

                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {
                                movement
                                  .batch
                                  ?.batchNo ??
                                "—"
                              }
                            </td>

                            <td
                              className={`px-4 py-3 text-right font-bold ${
                                movement.quantityDelta >
                                0
                                  ? "text-emerald-700"
                                  : movement.quantityDelta <
                                      0
                                    ? "text-rose-600"
                                    : "text-slate-500"
                              }`}
                            >
                              {movement.quantityDelta >
                              0
                                ? "+"
                                : ""}

                              {
                                movement.quantityDelta
                              }
                            </td>

                            <td className="px-4 py-3 text-right text-slate-600">
                              {
                                movement.previousQty
                              }
                            </td>

                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              {
                                movement.resultingQty
                              }
                            </td>

                            <td className="px-4 py-3 text-slate-500">
                              {movement.referenceId
                                ? `${movement.referenceType ?? "Reference"}: ${movement.referenceId}`
                                : movement.reason ??
                                  movement.notes ??
                                  "—"}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Inventory;