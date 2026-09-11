export interface TimezoneOption {
  value: string;
  label: string;
}

export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
  sample: string;
}

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST · UTC+05:30)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT · UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT · UTC-08:00)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT · UTC-06:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST · UTC+00:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST · UTC+01:00)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST · UTC+01:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT · UTC+08:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST · UTC+04:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST · UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT · UTC+10:00)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time · UTC+00:00)' },
];

export const CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', label: 'USD - US Dollar ($)', sample: '$125,000.00' },
  { code: 'EUR', symbol: '€', label: 'EUR - Euro (€)', sample: '€115,000.00' },
  { code: 'GBP', symbol: '£', label: 'GBP - British Pound (£)', sample: '£98,000.00' },
  { code: 'INR', symbol: '₹', label: 'INR - Indian Rupee (₹)', sample: '₹12,50,000.00' },
  { code: 'SGD', symbol: 'S$', label: 'SGD - Singapore Dollar (S$)', sample: 'S$165,000.00' },
  { code: 'AUD', symbol: 'A$', label: 'AUD - Australian Dollar (A$)', sample: 'A$175,000.00' },
  { code: 'CAD', symbol: 'C$', label: 'CAD - Canadian Dollar (C$)', sample: 'C$160,000.00' },
  { code: 'AED', symbol: 'د.إ', label: 'AED - UAE Dirham (د.إ)', sample: 'د.إ 450,000.00' },
];

export const MONTHS: string[] = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const INDUSTRY_OPTIONS: string[] = [
  'Information Technology & Services',
  'Software Development & SaaS',
  'Financial Services & Fintech',
  'Healthcare & Life Sciences',
  'E-Commerce & Retail',
  'Consulting & Professional Services',
  'Manufacturing & Industrial',
  'Telecommunications',
  'Education & EdTech',
  'Media & Entertainment',
  'Other',
];

export const DAYS_OF_WEEK = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
  { id: 0, name: 'Sunday', short: 'Sun' },
];
