import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { Form, FormField } from '../../../components/forms';
import { Calendar, User, FileText } from 'lucide-react';
import type { LeaveRecord, LeaveType } from '../types/leave.types';

interface AddLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLeave: (record: LeaveRecord) => void;
}

export const AddLeaveModal: React.FC<AddLeaveModalProps> = ({
  isOpen,
  onClose,
  onAddLeave,
}) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Back-End Developer');
  const [leaveType, setLeaveType] = useState<LeaveType>('Casual Leave');
  const [days, setDays] = useState('2 Days');
  const [startDate, setStartDate] = useState('12 July 2024');
  const [endDate, setEndDate] = useState('15 July 2024');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newRecord: LeaveRecord = {
        id: `leave-${Date.now()}`,
        name: name.trim(),
        avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=100&auto=format&fit=crop&q=80`,
        department,
        leaveType,
        days,
        startDate,
        endDate,
        status: 'New',
        reason,
      };

      onAddLeave(newRecord);
      setIsSubmitting(false);
      setName('');
      setReason('');
      onClose();
    }, 400);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply Leave Request" className="max-w-xl">
      <Form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Submit an official leave request for approval by team lead and HR operations.
        </p>

        <FormField>
          <Input
            label="Employee Name"
            required
            autoFocus
            leftIcon={<User className="h-4 w-4 text-slate-400" />}
            placeholder="e.g. Anthony Thomas"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField>
            <SelectField
              label="Leave Type"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              options={[
                { label: 'Casual Leave', value: 'Casual Leave' },
                { label: 'Sick Leave', value: 'Sick Leave' },
                { label: 'Maternity Leave', value: 'Maternity Leave' },
                { label: 'Paternity Leave', value: 'Paternity Leave' },
                { label: 'Annual Leave', value: 'Annual Leave' },
                { label: 'Bereavement Leave', value: 'Bereavement Leave' },
              ]}
            />
          </FormField>

          <FormField>
            <SelectField
              label="Department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={[
                { label: 'Back-End Developer', value: 'Back-End Developer' },
                { label: 'Full-Stack Developer', value: 'Full-Stack Developer' },
                { label: 'Mobile App Developer', value: 'Mobile App Developer' },
                { label: 'UI/UX Designer', value: 'UI/UX Designer' },
                { label: 'DevOps Engineer', value: 'DevOps Engineer' },
                { label: 'HR Specialist', value: 'HR Specialist' },
                { label: 'QA Analyst', value: 'QA Analyst' },
              ]}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField>
            <SelectField
              label="Duration"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              options={[
                { label: '1st Half Day', value: '1st Half Day' },
                { label: '2nd Half Day', value: '2nd Half Day' },
                { label: '1 Day', value: '1 Day' },
                { label: '2 Days', value: '2 Days' },
                { label: '3 Days', value: '3 Days' },
                { label: '4 Days', value: '4 Days' },
                { label: '5 Days', value: '5 Days' },
              ]}
            />
          </FormField>

          <FormField>
            <Input
              label="Start Date"
              placeholder="e.g. 12 July 2024"
              leftIcon={<Calendar className="h-4 w-4 text-slate-400" />}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </FormField>

          <FormField>
            <Input
              label="End Date"
              placeholder="e.g. 15 July 2024"
              leftIcon={<Calendar className="h-4 w-4 text-slate-400" />}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </FormField>
        </div>

        <FormField>
          <Input
            label="Reason / Notes"
            placeholder="Brief description for leave approval..."
            leftIcon={<FileText className="h-4 w-4 text-slate-400" />}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </FormField>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit Leave
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
