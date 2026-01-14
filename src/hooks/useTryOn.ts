import { useState, useEffect } from 'react';
import { TryOnJob, TryOnStatus, CreateTryOnJobInput } from '../types/tryon.types';
import { TryOnService } from '../services/tryon.service';
import { ErrorHandler } from '../utils/errorHandler';
import { supabase } from '../services/supabase';

export function useTryOn(status?: TryOnStatus) {
  const [jobs, setJobs] = useState<TryOnJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TryOnService.getTryOnJobs(status);
      setJobs(data);
    } catch (err) {
      const appError = ErrorHandler.handle(err);
      setError(appError.userMessage);
    } finally {
      setLoading(false);
    }
  };

  const createJob = async (input: CreateTryOnJobInput): Promise<TryOnJob> => {
    try {
      setCreating(true);
      setError(null);
      const job = await TryOnService.createTryOnJob(input);
      setJobs(prev => [job, ...prev]);
      return job;
    } catch (err) {
      const appError = ErrorHandler.handle(err);
      setError(appError.userMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      setError(null);
      await TryOnService.deleteTryOnJob(jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (err) {
      const appError = ErrorHandler.handle(err);
      setError(appError.userMessage);
      throw err;
    }
  };

  useEffect(() => {
    loadJobs();
  }, [status]);

  return {
    jobs,
    loading,
    error,
    creating,
    createJob,
    deleteJob,
    refresh: loadJobs,
  };
}

// 單個任務的實時監控 Hook
export function useTryOnJob(jobId: string) {
  const [job, setJob] = useState<TryOnJob | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      return;
    }

    let subscription: any;
    let pollInterval: NodeJS.Timeout | null = null;

    const loadJob = async () => {
      try {
        const data = await TryOnService.getTryOnJob(jobId);
        setJob(data);
        setLoading(false);

        // 如果狀態是 pending 或 processing，啟動輪詢
        if (data.status === 'pending' || data.status === 'processing') {
          console.log('[useTryOnJob] Job is pending/processing, starting polling');
          startPolling();
        }
      } catch (error) {
        console.error('[useTryOnJob] Error loading job:', error);
        setLoading(false);
      }
    };

    const startPolling = () => {
      // 清除現有的輪詢
      if (pollInterval) {
        clearInterval(pollInterval);
      }

      // 每 5 秒輪詢一次（調用檢查狀態的 Edge Function）
      pollInterval = setInterval(async () => {
        try {
          console.log('[useTryOnJob] Checking job status via Edge Function...');

          // 調用檢查狀態的 Edge Function
          const { data: statusData, error: statusError } = await supabase.functions.invoke(
            'check-tryon-status',
            { body: { job_id: jobId } }
          );

          if (statusError) {
            console.error('[useTryOnJob] Status check error:', statusError);
          } else {
            console.log('[useTryOnJob] Status response:', statusData);
          }

          // 重新獲取任務以更新 UI
          const data = await TryOnService.getTryOnJob(jobId);
          setJob(data);

          // 如果已完成或失敗，停止輪詢
          if (data.status === 'completed' || data.status === 'failed') {
            console.log('[useTryOnJob] Job finished, stopping polling. Status:', data.status);
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          }
        } catch (error) {
          console.error('[useTryOnJob] Polling error:', error);
        }
      }, 5000);
    };

    loadJob();

    // 訂閱實時更新
    subscription = TryOnService.subscribeToJob(jobId, (updatedJob) => {
      console.log('[useTryOnJob] Received realtime update:', updatedJob.status);
      setJob(updatedJob);

      // 如果通過 realtime 收到完成狀態，停止輪詢
      if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
        }
      }
    });

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [jobId]);

  return { job, loading };
}
