"use client";
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export interface QueueSnapshotItem {
  name: string;
  waiting: number;
  active: number;
  delayed: number;
  failed_24h: number;
  oldest_job_age_sec: number;
}

export interface QueueSnapshotPayload {
  ts: number;
  queues: QueueSnapshotItem[];
}

interface UseQueueStatusOptions {
  enabled?: boolean;
  pollingFallbackMs?: number; // not used yet
}

export function useQueueStatusSocket(initial?: QueueSnapshotPayload, opts: UseQueueStatusOptions = {}) {
  const { enabled = true } = opts;
  const [snapshot, setSnapshot] = useState<QueueSnapshotPayload | undefined>(initial);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const socket = io('/ws/queues', { path: '/socket.io', transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('queue.snapshot', (payload: QueueSnapshotPayload) => {
      setSnapshot(payload);
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled]);

  return { snapshot, connected };
}
