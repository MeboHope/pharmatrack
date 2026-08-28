
import { api } from "./api";
import type { Supplier } from "../types";

export interface SupplierInput {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  leadTimeDays?: number;
}

export const suppliersService = {
  async list(): Promise<Supplier[]> {
    const response =
      await api.get<Supplier[]>("/suppliers");

    return response.data;
  },

  async getById(id: string): Promise<Supplier> {
    const response =
      await api.get<Supplier>(
        `/suppliers/${encodeURIComponent(id)}`,
      );

    return response.data;
  },

  async create(
    input: SupplierInput,
  ): Promise<Supplier> {
    const response =
      await api.post<Supplier>(
        "/suppliers",
        input,
      );

    return response.data;
  },

  async update(
    id: string,
    input: Partial<SupplierInput>,
  ): Promise<Supplier> {
    const response =
      await api.put<Supplier>(
        `/suppliers/${encodeURIComponent(id)}`,
        input,
      );

    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(
      `/suppliers/${encodeURIComponent(id)}`,
    );
  },
};

export default suppliersService;
