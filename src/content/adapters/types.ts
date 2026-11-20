/** Finds ticket ids on one kind of Azure DevOps page and mounts status icons next to them. */
export interface PageAdapter {
  /** Must be idempotent: called on every DOM change. */
  scan(root: Document, onOpen: (ticketId: string) => void): void;
}
