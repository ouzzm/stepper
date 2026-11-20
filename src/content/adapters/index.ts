import { queryResultsAdapter } from './queryResults.ts';
import type { PageAdapter } from './types.ts';
import { workItemAdapter } from './workItem.ts';

export const adapters: PageAdapter[] = [queryResultsAdapter, workItemAdapter];
