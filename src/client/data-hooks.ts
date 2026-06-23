import { type DependencyList, useEffect, useMemo, useState } from "react";
import type {
  AdminOperationLog,
  BirthdayView,
  DataAuditReport,
  SiteSettings
} from "../shared/types.js";
import {
  api,
  type PublicBirthday,
  type PublicSettings,
  type TodayDateInfo
} from "./api.js";
import { summarizeAdminBirthdays } from "./utils.js";

export type LoadState<T> = {
  data?: T;
  loading: boolean;
  error?: string;
};

function useLoad<T>(load: () => Promise<T>, deps: DependencyList = []): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ loading: true });
  useEffect(() => {
    let active = true;
    load()
      .then((data) => active && setState({ loading: false, data }))
      .catch(
        (error) =>
          active &&
          setState({
            loading: false,
            error: error instanceof Error ? error.message : "读取失败"
          })
      );
    return () => {
      active = false;
    };
  }, deps);
  return state;
}

export function usePublicBirthdays(): LoadState<PublicBirthday[]> {
  return useLoad(() => api.publicBirthdays().then((result) => result.birthdays));
}

export function useTodayInfo(): LoadState<TodayDateInfo> {
  return useLoad(() => api.publicToday().then((result) => result.today));
}

export function usePublicSettings(): LoadState<PublicSettings> {
  return useLoad(() => api.publicSettings());
}

export function useAdminBirthdayData() {
  const [records, setRecords] = useState<BirthdayView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = async (options: { keepLoading?: boolean } = {}) => {
    if (!options.keepLoading) {
      setLoading(true);
    }
    try {
      const result = await api.adminBirthdays();
      setRecords(result.birthdays);
      setError(undefined);
      return result.birthdays;
    } catch (err) {
      const message = err instanceof Error ? err.message : "读取失败";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api
      .adminBirthdays()
      .then((result) => {
        if (active) {
          setRecords(result.birthdays);
          setError(undefined);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "读取失败");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => summarizeAdminBirthdays(records), [records]);

  return {
    data: records,
    records,
    loading,
    error,
    refresh: () => load({ keepLoading: true }),
    summary
  };
}

export function useAdminOperationLogs(limit = 80): LoadState<AdminOperationLog[]> {
  return useLoad(() => api.adminOperationLogs(limit).then((result) => result.logs), [limit]);
}

export function useAdminDataAudit(): LoadState<DataAuditReport> {
  return useLoad(() => api.adminDataAudit().then((result) => result.audit));
}

export function useAdminSettings(): LoadState<SiteSettings> {
  return useLoad(() => api.adminSettings().then((result) => result.settings));
}
