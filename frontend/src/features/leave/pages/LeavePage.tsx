import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/toast';
import { LeaveMetricsCards } from '../components/LeaveMetricsCards';
import { EmployeeLeaveTable } from '../components/EmployeeLeaveTable';
import { AddLeaveModal } from '../components/AddLeaveModal';
import {
  MOCK_LEAVE_METRICS,
  MOCK_LEAVE_RECORDS,
} from '../data/mockLeaveData';
import type { LeaveRecord, LeaveStatus } from '../types/leave.types';

export function LeavePage() {
  const toast = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>(MOCK_LEAVE_RECORDS);
  const [selectedMetricId, setSelectedMetricId] = useState<string>('planned');

  const handleDownloadReport = () => {
    toast.success('Leave summary report exported successfully', 'Export Ready');
  };

  const handleAddLeave = (newRecord: LeaveRecord) => {
    setLeaveRecords([newRecord, ...leaveRecords]);
    toast.success(`Leave applied successfully for ${newRecord.name}`, 'Application Submitted');
  };

  const handleViewRecord = (record: LeaveRecord) => {
    toast.info(`Viewing leave record for ${record.name} (${record.leaveType})`);
  };

  const handleStatusChange = (recordId: string, newStatus: LeaveStatus) => {
    setLeaveRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, status: newStatus } : r))
    );
    toast.success(`Status updated to "${newStatus}"`, 'Status Changed');
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header matching Screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Leaves
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dashboard <span className="mx-1">/</span>{' '}
            <span className="text-slate-600 dark:text-slate-300 font-medium">Leaves</span>
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-1.5 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Add Leave
        </Button>
      </div>

      {/* 4 Summary Gauge Metric Cards */}
      <LeaveMetricsCards
        metrics={MOCK_LEAVE_METRICS}
        activeCardId={selectedMetricId}
        onSelectCard={setSelectedMetricId}
      />

      {/* Employee Leave Table */}
      <EmployeeLeaveTable
        records={leaveRecords}
        onDownloadReport={handleDownloadReport}
        onViewRecord={handleViewRecord}
        onStatusChange={handleStatusChange}
      />

      {/* Add Leave Application Modal */}
      <AddLeaveModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddLeave={handleAddLeave}
      />
    </div>
  );
}

export default LeavePage;
