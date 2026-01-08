export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ErrorHandler {
  static handle(error: unknown): AppError {
    console.error('Error:', error);

    // Check for RLS errors
    if (this.isRLSError(error)) {
      return new AppError(
        'RLS policy violation',
        'RLS_ERROR',
        '您沒有權限執行此操作'
      );
    }

    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new AppError(
        'Network error',
        'NETWORK_ERROR',
        '網路連線失敗，請檢查您的網路'
      );
    }

    // Generic error
    if (error instanceof Error) {
      return new AppError(
        error.message,
        'UNKNOWN_ERROR',
        error.message || '發生錯誤，請稍後再試'
      );
    }

    return new AppError(
      'Unknown error',
      'UNKNOWN_ERROR',
      '發生未知錯誤'
    );
  }

  private static isRLSError(error: any): boolean {
    return error?.code === '42501' ||
           error?.message?.includes('row-level security') ||
           error?.message?.includes('permission denied');
  }
}
