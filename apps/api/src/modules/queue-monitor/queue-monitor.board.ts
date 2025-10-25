import { ExpressAdapter } from "@bull-board/express";
import { Queue as _BullMQQueue } from "bullmq";
import { BullMQAdapter as _BullMQAdapter } from "@bull-board/api/bullMQAdapter";
// Avoid importing internal paths; use a relaxed adapter type
type BaseAdapter = any;

export interface BullBoard {
  addQueue(queue: BaseAdapter): void;
  removeQueue(queue: BaseAdapter): void;
  setQueues(queues: BaseAdapter[]): void;
}

export interface BullBoardOptions {
  queues: BaseAdapter[];
  serverAdapter: ExpressAdapter;
}

export interface BoardConfig {
  serverAdapter: ExpressAdapter;
  board: BullBoard;
}
