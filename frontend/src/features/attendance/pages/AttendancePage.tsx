import React from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { useToast } from '../../../components/ui/toast';
import { AttendanceRateChart } from '../components/AttendanceRateChart';
import { EmployeeTypeDonut } from '../components/EmployeeTypeDonut';
import { AttendanceCalendarTable } from '../components/AttendanceCalendarTable';
import {
  MOCK_ATTENDANCE_RATES,
  MOCK_EMPLOYEE_DISTRIBUTION,
  MOCK_EMPLOYEES,
} from '../data/mockAttendanceData';

export function AttendancePage() {
  const toast = useToast();

  const handleDownloadReport = () => {
    toast.success('Attendance report downloaded successfully', 'Export Complete');
  };

  return (
    <div className="w-full space-y-5">
      {/* Page Header */}
      <PageHeader
        title="Attendance & Punctuality Overview"
        description="Monitor organization-wide clock-ins, remote vs onsite presence, and monthly employee attendance records."
      />

      {/* Top Row: Attendance Rate Stacked Bar Chart & Employee Type Donut (Equal Height Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-8 flex flex-col">
          <AttendanceRateChart
            data={MOCK_ATTENDANCE_RATES}
            onDownloadReport={handleDownloadReport}
            className="h-full"
          />
        </div>

        <div className="lg:col-span-4 flex flex-col">
          <EmployeeTypeDonut
            distribution={MOCK_EMPLOYEE_DISTRIBUTION}
            className="h-full"
          />
        </div>
      </div>

      {/* Bottom Row: Employee Attendance Grid Table */}
      <AttendanceCalendarTable
        employees={MOCK_EMPLOYEES}
        onDownloadReport={handleDownloadReport}
      />
    </div>
  );
}
