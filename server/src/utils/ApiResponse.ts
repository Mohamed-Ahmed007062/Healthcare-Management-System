/**
 * Standardized API Response class.
 * Ensures consistent response format across all endpoints.
 */
export class ApiResponse<T = unknown> {
  public readonly success: boolean;
  public readonly statusCode: number;
  public readonly message: string;
  public readonly data: T | null;
  public readonly meta: Record<string, unknown> | null;

  constructor(statusCode: number, data: T | null = null, message = 'Success', meta: Record<string, unknown> | null = null) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}

export default ApiResponse;
