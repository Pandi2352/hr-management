import { useEffect, useState } from 'react';
import { Button, Input, Modal } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { pipelineApi } from '../api/pipeline.api';
import type { CandidateDetail } from '../types/pipeline.types';

export function OfferModal({
  isOpen,
  candidate,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  candidate: CandidateDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [designation, setDesignation] = useState(candidate.jobTitle);
  const [department, setDepartment] = useState(candidate.department);
  const [salaryOffered, setSalaryOffered] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDesignation(candidate.jobTitle);
    setDepartment(candidate.department);
    setSalaryOffered('');
    setJoiningDate('');
    setExpiryDate('');
    setNotes('');
  }, [isOpen, candidate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await pipelineApi.createOffer(candidate._id, {
        designation: designation.trim() || undefined,
        department: department.trim() || undefined,
        salaryOffered: salaryOffered.trim() || undefined,
        joiningDate: joiningDate || undefined,
        expiryDate: expiryDate || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(`Offer sent to ${candidate.fullName}.`);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not send offer.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Send Offer — ${candidate.fullName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          <Input label="Department" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Salary Offered" value={salaryOffered} onChange={(e) => setSalaryOffered(e.target.value)} placeholder="e.g. ₹12 LPA" />
          <Input label="Joining Date" type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
          <Input label="Offer Expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>
        <Input label="Notes (Optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Visible internally" />
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Sending…' : 'Send Offer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
