import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Mail,
  PhoneCall,
  Building2,
  Briefcase,
  ShieldCheck,
  CreditCard,
  KeyRound,
  FileText,
  CheckCircle2,
  Camera,
  X,
  Loader2,
  Info,
  Sparkles,
  Plus,
  Trash2,
  Upload,
  AlertCircle,
} from 'lucide-react';
import { Button, Input, SelectField, Avatar } from '../../../components/ui';
import { CredentialsModal } from '../components/CredentialsModal';
import { useToast } from '../../../components/ui/toast';
import { employeesApi } from '../api/employees.api';
import { organizationApi } from '../../organization/api/organization.api';
import { attendanceApi } from '../../attendance/api/attendance.api';
import type { Department, Designation, LocationItem, CostCenter } from '../../organization/types/organization.types';
import type { Employee } from '../types/employees.types';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
} from '../constants/employment.constants';

const WIZARD_STEPS = [
  { id: 1, title: 'Personal Info', icon: User, desc: 'Name, Photo & Identity' },
  { id: 2, title: 'Contact', icon: Mail, desc: 'Email, Mobile & Address' },
  { id: 3, title: 'Emergency', icon: PhoneCall, desc: 'Emergency Contacts' },
  { id: 4, title: 'Employment', icon: Building2, desc: 'Dept, Role & Manager' },
  { id: 5, title: 'Work Info', icon: Briefcase, desc: 'Work Type, Cost & Shift' },
  { id: 6, title: 'Identification', icon: ShieldCheck, desc: 'ID Type, Number & Expiry' },
  { id: 7, title: 'Payroll', icon: CreditCard, desc: 'Bank & Payment Details' },
  { id: 8, title: 'Account', icon: KeyRound, desc: 'ID & Org Email [AUTO]' },
  { id: 9, title: 'Documents', icon: FileText, desc: 'Optional Uploads' },
  { id: 10, title: 'Review & Create', icon: CheckCircle2, desc: 'Verification & Submit' },
];

