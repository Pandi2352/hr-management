export interface ApiResponse<T = any> {
  success: boolean;
  statusCode: number;
  status: string;
  message: string;
  data: T | null;
  meta?: {
    timestamp: string;
    path?: string;
    version?: string;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  status: string;
  errorCode: string;
  message: string;
  details: any | null;
  meta: {
    timestamp: string;
    path: string;
    [key: string]: any;
  };
}
