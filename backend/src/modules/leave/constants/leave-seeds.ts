/** Default leave types seeded per organisation on first boot. */
export const DEFAULT_LEAVE_TYPES = [
  {
    code: 'CL',
    name: 'Casual Leave',
    description: 'Short day-to-day time off for personal work.',
    defaultAllocation: 12,
    carryForwardAllowed: true,
    maxCarryForward: 5,
  },
  {
    code: 'SL',
    name: 'Sick Leave',
    description: 'Time off for illness and medical needs.',
    defaultAllocation: 12,
    carryForwardAllowed: false,
    maxCarryForward: 0,
  },
  {
    code: 'EL',
    name: 'Earned / Privilege Leave',
    description: 'Accrued annual leave for planned vacations.',
    defaultAllocation: 15,
    carryForwardAllowed: true,
    maxCarryForward: 30,
  },
  {
    code: 'PATERNITY',
    name: 'Paternity Leave',
    description: 'Leave for new fathers around childbirth.',
    defaultAllocation: 15,
    carryForwardAllowed: false,
    maxCarryForward: 0,
  },
  {
    code: 'MATERNITY',
    name: 'Maternity Leave',
    description: 'Leave for new mothers around childbirth.',
    defaultAllocation: 182,
    carryForwardAllowed: false,
    maxCarryForward: 0,
  },
  {
    code: 'COMP_OFF',
    name: 'Compensatory Off',
    description: 'Time off in lieu of extra hours worked.',
    defaultAllocation: 0,
    carryForwardAllowed: true,
    maxCarryForward: 10,
  },
  {
    code: 'LOP',
    name: 'Loss of Pay',
    description: 'Unpaid leave when paid balances are exhausted.',
    defaultAllocation: 0,
    carryForwardAllowed: false,
    maxCarryForward: 0,
  },
];

/** 2026 India holiday seed (matches the reference calendar). */
export const SEED_HOLIDAYS_2026: Array<{
  name: string;
  date: string;
  type: 'FIXED' | 'RESTRICTED';
}> = [
  { name: 'New Years Day', date: '2026-01-01', type: 'FIXED' },
  { name: 'Republic Day', date: '2026-01-26', type: 'FIXED' },
  { name: 'Holi', date: '2026-03-04', type: 'FIXED' },
  { name: 'Ugadi / Hindu New Year', date: '2026-03-19', type: 'FIXED' },
  { name: 'Good Friday', date: '2026-04-03', type: 'FIXED' },
  { name: 'Labour Day / International Workers Day', date: '2026-05-01', type: 'FIXED' },
  { name: 'Ganesh Chaturthi', date: '2026-09-14', type: 'FIXED' },
  { name: 'Gandhi Jayanthi', date: '2026-10-02', type: 'FIXED' },
  { name: 'Dussehra (Vijay Dashami)', date: '2026-10-20', type: 'FIXED' },
  { name: 'Christmas', date: '2026-12-25', type: 'FIXED' },
  { name: 'Makar Sankranti /Pongal', date: '2026-01-14', type: 'RESTRICTED' },
  { name: 'Mattu Pongal', date: '2026-01-15', type: 'RESTRICTED' },
  { name: 'Ram Navami', date: '2026-03-26', type: 'RESTRICTED' },
  { name: 'Mahavir Jayanti', date: '2026-03-31', type: 'RESTRICTED' },
  { name: 'Tamil New Year', date: '2026-04-14', type: 'RESTRICTED' },
  { name: 'Sivakasi - Home God Poosai', date: '2026-05-25', type: 'RESTRICTED' },
  { name: 'Id-ul-Zuha (Bakrid)', date: '2026-05-27', type: 'RESTRICTED' },
  { name: 'Muharram', date: '2026-06-26', type: 'RESTRICTED' },
  { name: 'Adi Pooram car festival', date: '2026-08-14', type: 'RESTRICTED' },
  { name: 'Raksha Bandhan', date: '2026-08-28', type: 'RESTRICTED' },
  { name: 'Janmashtami', date: '2026-09-04', type: 'RESTRICTED' },
  { name: 'Bhai Dooj', date: '2026-11-11', type: 'RESTRICTED' },
];

export const SEED_CALENDAR_NOTE = 'Holiday Calendar 2026';
export const SEED_RESTRICTED_LIMIT = 2;
