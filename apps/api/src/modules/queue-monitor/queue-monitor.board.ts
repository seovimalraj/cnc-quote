import { ExpressAdapter } from '@bull-board/express';
import { Queue as BullMQQueue } from 'bullmq';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BaseAdapter } from '@bull-board/api/dist/src/queueAdapters/base';

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
