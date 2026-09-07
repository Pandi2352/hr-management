import React, { useState, useMemo } from 'react';
import {
  Download,
  Eye,
  MoreHorizontal,
  ChevronDown,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/data-table/Pagination';
import type {
  CandidateApplicant,
  CandidateStatus,
} from '../types/recruitment.types';

interface CandidateApplicationsTableProps {
  applicants: CandidateApplicant[];
  onDownloadReport?: () => void;
  onViewCandidate?: (candidate: CandidateApplicant) => void;
}

const STATUS_OPTIONS: CandidateStatus[] = [
  'Hired',
  'Shortlisted',
  'Pending',
  'Interviewed',
  'Rejected',
];

export const CandidateApplicationsTable: React.FC<CandidateApplicationsTableProps> = ({
  applicants: initialApplicants,
  onDownloadReport,
  onViewCandidate,
}) => {
  const [applicants, setApplicants] = useState<CandidateApplicant[]>(initialApplicants);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredApplicants = useMemo(() => {
    return applicants.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [applicants, searchQuery]);

  const paginatedApplicants = filteredApplicants.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleStatusChange = (id: string, newStatus: CandidateStatus) => {
    setApplicants((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    setOpenStatusMenuId(null);
  };

  const toggleSelectAll = () => {
    if (selectedCandidates.length === paginatedApplicants.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(paginatedApplicants.map((c) => c.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getStatusBadge = (status: CandidateStatus) => {
    switch (status) {
      case 'Hired':
        return 'bg-emerald-600 text-white border-emerald-600';
      case 'Shortlisted':
        return 'bg-blue-600 text-white border-blue-600';
      case 'Pending':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      case 'Interviewed':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60';
      case 'Rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getScheduleBadge = (status: CandidateApplicant['interviewStatus']) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-600 text-white border-emerald-600';
      case 'Schedule':
        return 'bg-cyan-500 text-white border-cyan-500';
      case 'Rejected':
        return 'bg-rose-500 text-white border-rose-500';
      default:
        return 'bg-slate-500 text-white border-slate-500';
    }
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Table Header Bar */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Candidate Applications</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active applicants across technical assessment & interview pipelines
          </p>
        </div>

        {/* Right Controls: SearchInput, Download Button, Year SelectField */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-48 sm:w-60">
            <SearchInput
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              onClear={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              placeholder="Search candidate..."
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadReport}
            className="h-9 rounded-md text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs shrink-0"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Download Report
          </Button>

          <div className="w-28 shrink-0">
            <SelectField
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={[
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
                { value: '2026', label: '2026' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs min-w-[880px]">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              <th scope="col" className="py-3 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    paginatedApplicants.length > 0 &&
                    selectedCandidates.length === paginatedApplicants.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Name</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Department</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Phone No.</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Mail ID</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Status</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Interview schedule</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4 text-center w-24">
                <div className="flex items-center justify-center gap-1.5 cursor-pointer select-none">
                  <span>Action</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedApplicants.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No applicants match your search criteria.
                </td>
              </tr>
            ) : (
              paginatedApplicants.map((candidate) => {
                const isSelected = selectedCandidates.includes(candidate.id);
                const isMenuOpen = openStatusMenuId === candidate.id;

                return (
                  <tr
                    key={candidate.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(candidate.id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Candidate Name with Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {candidate.avatarUrl ? (
                          <img
                            src={candidate.avatarUrl}
                            alt={candidate.name}
                            className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                            {candidate.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                        )}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {candidate.name}
                        </span>
                      </div>
                    </td>

                    {/* Department / Role */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {candidate.department}
                    </td>

                    {/* Phone No */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 tabular-nums">
                      {candidate.phone}
                    </td>

                    {/* Mail ID */}
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                      {candidate.email}
                    </td>

                    {/* Status Dropdown Pill */}
                    <td className="py-3 px-4 relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenStatusMenuId(isMenuOpen ? null : candidate.id)
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold border cursor-pointer transition-all select-none ${getStatusBadge(
                          candidate.status
                        )}`}
                      >
                        <span>{candidate.status}</span>
                        <ChevronDown className="h-3 w-3 opacity-80" />
                      </button>

                      {/* Interactive Status Overlay Menu matching screenshot */}
                      {isMenuOpen && (
                        <div className="absolute top-10 left-4 z-30 w-36 rounded-md bg-white dark:bg-slate-800 p-1.5 shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-100">
                          {STATUS_OPTIONS.map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleStatusChange(candidate.id, status)}
                              className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
                                candidate.status === status
                                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold'
                                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Interview Schedule Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-md text-xs font-semibold border text-center min-w-[80px] ${getScheduleBadge(
                          candidate.interviewStatus
                        )}`}
                      >
                        {candidate.interviewStatus}
                      </span>
                    </td>

                    {/* Actions: Eye + More Options */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onViewCandidate && onViewCandidate(candidate)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="View Applicant Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="More Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Standard Reusable Pagination Component */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={filteredApplicants.length}
          pageSizeOptions={[5, 10, 20]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
};
