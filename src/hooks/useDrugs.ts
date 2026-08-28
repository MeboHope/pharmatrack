import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { Drug } from "../types";
import {
  drugsService,
  type DrugInput,
  type ReceiveStockInput,
} from "../services/drugs";

interface UseDrugsResult {
  drugs: Drug[];
  isLoading: boolean;
  error: string;

  refresh: () => Promise<void>;

  createDrug: (
    input: DrugInput,
  ) => Promise<Drug>;

  updateDrug: (
    id: string,
    input: Partial<DrugInput>,
  ) => Promise<Drug>;

  deleteDrug: (
    id: string,
  ) => Promise<void>;

  receiveStock: (
    id: string,
    input: ReceiveStockInput,
  ) => Promise<Drug>;

  clearError: () => void;
}

export function useDrugs(): UseDrugsResult {
  const [drugs, setDrugs] =
    useState<Drug[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const clearError =
    useCallback(() => {
      setError("");
    }, []);

  const refresh =
    useCallback(async () => {
      setIsLoading(true);
      setError("");

      try {
        const data =
          await drugsService.list();

        setDrugs(data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load medicines.";

        setError(message);
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createDrug =
    useCallback(
      async (
        input: DrugInput,
      ): Promise<Drug> => {
        setError("");

        try {
          const drug =
            await drugsService.create(
              input,
            );

          setDrugs((current) => [
            drug,
            ...current.filter(
              (item) =>
                item.id !== drug.id,
            ),
          ]);

          return drug;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to create medicine.";

          setError(message);
          throw err;
        }
      },
      [],
    );

  const updateDrug =
    useCallback(
      async (
        id: string,
        input: Partial<DrugInput>,
      ): Promise<Drug> => {
        setError("");

        try {
          const updated =
            await drugsService.update(
              id,
              input,
            );

          setDrugs((current) =>
            current.map((drug) =>
              drug.id === id
                ? updated
                : drug,
            ),
          );

          return updated;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to update medicine.";

          setError(message);
          throw err;
        }
      },
      [],
    );

  const deleteDrug =
    useCallback(
      async (
        id: string,
      ): Promise<void> => {
        setError("");

        try {
          await drugsService.remove(
            id,
          );

          setDrugs((current) =>
            current.filter(
              (drug) =>
                drug.id !== id,
            ),
          );
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to delete medicine.";

          setError(message);
          throw err;
        }
      },
      [],
    );

  const receiveStock =
    useCallback(
      async (
        id: string,
        input: ReceiveStockInput,
      ): Promise<Drug> => {
        setError("");

        try {
          const updated =
            await drugsService.receiveStock(
              id,
              input,
            );

          setDrugs((current) =>
            current.map((drug) =>
              drug.id === id
                ? updated
                : drug,
            ),
          );

          return updated;
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "Unable to receive stock.";

          setError(message);
          throw err;
        }
      },
      [],
    );

  return {
    drugs,
    isLoading,
    error,
    refresh,
    createDrug,
    updateDrug,
    deleteDrug,
    receiveStock,
    clearError,
  };
}

export default useDrugs;