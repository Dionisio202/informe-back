export interface DatabaseResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: Error | unknown;
    message?: string;
  }