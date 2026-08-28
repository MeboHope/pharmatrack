
import { api } from "./api";
import type { PatientRecord } from "../types";

export interface PatientInput {
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: "Male" | "Female" | "Other";
  address?: string;
  allergies?: string;
}

export const patientsService = {
  async list(): Promise<PatientRecord[]> {
    const response =
      await api.get<PatientRecord[]>("/patients");

    return response.data;
  },

  async getById(id: string): Promise<PatientRecord> {
    const response =
      await api.get<PatientRecord>(
        `/patients/${encodeURIComponent(id)}`,
      );

    return response.data;
  },

  async create(
    input: PatientInput,
  ): Promise<PatientRecord> {
    const response =
      await api.post<PatientRecord>(
        "/patients",
        input,
      );

    return response.data;
  },

  async update(
    id: string,
    input: Partial<PatientInput>,
  ): Promise<PatientRecord> {
    const response =
      await api.put<PatientRecord>(
        `/patients/${encodeURIComponent(id)}`,
        input,
      );

    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(
      `/patients/${encodeURIComponent(id)}`,
    );
  },
};

export default patientsService;

