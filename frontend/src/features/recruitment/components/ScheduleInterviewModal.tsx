import { useState } from 'react';
import { Button, Input, Modal, SelectField } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { pipelineApi } from '../api/pipeline.api';

export function ScheduleInterviewModal({
  isOpen,
  applicationId,
  candidateName,
  roundNumber,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  applicationId: string;
  candidateName: string;
  roundNumber: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [title, setTitle] = useState(`Round ${roundNumber}`);
  const [interviewerName, setInterviewerName] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [mode, setMode] = useState('VIDEO');
  const [location, setLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewerName.trim() || !scheduledDate || !scheduledTime) {
      toast.error('Interviewer, date and time are required.');
      return;
    }
    setIsSaving(true);
    try {
      await pipelineApi.scheduleInterview(applicationId, {
        title: title.trim() || undefined,
        interviewerName: interviewerName.trim(),
        scheduledDate,
        scheduledTime,
        mode,
        location: location.trim() || undefined,
      });
      toast.success(`Interview scheduled for ${candidateName}.`);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not schedule interview.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Schedule Interview — ${candidateName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Round Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Technical Round 1" />
          <Input label="Interviewer" required value={interviewerName} onChange={(e) => setInterviewerName(e.target.value)} placeholder="e.g. Priya Sharma" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Date" required type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
          <Input label="Time (24h)" required type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Mode"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            options={[
              { value: 'VIDEO', label: 'Video call' },
              { value: 'IN_PERSON', label: 'In person' },
              { value: 'PHONE', label: 'Phone' },
            ]}
          />
          <Input label="Location / Link" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room or meet link" />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Scheduling…' : 'Schedule'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
