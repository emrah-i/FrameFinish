export interface Env {
  ASSETS: Fetcher;
  RATE_LIMITER?: RateLimit;
  ENVIRONMENT: 'staging' | 'production';
  SITE_URL?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  LEAD_EMAIL?: string;
}
