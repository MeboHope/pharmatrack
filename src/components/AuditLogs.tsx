import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";

import type { UserAccount } from "../types";
import { api } from "../services/api";

interface AuditLogUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  userId: string | null;
  User: AuditLogUser | null;
}

interface AuditLogPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface AuditLogsResponse {
  success: boolean;
  data: AuditLog[];
  pagination: AuditLogPagination;
}

interface AuditLogsProps {
  currentUser: UserAccount;
}

const getActionClasses = (action: string): string => {
  const normalizedAction = action.toUpperCase();

  if (
    normalizedAction.includes("FAILED") ||
    normalizedAction.includes("DELETE") ||
    normalizedAction.includes("REVOKE")
  ) {
    return "bg-red-50 text-red-700 border-red-200";
  }

  if (
    normalizedAction.includes("CREATE") ||
    normalizedAction.includes("REGISTER") ||
    normalizedAction.includes("LOGIN")
  ) {
    return "bg-green-50 text-green-700 border-green-200";
  }

  if (
    normalizedAction.includes("UPDATE") ||
    normalizedAction.includes("CHANGE") ||
    normalizedAction.includes("RESET")
  ) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return "bg-gray-50 text-gray-700 border-gray-200";
};

const formatRole = (role: string): string => {
  switch (role.toUpperCase()) {
    case "ADMIN":
      return "Admin";
    case "PHARMACIST":
      return "Pharmacist";
    case "CLINICIAN":
      return "Clinician";
    default:
      return role;
  }
};

const formatDetails = (details: string | null): string => {
  if (!details) {
    return "—";
  }

  try {
    const parsed = JSON.parse(details);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return details;
  }
};

const formatDateTime = (date: string): string => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleString();
};

const AuditLogs: React.FC<AuditLogsProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] =
    useState<AuditLogPagination | null>(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const [entity, setEntity] = useState("");
  const [action, setAction] = useState("");

  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadAuditLogs = useCallback(
    async (showRefreshState = false) => {
      if (currentUser.role !== "Admin") {
        return;
      }

      try {
        if (showRefreshState) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        if (entity.trim()) {
          params.set("entity", entity.trim());
        }

        if (action.trim()) {
          params.set("action", action.trim());
        }

        const response = (await api.get<AuditLog[]>(
          `/audit-logs?${params.toString()}`,
        )) as AuditLogsResponse;

        setLogs(response.data ?? []);
        setPagination(response.pagination ?? null);
      } catch (requestError) {
        const message =
          requestError instanceof Error
            ? requestError.message
            : "Failed to load audit logs.";

        setError(message);
        setLogs([]);
        setPagination(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [action, currentUser.role, entity, limit, page],
  );

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  const handleSearch = () => {
    setPage(1);
    setEntity(entityFilter.trim());
    setAction(actionFilter.trim());
  };

  const handleClearFilters = () => {
    setEntityFilter("");
    setActionFilter("");
    setEntity("");
    setAction("");
    setPage(1);
  };

  const handleLimitChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setLimit(Number(event.target.value));
    setPage(1);
  };

  if (currentUser.role !== "Admin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-800">
            Access Restricted
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Audit Logs are available to administrators only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#22577A]/10 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-[#22577A]" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Audit Logs
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Track important activity across the pharmacy system.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadAuditLogs(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#22577A] text-white text-sm font-medium hover:bg-[#1b4763] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2">
            <label
              htmlFor="audit-entity"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Entity
            </label>

            <input
              id="audit-entity"
              type="text"
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="e.g. User, Drug, StockAdjustment"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22577A]/20 focus:border-[#22577A]"
            />
          </div>

          <div className="lg:col-span-2">
            <label
              htmlFor="audit-action"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Action
            </label>

            <input
              id="audit-action"
              type="text"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="e.g. USER_LOGIN, CREATE"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22577A]/20 focus:border-[#22577A]"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSearch}
              className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-[#22577A] text-white text-sm font-medium hover:bg-[#1b4763] transition-colors"
            >
              <Search className="w-4 h-4" />
              Search
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />

          <div>
            <p className="font-medium text-red-800">
              Failed to load audit logs
            </p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">
              Activity History
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              {pagination
                ? `${pagination.total.toLocaleString()} total record${
                    pagination.total === 1 ? "" : "s"
                  }`
                : "System activity records"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="audit-limit"
              className="text-sm text-gray-500"
            >
              Show
            </label>

            <select
              id="audit-limit"
              value={limit}
              onChange={handleLimitChange}
              className="px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#22577A]/20 focus:border-[#22577A]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <RefreshCw className="w-7 h-7 text-[#22577A] animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Loading audit logs...
              </p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center py-16 px-5">
            <div className="text-center max-w-md">
              <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />

              <h3 className="font-semibold text-gray-800">
                No audit logs found
              </h3>

              <p className="text-sm text-gray-500 mt-1">
                {entity || action
                  ? "Try changing or clearing your filters."
                  : "System activity will appear here as actions are recorded."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Date & Time
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      User
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Entity
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Entity ID
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Details
                    </th>

                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-5 py-4 align-top">
                        <div className="flex items-center gap-2 text-sm text-gray-700 whitespace-nowrap">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {formatDateTime(log.createdAt)}
                        </div>
                      </td>

                      <td className="px-5 py-4 align-top">
                        {log.User ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {log.User.name}
                            </p>

                            <p className="text-xs text-gray-500 mt-0.5">
                              {log.User.email}
                            </p>

                            <span className="inline-flex mt-1.5 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                              {formatRole(log.User.role)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            System
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${getActionClasses(
                            log.action,
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span className="text-sm font-medium text-gray-800">
                          {log.entity}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span className="text-xs font-mono text-gray-600 break-all">
                          {log.entityId || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 align-top max-w-[360px]">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words font-sans">
                          {formatDetails(log.details)}
                        </pre>
                      </td>

                      <td className="px-5 py-4 align-top">
                        <span className="text-xs font-mono text-gray-600 whitespace-nowrap">
                          {log.ipAddress || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && (
              <div className="px-5 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-gray-500">
                  Page {pagination.page} of{" "}
                  {Math.max(pagination.totalPages, 1)}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((currentPage) =>
                        Math.max(currentPage - 1, 1),
                      )
                    }
                    disabled={!pagination.hasPreviousPage}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((currentPage) =>
                        pagination.hasNextPage
                          ? currentPage + 1
                          : currentPage,
                      )
                    }
                    disabled={!pagination.hasNextPage}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;