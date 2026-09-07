import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../../components/ui/toast';
import { Avatar } from '../../../components/ui';
import { employeesApi } from '../api/employees.api';
import { EmployeeHeaderBanner } from '../components/EmployeeHeaderBanner';
import { CredentialsModal } from '../components/CredentialsModal';
import { StatusTransitionModal } from '../components/StatusTransitionModal';
import { AuditTimeline } from '../../audit/components/AuditTimeline';
import { DocumentVault } from '../components/DocumentVault';
import type { Employee } from '../types/employees.types';

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showCredentials, setShowCredentials] = useState<boolean>(false);
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);

  useEffect(() => {
    async function loadEmployee() {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await employeesApi.getEmployeeById(id);
        setEmployee(data);
      } catch (err: any) {
        toast.error(err?.response?.data?.message || 'Could not retrieve employee profile.', 'Employee Not Found');
        navigate('/employees');
      } finally {
        setIsLoading(false);
      }
    }
    loadEmployee();
  }, [id, navigate, toast]);

  const handleStatusChange = async (newStatus: string, reason?: string, effectiveDate?: string) => {
    if (!id) return;
    try {
      const updated = await employeesApi.changeEmployeeStatus(id, newStatus, reason, effectiveDate);
      setEmployee(updated);
      toast.success(`Employee status transitioned to ${newStatus}.`, 'Status Updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update employee status.', 'Update Error');
    }
  };

  const handleResendCredentials = async () => {
    if (!id || isResending) return;
    setIsResending(true);
    try {
      const res = await employeesApi.resendOnboarding(id);
      if (res.employee) setEmployee(res.employee);
      toast.success(res.message, 'Credentials Dispatched');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to resend onboarding email.', 'Delivery Failed');
    } finally {
      setIsResending(false);
    }
  };

  if (isLoading || !employee) {
    return (
      <div className="rounded-md border border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-950">
        <div className="h-6 w-36 mx-auto bg-slate-100 dark:bg-slate-900 animate-pulse rounded" />
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: '1. Overview' },
    { id: 'personal', label: '2. Personal & Contact' },
    { id: 'employment', label: '3. Employment' },
    { id: 'education', label: '4. Education & Experience' },
    { id: 'skills', label: '5. Skills' },
    { id: 'documents', label: '6. Document Vault' },
    { id: 'audit', label: '7. Audit History' },
  ];

  return (
    <div className="space-y-6 w-full">
      {/* Reusable Header Banner Component */}
      <EmployeeHeaderBanner
        employee={employee}
        onBack={() => navigate('/employees')}
        onEdit={() => navigate(`/employees/${employee._id}/edit`)}
        onShareCredentials={() => setShowCredentials(true)}
        onStatusChange={() => setShowStatusModal(true)}
        onResendCredentials={handleResendCredentials}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={tabs}
      />

      {/* TAB CONTENT CARDS */}
      <div className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">
                  Employment Status
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {employee.employmentType} ({employee.status})
                </p>
              </div>
              <div className="p-4 rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">
                  Date of Joining
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {new Date(employee.joiningDate).toLocaleDateString()}
                </p>
              </div>
              <div className="p-4 rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">
                  Work Location
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {employee.location?.name || employee.locationName || 'Main Office'}
                </p>
              </div>
            </div>

            {/* Reporting Manager Widget */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Reporting Line Manager
              </h3>
              {employee.manager ? (
                <div
                  onClick={() => navigate(`/employees/${employee.manager?._id}`)}
                  className="flex items-center gap-3 p-3.5 rounded-md border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 cursor-pointer max-w-md transition-colors"
                >
                  <Avatar
                    src={employee.manager.avatarUrl}
                    name={employee.manager.displayName || `${employee.manager.firstName} ${employee.manager.lastName}`}
                    size="md"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {employee.manager.displayName || `${employee.manager.firstName} ${employee.manager.lastName}`}
                    </h4>
                    <p className="text-xs text-slate-400 font-mono">{employee.manager.employeeCode}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No direct reporting manager (Executive Tier).</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PERSONAL & CONTACT */}
        {activeTab === 'personal' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">Gender</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{employee.gender || '—'}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">Date of Birth</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{employee.dateOfBirth || '—'}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">Marital Status</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{employee.maritalStatus || '—'}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">Nationality</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{employee.nationality || '—'}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Residential Address</h3>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {employee.currentAddress?.addressLine1 || 'Address not registered'}
                {employee.currentAddress?.city ? `, ${employee.currentAddress.city}` : ''}
                {employee.currentAddress?.state ? `, ${employee.currentAddress.state}` : ''}
                {employee.currentAddress?.country ? `, ${employee.currentAddress.country}` : ''}
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Emergency Contacts</h3>
              {employee.emergencyContacts && employee.emergencyContacts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {employee.emergencyContacts.map((contact, idx) => (
                    <div key={idx} className="p-3 rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-xs">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{contact.name} ({contact.relationship})</p>
                      <p className="text-slate-500 font-mono mt-0.5">{contact.phone}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No emergency contacts registered.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: EMPLOYMENT */}
        {activeTab === 'employment' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">Department</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{employee.department?.name || 'Unassigned'}</p>
              </div>
              <div>
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">Designation & Grade</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {employee.designation?.title || 'Staff'} {employee.designation?.grade ? `(Grade ${employee.designation.grade})` : ''}
                </p>
              </div>
              <div>
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">Joining Date</span>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{employee.joiningDate}</p>
              </div>
            </div>

            {/* Direct Reports */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Direct Reports</h3>
              {employee.directReports && employee.directReports.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {employee.directReports.map((report) => (
                    <div
                      key={report._id}
                      onClick={() => navigate(`/employees/${report._id}`)}
                      className="p-3 rounded-md border border-slate-200 hover:border-slate-300 dark:border-slate-800 cursor-pointer text-xs transition-colors"
                    >
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{report.displayName || `${report.firstName} ${report.lastName}`}</p>
                      <p className="font-mono text-[11px] text-slate-400">{report.employeeCode}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No personnel currently reporting to this employee.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: EDUCATION & EXPERIENCE */}
        {activeTab === 'education' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Academic Qualifications</h3>
              {employee.education && employee.education.length > 0 ? (
                <div className="space-y-3">
                  {employee.education.map((edu, idx) => (
                    <div key={idx} className="p-3 rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-xs">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{edu.degree}</p>
                      <p className="text-slate-600 dark:text-slate-300">{edu.institution} {edu.fieldOfStudy ? `• ${edu.fieldOfStudy}` : ''}</p>
                      <span className="text-[11px] text-slate-400">{edu.startDate} – {edu.endDate}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No formal degrees listed.</p>
              )}
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Prior Professional Experience</h3>
              {employee.experience && employee.experience.length > 0 ? (
                <div className="space-y-3">
                  {employee.experience.map((exp, idx) => (
                    <div key={idx} className="p-3 rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-xs">
                      <p className="font-bold text-slate-900 dark:text-slate-100">{exp.role} @ {exp.company}</p>
                      <span className="text-[11px] text-slate-400">{exp.startDate} – {exp.endDate || 'Present'}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No prior experience listed.</p>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SKILLS */}
        {activeTab === 'skills' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Validated Competencies</h3>
            {employee.skills && employee.skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {employee.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                  >
                    <span>{skill.name}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300 font-mono">
                      {skill.proficiency}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No skills registered for this profile.</p>
            )}
          </div>
        )}

        {/* TAB 6: DOCUMENT VAULT */}
        {activeTab === 'documents' && (
          <DocumentVault
            employeeId={employee._id}
            documents={employee.documents || []}
            onChange={(documents) =>
              setEmployee((current) => (current ? { ...current, documents } : current))
            }
          />
        )}

        {/* TAB 7: AUDIT HISTORY */}
        {activeTab === 'audit' && (
          <div className="space-y-3">
            <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
              Audit Timeline
            </h3>
            <AuditTimeline
              logs={(employee.auditLogs || []) as any}
              emptyMessage="No audit records found for this employee yet."
            />
          </div>
        )}
      </div>

      {/* Reusable Share Credentials Modal */}
      {employee.initialPassword && (
        <CredentialsModal
          isOpen={showCredentials}
          onClose={() => setShowCredentials(false)}
          title="Employee Corporate Login Credentials"
          employeeName={employee.displayName || `${employee.firstName} ${employee.lastName}`}
          employeeCode={employee.employeeCode}
          workEmail={employee.workEmail}
          initialPassword={employee.initialPassword}
          personalEmail={employee.personalEmail}
        />
      )}

      {/* Lifecycle Status Transition Modal */}
      <StatusTransitionModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        employeeName={employee.displayName || `${employee.firstName} ${employee.lastName}`}
        currentStatus={employee.status}
        onConfirm={handleStatusChange}
      />
    </div>
  );
}