export function EmployeeCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState<boolean>(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    employeeId: string;
    displayName: string;
    employeeCode: string;
    workEmail: string;
    initialPassword?: string;
    personalEmail?: string;
  } | null>(null);

  // Reference Master Data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<{ _id: string; name: string; startTime: string; endTime: string }[]>([]);

  // Form State Structured per the 10 Steps
  const [formData, setFormData] = useState({
    // Step 1: Personal Information
    firstName: '',
    middleName: '',
    lastName: '',
    displayName: '',
    avatarUrl: '',
    dateOfBirth: '',
    gender: 'Male',
    maritalStatus: 'Single',
    nationality: 'Indian',
    bloodGroup: '',

    // Step 2: Contact Information
    personalEmail: '',
    phone: '',
    alternatePhone: '',
    secondaryEmail: '',
    currentAddress: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: 'India',
      postalCode: '',
    },

    // Step 3: Emergency Contact
    emergencyContacts: [
      {
        name: '',
        relationship: 'Spouse',
        phone: '',
        alternatePhone: '',
        email: '',
        address: '',
        isPrimary: true,
      },
    ],

    // Step 4: Employment
    departmentId: '',
    designationId: '',
    managerId: '',
    hrId: '',
    locationId: '',
    employmentType: 'FULL_TIME' as const,
    joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE' as const,

    // Step 5: Work Information
    workType: 'ON_SITE' as 'ON_SITE' | 'REMOTE' | 'HYBRID',
    costCenterId: '',
    shift: 'GENERAL' as 'GENERAL' | 'MORNING' | 'EVENING' | 'NIGHT' | 'FLEXIBLE',
    shiftId: '',

    // Step 6: Identification
    idType: 'PASSPORT',
    idNumber: '',
    idIssueDate: '',
    idExpiryDate: '',

    // Step 7: Payroll / Payment
    bankName: '',
    accountNumber: '',
    paymentMethod: 'DIRECT_DEPOSIT',
    routingNumber: '',
    ifscCode: '',
    accountHolderName: '',

    // Step 8: Account
    employeeCode: '',
    workEmail: '',
    role: 'Employee',

    // Step 9: Documents
    documents: [] as Array<{
      id: string;
      title: string;
      category: string;
      fileUrl: string;
      fileName: string;
      issueDate?: string;
      expiryDate?: string;
      remarks?: string;
    }>,
  });

  // State for pending document upload in Step 9
  const [newDocType, setNewDocType] = useState<string>('IDENTITY');
  const [newDocTitle, setNewDocTitle] = useState<string>('');
  const [newDocIssue, setNewDocIssue] = useState<string>('');
  const [newDocExpiry, setNewDocExpiry] = useState<string>('');

  useEffect(() => {
    async function loadRefs() {
      try {
        const [depts, desigs, locs, costs, emps] = await Promise.all([
          organizationApi.getDepartments(),
          organizationApi.getDesignations(),
          organizationApi.getLocations(),
          organizationApi.getCostCenters(),
          employeesApi.getEmployees({ pageSize: 50 }),
        ]);
        setDepartments(depts || []);
        setDesignations(desigs || []);
        setLocations(locs || []);
        setCostCenters(costs || []);
        setPotentialManagers(emps.data || []);

        // Pre-select defaults if available
        if (depts && depts.length > 0) setFormData((prev) => ({ ...prev, departmentId: depts[0]._id }));
        if (desigs && desigs.length > 0) setFormData((prev) => ({ ...prev, designationId: desigs[0]._id }));
        if (locs && locs.length > 0) setFormData((prev) => ({ ...prev, locationId: locs[0]._id }));

        attendanceApi
          .getShifts('ACTIVE')
          .then((list) => {
            setShifts(list || []);
            const general = (list || []).find((s) => s.code === 'GENERAL');
            if (general) setFormData((prev) => (prev.shiftId ? prev : { ...prev, shiftId: general._id }));
          })
          .catch(() => {});
      } catch {
        // Non-blocking
      }
    }
    loadRefs();
  }, []);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      currentAddress: {
        ...prev.currentAddress,
        [field]: value,
      },
    }));
  };

  const handleEmergencyChange = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const updated = [...prev.emergencyContacts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, emergencyContacts: updated };
    });
  };

  const handleAddEmergencyContact = () => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        {
          name: '',
          relationship: 'Other',
          phone: '',
          alternatePhone: '',
          email: '',
          address: '',
          isPrimary: false,
        },
      ],
    }));
  };

  const handleRemoveEmergencyContact = (index: number) => {
    setFormData((prev) => {
      if (prev.emergencyContacts.length <= 1) return prev;
      const updated = prev.emergencyContacts.filter((_, idx) => idx !== index);
      // Ensure at least one is primary
      if (!updated.some((c) => c.isPrimary) && updated.length > 0) {
        updated[0].isPrimary = true;
      }
      return { ...prev, emergencyContacts: updated };
    });
  };

  const handleSetPrimaryEmergency = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((c, idx) => ({
        ...c,
        isPrimary: idx === index,
      })),
    }));
  };

  // Avatar handler
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const { avatarUrl } = await employeesApi.uploadPreHireAvatar(file);
      handleChange('avatarUrl', avatarUrl);
      toast.success('Square profile picture uploaded successfully.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload picture. Please use JPG, PNG or WebP under 5MB.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = () => {
    handleChange('avatarUrl', '');
  };

  // Step 8: Auto-Generate Handlers
  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const res = await employeesApi.generateEmployeeCode();
      handleChange('employeeCode', res.employeeCode);
      toast.success(`Generated Employee ID: ${res.employeeCode}`, 'ID Assigned');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate employee ID');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!formData.firstName.trim()) {
      toast.error('Please enter First Name in Step 1 first.', 'Name Required');
      return;
    }
    setIsGeneratingEmail(true);
    try {
      const res = await employeesApi.generateWorkEmail({
        firstName: formData.firstName,
        lastName: formData.lastName,
      });
      handleChange('workEmail', res.workEmail);
      toast.success(`Generated: ${res.workEmail}`, 'Organization Email Ready');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate organization email');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  // Step 9: Add document upload
  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newDoc = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim() || file.name,
      category: newDocType,
      fileName: file.name,
      fileUrl: URL.createObjectURL(file),
      issueDate: newDocIssue || undefined,
      expiryDate: newDocExpiry || undefined,
    };

    setFormData((prev) => ({
      ...prev,
      documents: [...prev.documents, newDoc],
    }));

    setNewDocTitle('');
    setNewDocIssue('');
    setNewDocExpiry('');
    toast.success(`Added document: ${file.name}`);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const handleRemoveDocument = (docId: string) => {
    setFormData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== docId),
    }));
  };

  // Step navigation & validation
  const handleNext = async () => {
    const errors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.firstName.trim()) errors.firstName = 'First name is required';
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
      if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    } else if (currentStep === 2) {
      if (!formData.personalEmail.trim()) {
        errors.personalEmail = 'Personal Email (Gmail) is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.personalEmail.trim())) {
        errors.personalEmail = 'Please enter a valid email address';
      }
      if (!formData.phone.trim()) errors.phone = 'Mobile number is required';
      if (!formData.currentAddress.addressLine1.trim()) errors.addressLine1 = 'Address line 1 is required';
      if (!formData.currentAddress.city.trim()) errors.city = 'City is required';
    } else if (currentStep === 3) {
      const hasValid = formData.emergencyContacts.some((c) => c.name.trim() && c.phone.trim());
      if (!hasValid) {
        errors.emergency = 'At least one primary emergency contact name & phone is required';
      }
    } else if (currentStep === 4) {
      if (!formData.departmentId) errors.departmentId = 'Department is required';
      if (!formData.designationId) errors.designationId = 'Designation is required';
      if (!formData.locationId) errors.locationId = 'Office location is required';
      if (!formData.joiningDate) errors.joiningDate = 'Date of joining is required';
    } else if (currentStep === 8) {
      // Auto-populate employee code if empty
      if (!formData.employeeCode.trim()) {
        try {
          const res = await employeesApi.generateEmployeeCode();
          handleChange('employeeCode', res.employeeCode);
        } catch {
          // ignore
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    // When advancing from Step 7 to Step 8, proactively generate ID and Org Email if blank
    if (currentStep === 7) {
      if (!formData.employeeCode.trim()) {
        employeesApi.generateEmployeeCode().then((res) => {
          setFormData((prev) => prev.employeeCode ? prev : { ...prev, employeeCode: res.employeeCode });
        }).catch(() => {});
      }
      if (!formData.workEmail.trim() && formData.firstName.trim()) {
        employeesApi.generateWorkEmail({ firstName: formData.firstName, lastName: formData.lastName }).then((res) => {
          setFormData((prev) => prev.workEmail ? prev : { ...prev, workEmail: res.workEmail });
        }).catch(() => {});
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 10));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit Handler in Step 10
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload: any = {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName?.trim() || undefined,
        lastName: formData.lastName.trim(),
        displayName: formData.displayName?.trim() || `${formData.firstName} ${formData.lastName}`.trim(),
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth || undefined,
        maritalStatus: formData.maritalStatus,
        nationality: formData.nationality || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        avatarUrl: formData.avatarUrl || undefined,

        // Contact
        personalEmail: formData.personalEmail.trim(),
        phone: formData.phone.trim() || undefined,
        alternatePhone: formData.alternatePhone.trim() || undefined,
        secondaryEmail: formData.secondaryEmail.trim() || undefined,
        currentAddress: formData.currentAddress,

        // Emergency
        emergencyContacts: formData.emergencyContacts
          .filter((c) => c.name.trim())
          .map((c, idx, arr) => ({
            name: c.name.trim(),
            relationship: c.relationship.trim(),
            phone: c.phone.trim(),
            alternatePhone: c.alternatePhone?.trim() || undefined,
            email: c.email?.trim() || undefined,
            address: c.address?.trim() || undefined,
            isPrimary: arr.some((item) => item.isPrimary) ? c.isPrimary : idx === 0,
          })),

        // Employment
        departmentId: formData.departmentId || undefined,
        designationId: formData.designationId || undefined,
        managerId: formData.managerId || undefined,
        hrId: formData.hrId || undefined,
        locationId: formData.locationId || undefined,
        employmentType: formData.employmentType,
        joiningDate: formData.joiningDate,
        status: formData.status,

        // Work Info
        workType: formData.workType,
        costCenterId: formData.costCenterId || undefined,
        shift: formData.shift,
        shiftId: formData.shiftId || undefined,

        // Identification
        nationalId: formData.idNumber || undefined,
        identification: formData.idNumber ? {
          idType: formData.idType,
          idNumber: formData.idNumber,
          issueDate: formData.idIssueDate || undefined,
          expiryDate: formData.idExpiryDate || undefined,
        } : undefined,

        // Payroll
        payrollInfo: formData.bankName ? {
          bankName: formData.bankName,
          accountNumber: formData.accountNumber,
          paymentMethod: formData.paymentMethod,
          routingNumber: formData.routingNumber || undefined,
          ifscCode: formData.ifscCode || undefined,
          accountHolderName: formData.accountHolderName || undefined,
        } : undefined,

        // Account
        employeeCode: formData.employeeCode.trim() || undefined,
        workEmail: formData.workEmail.trim() || formData.personalEmail.trim(),

        // Documents: step 9 only keeps local blob previews until upload.
        // Blob URLs are not transferable to the server, so never send them —
        // HR uploads real files via the Document Vault after creation.
        documents: formData.documents
          .filter((d) => d.fileUrl && !d.fileUrl.startsWith('blob:'))
          .map((d) => ({
            title: d.title,
            category: d.category,
            documentType: d.category,
            documentName: d.title,
            fileUrl: d.fileUrl,
            fileName: d.fileName,
            issueDate: d.issueDate,
            expiryDate: d.expiryDate,
            verificationStatus: 'PENDING' as const,
          })),
      };

      const created = await employeesApi.createEmployee(payload);
      toast.success(`${created.displayName || created.firstName} has been onboarded successfully!`, 'Employee Created');
      setCreatedCredentials({
        employeeId: created._id,
        displayName: created.displayName || `${created.firstName} ${created.lastName}`,
        employeeCode: created.employeeCode,
        workEmail: created.workEmail,
        personalEmail: created.personalEmail,
        initialPassword: created.initialPassword,
      });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create employee profile.', 'Creation Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDept = departments.find((d) => d._id === formData.departmentId);
  const selectedDesig = designations.find((d) => d._id === formData.designationId);
  const selectedLoc = locations.find((l) => l._id === formData.locationId);
  const selectedCost = costCenters.find((c) => c._id === formData.costCenterId);
  const selectedMgr = potentialManagers.find((m) => (m._id === formData.managerId || (m as any).id === formData.managerId));

  return (
    <div className="space-y-6 w-full pb-12">
      {/* 1. TOP TITLE HEADER CARD */}
      <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="p-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              title="Return to employee roster"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
                  Add New Employee
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
                  10-Step Wizard
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Complete workforce onboarding, access configuration, and portal login provisioning.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/employees')}
              className="text-xs border-slate-300 dark:border-slate-700"
            >
              Cancel
            </Button>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md dark:bg-slate-900 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              Step {currentStep} of 10
            </span>
          </div>
        </div>
      </div>

      {/* 2. STEPPER TIMELINE NAVIGATION (10 Steps) */}
      <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-[760px]">
          {WIZARD_STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (step.id < currentStep) setCurrentStep(step.id);
                }}
                disabled={step.id > currentStep}
                className={`flex-1 flex flex-col items-center text-center p-2 rounded-md transition-all border text-left cursor-pointer ${
                  isCurrent
                    ? 'border-[var(--primary)] bg-[var(--primary-light)]'
                    : isCompleted
                    ? 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40'
                    : 'border-transparent bg-transparent opacity-40 cursor-not-allowed'
                }`}
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-[var(--primary)] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="h-3 w-3" /> : step.id}
                </div>
                <span
                  className={`mt-1 text-[11px] font-semibold truncate max-w-full ${
                    isCurrent
                      ? 'text-[var(--primary)] font-bold'
                      : isCompleted
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. STEP FORM CONTAINER */}
      <div className="rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden shadow-xs">
        
        {/* STEP 1: PERSONAL INFORMATION */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--primary)] text-white">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Step 1: Personal Information
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Employee legal identity, photo upload, birth date, gender, and nationality
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">1 of 10</span>
            </div>

            <div className="p-6 space-y-6">
              {/* Profile Picture Upload Card */}
              <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
                <label className="text-[11px] font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300 block mb-2">
                  Profile Photo (Square Format)
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative group shrink-0">
                    <Avatar
                      src={formData.avatarUrl || null}
                      name={formData.displayName || `${formData.firstName} ${formData.lastName}`.trim() || 'New Employee'}
                      size="xl"
                      className="rounded-md border border-slate-300 dark:border-slate-700"
                    />
                    {formData.avatarUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        className="absolute -top-1.5 -right-1.5 p-1 bg-rose-600 text-white rounded-md hover:bg-rose-700 transition-colors border border-white dark:border-slate-900 cursor-pointer"
                        title="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={avatarInputRef}
                        onChange={handleAvatarSelect}
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="flex items-center gap-1.5 cursor-pointer text-xs"
                      >
                        {isUploadingAvatar ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Uploading Photo...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="h-3.5 w-3.5" />
                            <span>{formData.avatarUrl ? 'Change Photo' : 'Upload Profile Photo'}</span>
                          </>
                        )}
                      </Button>
                      {formData.avatarUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="text-xs text-rose-600 hover:text-rose-700 underline font-medium cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Square format up to 5MB (JPG, PNG, WebP).
                    </p>
                  </div>
                </div>
              </div>

              {/* Personal Details Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <Input
                  label="First Name"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="e.g. Marcus"
                  error={fieldErrors.firstName}
                />
                <Input
                  label="Middle Name"
                  value={formData.middleName}
                  onChange={(e) => handleChange('middleName', e.target.value)}
                  placeholder="e.g. Alexander"
                />
                <Input
                  label="Last Name"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="e.g. Chen"
                  error={fieldErrors.lastName}
                />
                <Input
                  label="Preferred / Display Name"
                  value={formData.displayName}
                  onChange={(e) => handleChange('displayName', e.target.value)}
                  placeholder="e.g. Mark Chen"
                />
                <Input
                  label="Date of Birth"
                  required
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  error={fieldErrors.dateOfBirth}
                />
                <SelectField
                  label="Gender"
                  value={formData.gender}
                  onChange={(e) => handleChange('gender', e.target.value)}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Non-Binary', label: 'Non-Binary' },
                    { value: 'Other', label: 'Prefer not to say' },
                  ]}
                />
                <Input
                  label="Nationality"
                  value={formData.nationality}
                  onChange={(e) => handleChange('nationality', e.target.value)}
                  placeholder="e.g. Indian, American, Canadian"
                />
                <SelectField
                  label="Marital Status"
                  value={formData.maritalStatus}
                  onChange={(e) => handleChange('maritalStatus', e.target.value)}
                  options={[
                    { value: 'Single', label: 'Single' },
                    { value: 'Married', label: 'Married' },
                    { value: 'Divorced', label: 'Divorced' },
                    { value: 'Widowed', label: 'Widowed' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
                <SelectField
                  label="Blood Group"
                  value={formData.bloodGroup}
                  onChange={(e) => handleChange('bloodGroup', e.target.value)}
                  placeholder="Select Blood Group..."
                  options={[
                    { value: 'A+', label: 'A+' },
                    { value: 'A-', label: 'A-' },
                    { value: 'B+', label: 'B+' },
                    { value: 'B-', label: 'B-' },
                    { value: 'AB+', label: 'AB+' },
                    { value: 'AB-', label: 'AB-' },
                    { value: 'O+', label: 'O+' },
                    { value: 'O-', label: 'O-' },
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: CONTACT INFORMATION */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--primary)] text-white">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Step 2: Contact Information
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Personal communication details, mobile phone, and permanent residential address
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">2 of 10</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-3 rounded-md bg-sky-50 border border-sky-200 dark:bg-sky-950/40 dark:border-sky-800 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                <p className="text-xs text-sky-900 dark:text-sky-200">
                  <strong>Portal Login Email:</strong> The Personal Email entered below will be the employee&apos;s sign-in identifier for the PeopleOS portal. The initial welcome letter and password will be delivered here.
                </p>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Personal Contact
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <Input
                  label="Personal Email (Gmail / Sign-In Account)"
                  required
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) => handleChange('personalEmail', e.target.value)}
                  placeholder="e.g. employee.name@gmail.com"
                  helperText="Portal password & welcome letter delivered to this address."
                  error={fieldErrors.personalEmail}
                />
                <Input
                  label="Personal Mobile Number"
                  required
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  error={fieldErrors.phone}
                />
                <Input
                  label="Alternate Phone Number"
                  value={formData.alternatePhone}
                  onChange={(e) => handleChange('alternatePhone', e.target.value)}
                  placeholder="e.g. +91 98765 00000"
                />
                <Input
                  label="Secondary Email"
                  type="email"
                  value={formData.secondaryEmail}
                  onChange={(e) => handleChange('secondaryEmail', e.target.value)}
                  placeholder="e.g. backup.email@gmail.com"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Residential Address
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <Input
                    label="Address Line 1"
                    required
                    value={formData.currentAddress.addressLine1}
                    onChange={(e) => handleAddressChange('addressLine1', e.target.value)}
                    placeholder="e.g. Flat 402, Sunshine Residency"
                    error={fieldErrors.addressLine1}
                  />
                  <Input
                    label="Address Line 2"
                    value={formData.currentAddress.addressLine2}
                    onChange={(e) => handleAddressChange('addressLine2', e.target.value)}
                    placeholder="e.g. Near Tech Park, Main Road"
                  />
                  <Input
                    label="City"
                    required
                    value={formData.currentAddress.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    placeholder="e.g. Bengaluru"
                    error={fieldErrors.city}
                  />
                  <Input
                    label="State / Province"
                    value={formData.currentAddress.state}
                    onChange={(e) => handleAddressChange('state', e.target.value)}
                    placeholder="e.g. Karnataka"
                  />
                  <Input
                    label="Country"
                    value={formData.currentAddress.country}
                    onChange={(e) => handleAddressChange('country', e.target.value)}
                    placeholder="e.g. India"
                  />
                  <Input
                    label="Postal / ZIP Code"
                    value={formData.currentAddress.postalCode}
                    onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                    placeholder="e.g. 560001"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: EMERGENCY CONTACT */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--primary)] text-white">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Step 3: Emergency Contact
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Primary and secondary emergency contacts for crisis response and employee safety
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">3 of 10</span>
            </div>

            <div className="p-6 space-y-6">
              {fieldErrors.emergency && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{fieldErrors.emergency}</span>
                </div>
              )}

              <div className="space-y-4">
                {formData.emergencyContacts.map((contact, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40 space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Contact #{idx + 1}
                        </span>
                        {contact.isPrimary ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Primary Contact
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetPrimaryEmergency(idx)}
                            className="text-[11px] text-[var(--primary)] hover:underline font-medium cursor-pointer"
                          >
                            Set as Primary
                          </button>
                        )}
                      </div>
                      {formData.emergencyContacts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEmergencyContact(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove contact"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Input
                        label="Full Name"
                        required
                        value={contact.name}
                        onChange={(e) => handleEmergencyChange(idx, 'name', e.target.value)}
                        placeholder="e.g. Jane Smith"
                      />
                      <SelectField
                        label="Relationship"
                        value={contact.relationship}
                        onChange={(e) => handleEmergencyChange(idx, 'relationship', e.target.value)}
                        options={[
                          { value: 'Spouse', label: 'Spouse' },
                          { value: 'Parent', label: 'Parent' },
                          { value: 'Sibling', label: 'Sibling' },
                          { value: 'Child', label: 'Child' },
                          { value: 'Friend', label: 'Friend' },
                          { value: 'Guardian', label: 'Guardian' },
                          { value: 'Other', label: 'Other' },
                        ]}
                      />
                      <Input
                        label="Primary Phone"
                        required
                        value={contact.phone}
                        onChange={(e) => handleEmergencyChange(idx, 'phone', e.target.value)}
                        placeholder="e.g. +91 98765 00001"
                      />
                      <Input
                        label="Alternate Phone"
                        value={contact.alternatePhone}
                        onChange={(e) => handleEmergencyChange(idx, 'alternatePhone', e.target.value)}
                        placeholder="e.g. +91 98765 00002"
                      />
                      <Input
                        label="Email Address"
                        type="email"
                        value={contact.email}
                        onChange={(e) => handleEmergencyChange(idx, 'email', e.target.value)}
                        placeholder="e.g. jane.smith@example.com"
                      />
                      <div className="sm:col-span-2 lg:col-span-3">
                        <Input
                          label="Address"
                          value={contact.address}
                          onChange={(e) => handleEmergencyChange(idx, 'address', e.target.value)}
                          placeholder="e.g. Same as residential address"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEmergencyContact}
                className="flex items-center gap-1.5 text-xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Another Contact</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: EMPLOYMENT */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--primary)] text-white">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Step 4: Employment Information
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Organization structure, department assignment, job designation, reporting line, and joining date
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">4 of 10</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <SelectField
                  label="Department Assignment"
                  required
                  value={formData.departmentId}
                  onChange={(e) => handleChange('departmentId', e.target.value)}
                  placeholder="Select Department..."
                  options={departments.map((d) => ({
                    value: d._id,
                    label: `${d.name} (${d.code})`,
                  }))}
                  error={fieldErrors.departmentId}
                />
                <SelectField
                  label="Job Designation & Grade"
                  required
                  value={formData.designationId}
                  onChange={(e) => handleChange('designationId', e.target.value)}
                  placeholder="Select Designation..."
                  options={designations.map((d) => ({
                    value: d._id,
                    label: `${d.title} (Grade ${d.grade})`,
                  }))}
                  error={fieldErrors.designationId}
                />
                <SelectField
                  label="Direct Reporting Manager"
                  value={formData.managerId}
                  onChange={(e) => handleChange('managerId', e.target.value)}
                  placeholder="Select Reporting Manager..."
                  options={[
                    { value: '', label: 'None / Top Level Executive' },
                    ...potentialManagers.map((m) => ({
                      value: m._id || (m as any).id,
                      label: `${m.displayName || `${m.firstName} ${m.lastName}`} (${m.employeeCode})`,
                    })),
                  ]}
                  helperText="Primary manager who approves leaves, transitions, and reviews."
                />
                <SelectField
                  label="Reporting HR"
                  value={formData.hrId}
                  onChange={(e) => handleChange('hrId', e.target.value)}
                  placeholder="Select Reporting HR..."
                  options={[
                    { value: '', label: 'None / Assign later' },
                    ...potentialManagers.map((m) => ({
                      value: m._id || (m as any).id,
                      label: `${m.displayName || `${m.firstName} ${m.lastName}`} (${m.employeeCode})`,
                    })),
                  ]}
                  helperText="Day-to-day HR contact shown on the employee dashboard."
                />
                <SelectField
                  label="Office Location"
                  required
                  value={formData.locationId}
                  onChange={(e) => handleChange('locationId', e.target.value)}
                  placeholder="Select Location..."
                  options={locations.map((l) => ({
                    value: l._id,
                    label: `${l.name} (${l.city}, ${l.country})`,
                  }))}
                  error={fieldErrors.locationId}
                />
                <SelectField
                  label="Employment Type"
                  required
                  value={formData.employmentType}
                  onChange={(e) => handleChange('employmentType', e.target.value)}
                  options={EMPLOYMENT_TYPE_OPTIONS.map((t) => ({
                    value: t.value,
                    label: t.label,
                  }))}
                />
                <Input
                  label="Official Date of Joining"
                  required
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => handleChange('joiningDate', e.target.value)}
                  error={fieldErrors.joiningDate}
                />
                <SelectField
                  label="Employment Status"
                  required
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  options={EMPLOYMENT_STATUS_OPTIONS.map((s) => ({
                    value: s.value,
                    label: s.label,
                  }))}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: WORK INFORMATION */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--primary)] text-white">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Step 5: Work Information
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Workplace modality, cost center accounting, and operational shift schedule
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">5 of 10</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <SelectField
                  label="Work Type / Modality"
                  required
                  value={formData.workType}
                  onChange={(e) => handleChange('workType', e.target.value)}
                  options={[
                    { value: 'ON_SITE', label: 'On-site / In-Office' },
                    { value: 'REMOTE', label: 'Remote / Work From Home' },
                    { value: 'HYBRID', label: 'Hybrid (Office + Remote)' },
                  ]}
                  helperText="Primary location model for employee day-to-day operations."
                />
                <SelectField
                  label="Cost Center"
                  value={formData.costCenterId}
                  onChange={(e) => handleChange('costCenterId', e.target.value)}
                  placeholder="Select Cost Center..."
                  options={[
                    { value: '', label: 'Unassigned / Default' },
                    ...costCenters.map((c) => ({
                      value: c._id,
                      label: `${c.name} (${c.code})`,
                    })),
                  ]}
                  helperText="Financial ledger unit for salary and operational expenses."
                />
                <SelectField
                  label="Work Shift Schedule"
                  required
                  value={formData.shiftId}
                  onChange={(e) => handleChange('shiftId', e.target.value)}
                  placeholder={shifts.length === 0 ? 'Loading shifts…' : 'Select Shift…'}
                  options={shifts.map((s) => ({
                    value: s._id,
                    label: `${s.name} (${s.startTime} – ${s.endTime})`,
                  }))}
                  helperText="Standard shift timing for attendance tracking and payroll."
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: IDENTIFICATION */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--primary)] text-white">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Step 6: Identification
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Government ID documents, verification numbers, and expiry dates
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">6 of 10</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <SelectField
                  label="ID Document Type"
                  value={formData.idType}
                  onChange={(e) => handleChange('idType', e.target.value)}
                  options={[
                    { value: 'PASSPORT', label: 'Passport' },
                    { value: 'NATIONAL_ID', label: 'National ID / Aadhaar / SSN' },
                    { value: 'DRIVING_LICENSE', label: 'Driver’s License' },
                    { value: 'TAX_ID', label: 'Tax ID / PAN / EIN' },
                    { value: 'VOTER_ID', label: 'Voter Registration ID' },
                    { value: 'OTHER', label: 'Other Government ID' },
                  ]}
                />
                <Input
                  label="ID / Document Number"
                  value={formData.idNumber}
                  onChange={(e) => handleChange('idNumber', e.target.value)}
                  placeholder="e.g. Z1234567 or 1234-5678-9012"
                />
                <Input
                  label="Date of Issue"
                  type="date"
                  value={formData.idIssueDate}
                  onChange={(e) => handleChange('idIssueDate', e.target.value)}
                />
                <Input
                  label="Date of Expiry"
                  type="date"
                  value={formData.idExpiryDate}
                  onChange={(e) => handleChange('idExpiryDate', e.target.value)}
                  helperText="Optional if ID has lifetime validity."
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: PAYROLL / PAYMENT */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--primary)] text-white">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Step 7: Payroll / Payment Information
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Bank account details, disbursement routing, and payment method
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">7 of 10</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <Input
                  label="Bank Name"
                  value={formData.bankName}
                  onChange={(e) => handleChange('bankName', e.target.value)}
                  placeholder="e.g. HDFC Bank, Chase, HSBC"
                />
                <Input
                  label="Account Number / IBAN"
                  value={formData.accountNumber}
                  onChange={(e) => handleChange('accountNumber', e.target.value)}
                  placeholder="e.g. 50100123456789"
                />
                <Input
                  label="Account Holder Name"
                  value={formData.accountHolderName}
                  onChange={(e) => handleChange('accountHolderName', e.target.value)}
                  placeholder="e.g. Marcus Chen (as in bank passbook)"
                />
                <SelectField
                  label="Payment Method"
                  value={formData.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                  options={[
                    { value: 'DIRECT_DEPOSIT', label: 'Direct Deposit / Electronic Transfer' },
                    { value: 'BANK_TRANSFER', label: 'Wire Transfer / RTGS / NEFT' },
                    { value: 'CHEQUE', label: 'Cheque' },
                  ]}
                />
                <Input
                  label="Routing Number / IFSC Code"
                  value={formData.ifscCode}
                  onChange={(e) => handleChange('ifscCode', e.target.value)}
                  placeholder="e.g. HDFC0001234 or ABA-021000021"
                />
                <Input
                  label="SWIFT / BIC Code (Optional)"
                  value={formData.routingNumber}
                  onChange={(e) => handleChange('routingNumber', e.target.value)}
                  placeholder="e.g. HDFCINBB"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: ACCOUNT & IDENTITY GENERATION */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--primary)] text-white">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Step 8: Account Configuration [AUTO]
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    System credentials, unique employee code, and corporate email generation
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">8 of 10</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Employee ID [AUTO] */}
                <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Employee ID [AUTO]
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded">
                      Sequential
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={formData.employeeCode}
                      onChange={(e) => handleChange('employeeCode', e.target.value)}
                      placeholder="e.g. NEX-00001"
                      className="uppercase font-mono flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateCode}
                      disabled={isGeneratingCode}
                      className="shrink-0 flex items-center gap-1.5 text-xs cursor-pointer"
                      title="Auto-generate next sequential code"
                    >
                      {isGeneratingCode ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
                      )}
                      <span>Generate</span>
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Formatted with configured Organization Prefix (e.g. NEX-00001).
                  </p>
                </div>

                {/* Organization Email [AUTO] */}
                <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Organization Email [AUTO]
                    </label>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                      Duplicate Check
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={formData.workEmail}
                      onChange={(e) => handleChange('workEmail', e.target.value)}
                      placeholder={formData.personalEmail || "e.g. marcus.chen@organization.com"}
                      className="lowercase font-mono flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateEmail}
                      disabled={isGeneratingEmail}
                      className="shrink-0 flex items-center gap-1.5 text-xs cursor-pointer"
                      title="Auto-generate organization email with collision check"
                    >
                      {isGeneratingEmail ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
                      )}
                      <span>Generate</span>
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Auto-generated from employee name. Defaults to personal Gmail if omitted.
                  </p>
                </div>

                {/* Role [Employee] */}
                <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                    Access Role [Default]
                  </label>
                  <div className="p-2.5 rounded-md bg-white border border-slate-200 dark:bg-slate-950 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        Employee (Workforce Member)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      Standard
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Grants access to Employee Self-Service, Attendance, Leaves, and Profile.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 9: DOCUMENTS (OPTIONAL INITIAL UPLOADS) */}
        {currentStep === 9 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-[var(--primary)] text-white">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Step 9: Employee Documents (Optional Initial Uploads)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Upload initial verification files or request them from the employee post-creation
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-500">9 of 10</span>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <strong>Optional at Creation:</strong> HR is not forced to upload every document right now. Files listed here are tracked locally; upload the real files via the employee&apos;s Document Vault after creation.
              </div>

              {/* Upload Input Bar */}
              <div className="p-4 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Attach Initial Document
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <SelectField
                    label="Document Type"
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value)}
                    options={[
                      { value: 'IDENTITY', label: 'Government ID / Passport' },
                      { value: 'EMPLOYMENT', label: 'Offer Letter / Contract' },
                      { value: 'ACADEMIC', label: 'Degree / Certificate' },
                      { value: 'FINANCIAL', label: 'Void Cheque / Bank Letter' },
                      { value: 'GENERAL', label: 'Other Document' },
                    ]}
                  />
                  <Input
                    label="Document Name / Title"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="e.g. Passport Copy (Page 1)"
                  />
                  <Input
                    label="Issue Date (Optional)"
                    type="date"
                    value={newDocIssue}
                    onChange={(e) => setNewDocIssue(e.target.value)}
                  />
                  <Input
                    label="Expiry Date (Optional)"
                    type="date"
                    value={newDocExpiry}
                    onChange={(e) => setNewDocExpiry(e.target.value)}
                  />
                </div>

                <div>
                  <input
                    type="file"
                    ref={docInputRef}
                    onChange={handleAddDocument}
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => docInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs cursor-pointer border-slate-300 dark:border-slate-700"
                  >
                    <Upload className="h-3.5 w-3.5 text-[var(--primary)]" />
                    <span>Select &amp; Attach File (PDF, PNG, JPG)</span>
                  </Button>
                </div>
              </div>

              {/* Uploaded Documents List */}
              {formData.documents.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Attached Documents ({formData.documents.length})
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    {formData.documents.map((doc) => (
                      <div key={doc.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="h-4 w-4 text-[var(--primary)] shrink-0" />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {doc.title}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              {doc.category} • {doc.fileName}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                          title="Remove attached document"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 10: REVIEW & CREATE */}
        {currentStep === 10 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-emerald-600 text-white">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Step 10: Review &amp; Create Employee Profile
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Final verification of employee credentials before dispatching welcome letter and creating account
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                Final Review
              </span>
            </div>

            <div className="p-6 space-y-5">
              {/* Summary Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Personal Identity */}
                <div className="p-4 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      1. Personal Information
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-[var(--primary)] font-medium hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={formData.avatarUrl || null}
                      name={`${formData.firstName} ${formData.lastName}`}
                      size="md"
                    />
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {formData.firstName} {formData.middleName} {formData.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        DOB: {formData.dateOfBirth || '—'} • {formData.gender} • {formData.nationality}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Contact & Residential Address */}
                <div className="p-4 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      2. Contact &amp; Address
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="text-xs text-[var(--primary)] font-medium hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-slate-100">Email:</strong> {formData.personalEmail || '—'}</p>
                    <p><strong className="text-slate-900 dark:text-slate-100">Mobile:</strong> {formData.phone || '—'}</p>
                    <p><strong className="text-slate-900 dark:text-slate-100">Address:</strong> {formData.currentAddress.addressLine1 ? `${formData.currentAddress.addressLine1}, ${formData.currentAddress.city} (${formData.currentAddress.country})` : '—'}</p>
                  </div>
                </div>

                {/* 3. Emergency Contact */}
                <div className="p-4 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      3. Emergency Contact
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="text-xs text-[var(--primary)] font-medium hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    {formData.emergencyContacts[0]?.name ? (
                      <>
                        <p><strong className="text-slate-900 dark:text-slate-100">Name:</strong> {formData.emergencyContacts[0].name} ({formData.emergencyContacts[0].relationship})</p>
                        <p><strong className="text-slate-900 dark:text-slate-100">Phone:</strong> {formData.emergencyContacts[0].phone}</p>
                        {formData.emergencyContacts[0].email && <p><strong className="text-slate-900 dark:text-slate-100">Email:</strong> {formData.emergencyContacts[0].email}</p>}
                      </>
                    ) : (
                      <p className="text-slate-400 italic">No emergency contact provided</p>
                    )}
                  </div>
                </div>

                {/* 4. Employment */}
                <div className="p-4 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      4. Employment Details
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="text-xs text-[var(--primary)] font-medium hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-slate-100">Department:</strong> {selectedDept?.name || '—'}</p>
                    <p><strong className="text-slate-900 dark:text-slate-100">Role:</strong> {selectedDesig?.title || '—'}</p>
                    <p><strong className="text-slate-900 dark:text-slate-100">Manager:</strong> {selectedMgr?.displayName || (selectedMgr ? `${selectedMgr.firstName} ${selectedMgr.lastName}` : 'None')}</p>
                    <p><strong className="text-slate-900 dark:text-slate-100">Location:</strong> {selectedLoc?.name || '—'}</p>
                    <p><strong className="text-slate-900 dark:text-slate-100">Joining:</strong> {formData.joiningDate}</p>
                  </div>
                </div>

                {/* 5. Work Information */}
                <div className="p-4 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      5. Work Information
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(5)}
                      className="text-xs text-[var(--primary)] font-medium hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-slate-100">Work Type:</strong> {formData.workType}</p>
                    <p><strong className="text-slate-900 dark:text-slate-100">Cost Center:</strong> {selectedCost ? `${selectedCost.name} (${selectedCost.code})` : 'Default'}</p>
                    <p><strong className="text-slate-900 dark:text-slate-100">Shift:</strong> {shifts.find((s) => s._id === formData.shiftId) ? `${shifts.find((s) => s._id === formData.shiftId)!.name} (${shifts.find((s) => s._id === formData.shiftId)!.startTime} – ${shifts.find((s) => s._id === formData.shiftId)!.endTime})` : formData.shift}</p>
                  </div>
                </div>

                {/* 6. Identification & 7. Payroll */}
                <div className="p-4 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      6. ID &amp; 7. Payroll
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(6)}
                      className="text-xs text-[var(--primary)] font-medium hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <p><strong className="text-slate-900 dark:text-slate-100">ID Document:</strong> {formData.idNumber ? `${formData.idType}: ${formData.idNumber}` : 'Pending upload'}</p>
                    <p><strong className="text-slate-900 dark:text-slate-100">Bank:</strong> {formData.bankName ? `${formData.bankName} (A/C: ${formData.accountNumber})` : 'Pending bank details'}</p>
                    <p><strong className="text-slate-900 dark:text-slate-100">Payment:</strong> {formData.paymentMethod}</p>
                  </div>
                </div>

                {/* 8. Account & 9. Documents */}
                <div className="p-4 rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      8. Account &amp; 9. Initial Documents
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(8)}
                      className="text-xs text-[var(--primary)] font-medium hover:underline cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-sans">Employee Code</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {formData.employeeCode || 'Will auto-generate on submit'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans">Work Email</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">
                        {formData.workEmail || formData.personalEmail || 'Will auto-generate'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans">Initial Documents</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {formData.documents.length} document(s) attached
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Ready to Onboard Callout */}
              <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
                  <p className="font-bold">Ready to dispatch Official Offer &amp; Welcome Letter</p>
                  <p>
                    Submitting this form will establish the employee record, create their portal login credentials, and dispatch the welcome note directly to <strong>{formData.personalEmail}</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER ACTION BUTTONS */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={currentStep === 1 ? () => navigate('/employees') : handleBack}
            className="flex items-center gap-1.5 text-xs cursor-pointer border-slate-300 dark:border-slate-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{currentStep === 1 ? 'Cancel' : 'Previous Step'}</span>
          </Button>

          {currentStep < 10 ? (
            <Button
              type="button"
              size="sm"
              onClick={handleNext}
              className="flex items-center gap-1.5 text-xs cursor-pointer bg-[var(--primary)] hover:opacity-90 text-white"
            >
              <span>Continue to Step {currentStep + 1}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 text-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating Employee Profile...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Complete &amp; Onboard Employee</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* CREDENTIALS SUCCESS MODAL */}
      {createdCredentials && (
        <CredentialsModal
          isOpen={true}
          onClose={() => {
            setCreatedCredentials(null);
            navigate(`/employees/${createdCredentials.employeeId}`);
          }}
          employeeName={createdCredentials.displayName}
          employeeCode={createdCredentials.employeeCode}
          workEmail={createdCredentials.workEmail}
          personalEmail={createdCredentials.personalEmail}
          initialPassword={createdCredentials.initialPassword}
          onNavigateProfile={() => {
            navigate(`/employees/${createdCredentials.employeeId}`);
          }}
        />
      )}
    </div>
  );
}
