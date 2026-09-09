import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Camera, Loader2, Sparkles, Lock } from 'lucide-react';
import { Button, Input, SelectField, Avatar } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { useAuth } from '../../auth/context/AuthContext';
import { employeesApi } from '../api/employees.api';
import { organizationApi } from '../../organization/api/organization.api';
import { attendanceApi } from '../../attendance/api/attendance.api';
import type { Shift } from '../../attendance/types/shift.types';
import type { Department, Designation, LocationItem, CostCenter } from '../../organization/types/organization.types';
import type { Employee, EmergencyContact } from '../types/employees.types';
import {
  EMPLOYMENT_TYPE_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
} from '../constants/employment.constants';

export function EmployeeEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const { user } = useAuth();
  const isHrOrAdmin = Boolean(
    user?.roles?.some((r) =>
      ['ADMIN', 'HR', 'HR_ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN', 'Admin', 'HR Manager', 'HR Admin'].includes(r)
    ) ||
    user?.permissions?.includes('EMPLOYEE_UPDATE') ||
    user?.permissions?.includes('EMPLOYEE_CREATE')
  );

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [potentialManagers, setPotentialManagers] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState<boolean>(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState<boolean>(false);

  // Editable Form State
  const [formData, setFormData] = useState<{
    firstName: string;
    middleName: string;
    lastName: string;
    displayName: string;
    gender: string;
    dateOfBirth: string;
    maritalStatus: string;
    bloodGroup: string;
    nationalId: string;
    nationality: string;
    countryOfBirth: string;
    stateOfBirth: string;
    avatarUrl: string;
    employeeCode: string;
    workEmail: string;
    personalEmail: string;
    phone: string;
    alternatePhone: string;
    secondaryEmail: string;
    managerId: string;
    hrId: string;
    currentAddress: {
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    emergencyContacts: EmergencyContact[];
    departmentId: string;
    designationId: string;
    locationId: string;
    costCenterId: string;
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'TEMPORARY' | 'CONSULTANT';
    status: 'ACTIVE' | 'PROBATION' | 'ON_NOTICE' | 'NOTICE_PERIOD' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'INACTIVE' | 'ON_LEAVE' | 'JOINING';
    joiningDate: string;
    workType: 'ON_SITE' | 'REMOTE' | 'HYBRID';
    shift: 'GENERAL' | 'MORNING' | 'EVENING' | 'NIGHT' | 'FLEXIBLE';
    shiftId: string;
    identification: {
      idType?: string;
      idNumber?: string;
      issueDate?: string;
      expiryDate?: string;
    };
    payrollInfo: {
      bankName?: string;
      accountNumber?: string;
      accountHolderName?: string;
      paymentMethod?: string;
      routingNumber?: string;
      swiftCode?: string;
      ifscCode?: string;
    };
  }>({
    firstName: '',
    middleName: '',
    lastName: '',
    displayName: '',
    gender: 'Male',
    dateOfBirth: '',
    maritalStatus: 'Single',
    bloodGroup: '',
    nationalId: '',
    nationality: '',
    countryOfBirth: '',
    stateOfBirth: '',
    avatarUrl: '',
    employeeCode: '',
    workEmail: '',
    personalEmail: '',
    phone: '',
    alternatePhone: '',
    secondaryEmail: '',
    managerId: '',
    hrId: '',
    currentAddress: {
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
    },
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
    departmentId: '',
    designationId: '',
    locationId: '',
    costCenterId: '',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    joiningDate: '',
    workType: 'ON_SITE',
    shift: 'GENERAL',
    shiftId: '',
    identification: {
      idType: 'National ID',
      idNumber: '',
      issueDate: '',
      expiryDate: '',
    },
    payrollInfo: {
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      paymentMethod: 'DIRECT_DEPOSIT',
      routingNumber: '',
      swiftCode: '',
      ifscCode: '',
    },
  });

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        // Reference lists are best-effort: an employee editing their own file
        // may lack some list permissions, but the form must still open with
        // the employee record itself (which is self-service allowed).
        const [empRes, deptsRes, desigsRes, locsRes, costsRes, empsRes, shiftsRes] = await Promise.allSettled([
          employeesApi.getEmployeeById(id),
          organizationApi.getDepartments(),
          organizationApi.getDesignations(),
          organizationApi.getLocations(),
          organizationApi.getCostCenters(),
          employeesApi.getEmployees({ pageSize: 100 }),
          attendanceApi.getShifts('ACTIVE'),
        ]);
        if (empRes.status !== 'fulfilled') throw empRes.reason;
        const emp = empRes.value;
        const depts = deptsRes.status === 'fulfilled' ? deptsRes.value : [];
        const desigs = desigsRes.status === 'fulfilled' ? desigsRes.value : [];
        const locs = locsRes.status === 'fulfilled' ? locsRes.value : [];
        const costs = costsRes.status === 'fulfilled' ? costsRes.value : [];
        const emps = empsRes.status === 'fulfilled' ? empsRes.value : null;
        const shiftList = shiftsRes.status === 'fulfilled' ? shiftsRes.value : [];
        setEmployee(emp);
        setDepartments(depts || []);
        setDesignations(desigs || []);
        setLocations(locs || []);
        setCostCenters(costs || []);
        setPotentialManagers(((emps as any)?.data || []).filter((m: any) => m._id !== id));
        setShifts(shiftList);

        setFormData({
          firstName: emp.firstName || '',
          middleName: emp.middleName || '',
          lastName: emp.lastName || '',
          displayName: emp.displayName || '',
          gender: emp.gender || 'Male',
          dateOfBirth: emp.dateOfBirth || '',
          maritalStatus: emp.maritalStatus || 'Single',
          bloodGroup: emp.bloodGroup || '',
          nationalId: emp.nationalId || '',
          nationality: emp.nationality || '',
          countryOfBirth: emp.countryOfBirth || '',
          stateOfBirth: emp.stateOfBirth || '',
          avatarUrl: emp.avatarUrl || '',
          employeeCode: emp.employeeCode || '',
          workEmail: emp.workEmail || '',
          personalEmail: emp.personalEmail || '',
          phone: emp.phone || '',
          alternatePhone: emp.alternatePhone || '',
          secondaryEmail: emp.secondaryEmail || '',
          managerId: emp.managerId || '',
          hrId: emp.hrId || '',
          currentAddress: {
            addressLine1: emp.currentAddress?.addressLine1 || '',
            addressLine2: emp.currentAddress?.addressLine2 || '',
            city: emp.currentAddress?.city || '',
            state: emp.currentAddress?.state || '',
            country: emp.currentAddress?.country || '',
            postalCode: emp.currentAddress?.postalCode || '',
          },
          emergencyContacts: emp.emergencyContacts && emp.emergencyContacts.length > 0
            ? emp.emergencyContacts
            : [
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
          departmentId: emp.departmentId || '',
          designationId: emp.designationId || '',
          locationId: emp.locationId || '',
          costCenterId: emp.costCenterId || '',
          employmentType: emp.employmentType || 'FULL_TIME',
          status: emp.status || 'ACTIVE',
          joiningDate: emp.joiningDate || '',
          workType: emp.workType || 'ON_SITE',
          shift: emp.shift || 'GENERAL',
          shiftId: (emp as any).shiftId || '',
          identification: {
            idType: emp.identification?.idType || 'National ID',
            idNumber: emp.identification?.idNumber || emp.nationalId || '',
            issueDate: emp.identification?.issueDate || '',
            expiryDate: emp.identification?.expiryDate || '',
          },
          payrollInfo: {
            bankName: emp.payrollInfo?.bankName || '',
            accountNumber: emp.payrollInfo?.accountNumber || '',
            accountHolderName: emp.payrollInfo?.accountHolderName || '',
            paymentMethod: emp.payrollInfo?.paymentMethod || 'DIRECT_DEPOSIT',
            routingNumber: emp.payrollInfo?.routingNumber || '',
            swiftCode: emp.payrollInfo?.swiftCode || '',
            ifscCode: emp.payrollInfo?.ifscCode || '',
          },
        });
      } catch {
        toast.error('Could not load employee for editing.', 'Load Failed');
        navigate('/employees');
      }
    }
    loadData();
  }, [id, navigate, toast]);

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const res = await employeesApi.generateEmployeeCode();
      handleChange('employeeCode', res.employeeCode);
      toast.success(`Generated ID: ${res.employeeCode}`, 'ID Assigned');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate employee ID');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!formData.firstName.trim()) {
      toast.error('First name is required to generate organization email.', 'Name Required');
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

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      currentAddress: { ...prev.currentAddress, [field]: value },
    }));
  };

  const handleIdentificationChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      identification: { ...prev.identification, [field]: value },
    }));
  };

  const handlePayrollChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      payrollInfo: { ...prev.payrollInfo, [field]: value },
    }));
  };

  const handleEmergencyContactChange = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const list = [...prev.emergencyContacts];
      list[index] = { ...list[index], [field]: value };
      return { ...prev, emergencyContacts: list };
    });
  };

  const handleSetPrimaryEmergencyContact = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((c, i) => ({
        ...c,
        isPrimary: i === index,
      })),
    }));
  };

  const handleAddEmergencyContact = () => {
    if (formData.emergencyContacts.length >= 3) {
      toast.error('A maximum of 3 emergency contacts can be configured.', 'Limit Reached');
      return;
    }
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
          isPrimary: prev.emergencyContacts.length === 0,
        },
      ],
    }));
  };

  const handleRemoveEmergencyContact = (index: number) => {
    setFormData((prev) => {
      const list = prev.emergencyContacts.filter((_, i) => i !== index);
      if (list.length > 0 && !list.some((c) => c.isPrimary)) {
        list[0].isPrimary = true;
      }
      return { ...prev, emergencyContacts: list };
    });
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP).', 'Invalid File');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file size cannot exceed 5MB.', 'File Too Large');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await employeesApi.uploadAvatar(id, file);
      setFormData((prev) => ({ ...prev, avatarUrl: res.avatarUrl }));
      setEmployee((prev) => (prev ? { ...prev, avatarUrl: res.avatarUrl } : null));
      toast.success('Profile photo updated successfully.', 'Photo Updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload photo.', 'Upload Error');
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.workEmail.trim()) {
      errors.workEmail = 'Work email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.workEmail.trim())) {
      errors.workEmail = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSaving(true);
    try {
      const updatePayload: any = {
        ...formData,
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
      };
      await employeesApi.updateEmployee(id, updatePayload);
      toast.success('Employee record saved successfully.', 'Profile Updated');
      navigate(`/employees/${id}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save changes.', 'Update Failed');
    } finally {
      setIsSaving(false);
    }
  };

  if (!employee) return null;

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/employees/${id}`)}
            className="p-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Edit Employee Profile
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              {employee.employeeCode} • {employee.displayName || `${employee.firstName} ${employee.lastName}`}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-6">
        {/* Profile Picture Change Card */}
        <div className="p-4 rounded-md border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30">
          <label className="text-[11px] font-bold tracking-wider uppercase text-slate-700 dark:text-slate-300 block mb-2">
            Profile Photo (Square Format)
          </label>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative group">
              <Avatar
                src={formData.avatarUrl || null}
                name={formData.displayName || `${formData.firstName} ${formData.lastName}`.trim()}
                size="xl"
                className="rounded-md border border-slate-300 dark:border-slate-700"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarFileSelect}
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
                      <span>{formData.avatarUrl ? 'Change Profile Photo' : 'Upload Profile Photo'}</span>
                    </>
                  )}
                </Button>
                {formData.avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, avatarUrl: '' }))}
                    className="text-xs text-rose-600 hover:text-rose-700 underline font-medium cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                You can change the profile photo at any time. Photo is formatted in square with rounded corners.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Personal Information */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Personal Information
          </h3>
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
              label="Preferred Name"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              placeholder="e.g. Mark Chen"
            />
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleChange('dateOfBirth', e.target.value)}
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
                { value: 'Unknown', label: 'Unknown / Not Provided' },
              ]}
            />
            <Input
              label="National ID / SSN / Tax ID"
              value={formData.nationalId}
              onChange={(e) => handleChange('nationalId', e.target.value)}
              placeholder="e.g. SSN-XXX-XX-1234 or National ID"
            />
            <Input
              label="Nationality"
              value={formData.nationality}
              onChange={(e) => handleChange('nationality', e.target.value)}
              placeholder="e.g. Canadian"
            />
            <Input
              label="Country of Birth"
              value={formData.countryOfBirth}
              onChange={(e) => handleChange('countryOfBirth', e.target.value)}
              placeholder="e.g. Canada"
            />
            <Input
              label="State / Province of Birth"
              value={formData.stateOfBirth}
              onChange={(e) => handleChange('stateOfBirth', e.target.value)}
              placeholder="e.g. Ontario / California"
            />
          </div>
        </div>

        {/* Section 2: Personal Contact */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Personal Contact Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Input
              label="Personal Email"
              type="email"
              value={formData.personalEmail}
              onChange={(e) => handleChange('personalEmail', e.target.value)}
              placeholder="e.g. marcus.chen@gmail.com"
            />
            <Input
              label="Personal Mobile Number"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="e.g. +91 98765 43210"
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
              placeholder="e.g. m.chen.backup@gmail.com"
            />
          </div>
        </div>

        {/* Section 3: Residential Address */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3">
            Residential Address
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Input
              label="Address Line 1"
              value={formData.currentAddress.addressLine1}
              onChange={(e) => handleAddressChange('addressLine1', e.target.value)}
              placeholder="e.g. 100 Market Street, Flat 4B"
            />
            <Input
              label="Address Line 2"
              value={formData.currentAddress.addressLine2}
              onChange={(e) => handleAddressChange('addressLine2', e.target.value)}
              placeholder="e.g. Near Tech Park, Landmark"
            />
            <Input
              label="City"
              value={formData.currentAddress.city}
              onChange={(e) => handleAddressChange('city', e.target.value)}
              placeholder="e.g. Bengaluru"
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
              placeholder="e.g. 560045"
            />
          </div>
        </div>

        {/* Section 4: Emergency Contacts (Master Data) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Emergency Contacts
              </h3>
              <p className="text-[11px] text-slate-400">
                One primary contact required. Configure up to 3 emergency contacts for employee master data.
              </p>
            </div>
            {formData.emergencyContacts.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEmergencyContact}
                className="text-xs cursor-pointer h-8"
              >
                + Add Emergency Contact
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {formData.emergencyContacts.map((contact, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-md border transition-colors ${
                  contact.isPrimary
                    ? 'border-[var(--primary)] bg-violet-50/20 dark:bg-violet-950/10'
                    : 'border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Contact #{idx + 1}
                    </span>
                    {contact.isPrimary ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--primary)] text-white">
                        ★ Primary Contact
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryEmergencyContact(idx)}
                        className="text-[10px] text-[var(--primary)] font-semibold hover:underline cursor-pointer"
                      >
                        Set as Primary
                      </button>
                    )}
                  </div>
                  {formData.emergencyContacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveEmergencyContact(idx)}
                      className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Input
                    label="Full Name"
                    value={contact.name}
                    onChange={(e) => handleEmergencyContactChange(idx, 'name', e.target.value)}
                    placeholder="e.g. Jane Smith"
                  />
                  <SelectField
                    label="Relationship"
                    value={contact.relationship}
                    onChange={(e) => handleEmergencyContactChange(idx, 'relationship', e.target.value)}
                    options={[
                      { value: 'Spouse', label: 'Spouse' },
                      { value: 'Parent', label: 'Parent' },
                      { value: 'Sibling', label: 'Sibling' },
                      { value: 'Child', label: 'Child' },
                      { value: 'Relative', label: 'Relative' },
                      { value: 'Friend', label: 'Friend' },
                      { value: 'Colleague', label: 'Colleague' },
                      { value: 'Other', label: 'Other' },
                    ]}
                  />
                  <Input
                    label="Primary Phone"
                    value={contact.phone}
                    onChange={(e) => handleEmergencyContactChange(idx, 'phone', e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                  />
                  <Input
                    label="Alternate Phone"
                    value={contact.alternatePhone}
                    onChange={(e) => handleEmergencyContactChange(idx, 'alternatePhone', e.target.value)}
                    placeholder="e.g. +91 98765 11111"
                  />
                  <Input
                    label="Email Address"
                    type="email"
                    value={contact.email}
                    onChange={(e) => handleEmergencyContactChange(idx, 'email', e.target.value)}
                    placeholder="e.g. jane.smith@example.com"
                  />
                  <Input
                    label="Residential Address"
                    value={contact.address}
                    onChange={(e) => handleEmergencyContactChange(idx, 'address', e.target.value)}
                    placeholder="e.g. 42 Park Avenue, Bengaluru"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Employment & Organizational Assignment */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Employment &amp; Organizational Assignment
              </h3>
              <p className="text-[11px] text-slate-400">
                Official employee status, structural alignment, and corporate credentials
              </p>
            </div>
            {!isHrOrAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Lock className="h-3 w-3" />
                Managed by HR Administrator
              </span>
            )}
          </div>

          {!isHrOrAdmin && (
            <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300">
                <span className="font-semibold">Protected Organizational Attributes:</span> Organizational identity, job titles, departments, work email, and employee IDs are managed strictly by HR Administration. You may update your personal contact details, residential address, and profile photo.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Employee ID with Generate Button */}
            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1">
                Employee ID / Code
              </label>
              {isHrOrAdmin ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={formData.employeeCode}
                    onChange={(e) => handleChange('employeeCode', e.target.value)}
                    placeholder="e.g. EMP-00001"
                    className="uppercase font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCode}
                    disabled={isGeneratingCode}
                    className="shrink-0 h-9 px-3 flex items-center gap-1.5 text-xs cursor-pointer border-slate-300 dark:border-slate-700"
                    title="Generate next sequential Employee ID based on organization prefix"
                  >
                    {isGeneratingCode ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
                    )}
                    <span>Generate</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                  <span className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {formData.employeeCode || employee.employeeCode}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                  </span>
                </div>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                {isHrOrAdmin
                  ? 'Sequential code adhering to active Organization Prefix.'
                  : 'Assigned by HR Admin; cannot be edited by employee.'}
              </p>
            </div>

            {/* Employment Status */}
            <SelectField
              label="Employment Status"
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={EMPLOYMENT_STATUS_OPTIONS.map((s) => ({
                value: s.value,
                label: s.label,
              }))}
            />

            {/* Work Email */}
            {isHrOrAdmin ? (
              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1">
                  Work Email
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    required
                    type="email"
                    value={formData.workEmail}
                    onChange={(e) => handleChange('workEmail', e.target.value)}
                    placeholder="e.g. marcus.chen@company.com"
                    error={fieldErrors.workEmail}
                    className="lowercase font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateEmail}
                    disabled={isGeneratingEmail}
                    className="shrink-0 h-9 px-3 flex items-center gap-1.5 text-xs cursor-pointer border-slate-300 dark:border-slate-700"
                    title="Generate organization email based on employee name with duplicate check"
                  >
                    {isGeneratingEmail ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
                    )}
                    <span>Generate</span>
                  </Button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Official corporate email managed by IT/HR.</p>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1 block">
                  Work Email
                </label>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                  <span className="font-mono text-xs font-medium text-slate-800 dark:text-slate-200">
                    {formData.workEmail}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Official corporate email managed by IT/HR.</p>
              </div>
            )}

            {/* Joining Date */}
            <Input
              label="Joining Date"
              type="date"
              value={formData.joiningDate}
              onChange={(e) => handleChange('joiningDate', e.target.value)}
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
            />

            {/* Department */}
            <SelectField
              label="Department"
              value={formData.departmentId}
              onChange={(e) => handleChange('departmentId', e.target.value)}
              placeholder="Select Department..."
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={departments.map((d) => ({ value: d._id, label: d.name }))}
            />

            {/* Designation */}
            <SelectField
              label="Designation"
              value={formData.designationId}
              onChange={(e) => handleChange('designationId', e.target.value)}
              placeholder="Select Designation..."
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={designations.map((d) => ({ value: d._id, label: `${d.title} (Grade ${d.grade})` }))}
            />

            {/* Location */}
            <SelectField
              label="Location"
              value={formData.locationId}
              onChange={(e) => handleChange('locationId', e.target.value)}
              placeholder="Select Location..."
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={locations.map((l) => ({ value: l._id, label: `${l.name} (${l.city})` }))}
            />

            {/* Cost Center */}
            {isHrOrAdmin ? (
              <SelectField
                label="Cost Center"
                value={formData.costCenterId}
                onChange={(e) => handleChange('costCenterId', e.target.value)}
                placeholder="Select Cost Center (Optional)..."
                options={[
                  { value: '', label: 'None / Corporate Overhead' },
                  ...costCenters.map((c) => ({
                    value: c._id,
                    label: `${c.name} (${c.code})`,
                  })),
                ]}
              />
            ) : (
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1 block">
                  Cost Center
                </label>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {costCenters.find((c) => c._id === formData.costCenterId)
                      ? `${costCenters.find((c) => c._id === formData.costCenterId)?.name} (${costCenters.find((c) => c._id === formData.costCenterId)?.code})`
                      : employee?.costCenter
                      ? `${employee.costCenter.name} (${employee.costCenter.code})`
                      : 'None / Corporate Overhead'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Financial budget ledger allocation managed by HR.</p>
              </div>
            )}

            {/* Direct Reporting Manager */}
            {isHrOrAdmin ? (
              <SelectField
                label="Direct Reporting Manager"
                value={formData.managerId}
                onChange={(e) => handleChange('managerId', e.target.value)}
                placeholder="None (Reports to Executive / Board)"
                options={[
                  { value: '', label: 'None (Reports to Executive / Board)' },
                  ...potentialManagers.map((m) => ({
                    value: m._id,
                    label: `${m.displayName || `${m.firstName} ${m.lastName}`} (${m.employeeCode})`,
                  })),
                ]}
              />
            ) : (
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1 block">
                  Direct Reporting Manager
                </label>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {employee?.manager
                      ? `${employee.manager.displayName || `${employee.manager.firstName} ${employee.manager.lastName}`} (${employee.manager.employeeCode})`
                      : 'None (Reports to Executive / Board)'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Supervisory reporting alignment managed by HR.</p>
              </div>
            )}

            {/* Reporting HR */}
            {isHrOrAdmin ? (
              <SelectField
                label="Reporting HR"
                value={formData.hrId}
                onChange={(e) => handleChange('hrId', e.target.value)}
                placeholder="None (No dedicated HR contact)"
                helperText="Day-to-day HR contact shown on the employee dashboard."
                options={[
                  { value: '', label: 'None (No dedicated HR contact)' },
                  ...potentialManagers.map((m) => ({
                    value: m._id,
                    label: `${m.displayName || `${m.firstName} ${m.lastName}`} (${m.employeeCode})`,
                  })),
                ]}
              />
            ) : (
              <div>
                <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1 block">
                  Reporting HR
                </label>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md">
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {employee?.hr
                      ? `${employee.hr.displayName || `${employee.hr.firstName} ${employee.hr.lastName}`} (${employee.hr.employeeCode})`
                      : 'None (No dedicated HR contact)'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Lock className="h-2.5 w-2.5" />
                    Locked
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">HR contact assignment managed by HR.</p>
              </div>
            )}

            {/* Employment Type */}
            <SelectField
              label="Employment Type"
              value={formData.employmentType}
              onChange={(e) => handleChange('employmentType', e.target.value)}
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={EMPLOYMENT_TYPE_OPTIONS.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />

            {/* Work Type */}
            <SelectField
              label="Work Arrangement / Type"
              value={formData.workType}
              onChange={(e) => handleChange('workType', e.target.value)}
              disabled={!isHrOrAdmin}
              helperText={!isHrOrAdmin ? 'Managed by HR Administrator' : undefined}
              options={[
                { value: 'ON_SITE', label: 'On-site' },
                { value: 'REMOTE', label: 'Remote' },
                { value: 'HYBRID', label: 'Hybrid' },
              ]}
            />

            {/* Shift Schedule (master) */}
            <SelectField
              label="Work Shift"
              value={formData.shiftId}
              onChange={(e) => handleChange('shiftId', e.target.value)}
              disabled={!isHrOrAdmin}
              placeholder={shifts.length === 0 ? 'No shifts configured…' : 'Select Shift…'}
              helperText={
                isHrOrAdmin
                  ? shifts.find((s) => s._id === formData.shiftId)
                    ? (() => {
                        const s = shifts.find((x) => x._id === formData.shiftId)!;
                        return `${s.startTime} – ${s.endTime} · grace ${s.graceMinutes}m`;
                      })()
                    : 'Drives late / early / overtime flags'
                  : (employee as any)?.shiftSchedule
                    ? `${(employee as any).shiftSchedule.name} (${(employee as any).shiftSchedule.startTime} – ${(employee as any).shiftSchedule.endTime}) · Managed by HR`
                    : 'Managed by HR Administrator'
              }
              options={shifts.map((s) => ({
                value: s._id,
                label: `${s.name} (${s.startTime} – ${s.endTime})`,
              }))}
            />
          </div>
        </div>

        {/* Section 4: Personal Contact Information (Always Editable) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Personal Contact Details
            </h3>
            <p className="text-[11px] text-slate-400">
              Direct personal communication channels maintained by the employee
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input
              label="Personal Email"
              type="email"
              value={formData.personalEmail}
              onChange={(e) => handleChange('personalEmail', e.target.value)}
              placeholder="e.g. marcus.chen@gmail.com"
            />
            <Input
              label="Phone Number"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="e.g. +1 (555) 019-2834"
            />
          </div>
        </div>

        {/* Section 5: Identification & Statutory Compliance (HR Controlled) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Identification &amp; Statutory Compliance
              </h3>
              <p className="text-[11px] text-slate-400">
                Government-issued identification credentials and expiration dates
              </p>
            </div>
            {!isHrOrAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Lock className="h-3 w-3" />
                HR Managed
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {isHrOrAdmin ? (
              <>
                <SelectField
                  label="ID Document Type"
                  value={formData.identification.idType || 'National ID'}
                  onChange={(e) => handleIdentificationChange('idType', e.target.value)}
                  options={[
                    { value: 'National ID', label: 'National ID / Tax ID' },
                    { value: 'Passport', label: 'Passport' },
                    { value: 'Driving License', label: 'Driving License' },
                    { value: 'SSN', label: 'Social Security Number (SSN)' },
                    { value: 'Aadhaar / PAN', label: 'Aadhaar / PAN Card' },
                    { value: 'Work Permit', label: 'Work Permit / Visa' },
                  ]}
                />
                <Input
                  label="ID Document Number"
                  value={formData.identification.idNumber || ''}
                  onChange={(e) => handleIdentificationChange('idNumber', e.target.value)}
                  placeholder="e.g. A12345678"
                  className="font-mono"
                />
                <Input
                  label="Document Expiry Date"
                  type="date"
                  value={formData.identification.expiryDate || ''}
                  onChange={(e) => handleIdentificationChange('expiryDate', e.target.value)}
                />
              </>
            ) : (
              <>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">ID Document Type</span>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {formData.identification.idType || 'National ID'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">ID Number</span>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {formData.identification.idNumber ? `•••• ${formData.identification.idNumber.slice(-4)}` : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">Expiry Date</span>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {formData.identification.expiryDate || 'No Expiry'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 6: Payroll & Payment Information (HR Controlled) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Payroll &amp; Payment Information
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct salary disbursement accounts and institutional routing codes
              </p>
            </div>
            {!isHrOrAdmin && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                <Lock className="h-3 w-3" />
                HR Managed
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {isHrOrAdmin ? (
              <>
                <Input
                  label="Bank Name"
                  value={formData.payrollInfo.bankName || ''}
                  onChange={(e) => handlePayrollChange('bankName', e.target.value)}
                  placeholder="e.g. JPMorgan Chase / HDFC"
                />
                <Input
                  label="Account Number"
                  value={formData.payrollInfo.accountNumber || ''}
                  onChange={(e) => handlePayrollChange('accountNumber', e.target.value)}
                  placeholder="e.g. 1234567890"
                  className="font-mono"
                />
                <Input
                  label="Account Holder Name"
                  value={formData.payrollInfo.accountHolderName || ''}
                  onChange={(e) => handlePayrollChange('accountHolderName', e.target.value)}
                  placeholder="e.g. Marcus Chen"
                />
                <SelectField
                  label="Payment Method"
                  value={formData.payrollInfo.paymentMethod || 'DIRECT_DEPOSIT'}
                  onChange={(e) => handlePayrollChange('paymentMethod', e.target.value)}
                  options={[
                    { value: 'DIRECT_DEPOSIT', label: 'Direct Deposit / Bank Transfer' },
                    { value: 'WIRE_TRANSFER', label: 'Wire Transfer' },
                    { value: 'CHECK', label: 'Paper Check' },
                    { value: 'CASH', label: 'Cash' },
                  ]}
                />
                <Input
                  label="IFSC / Routing / Swift Code"
                  value={formData.payrollInfo.ifscCode || formData.payrollInfo.routingNumber || ''}
                  onChange={(e) => handlePayrollChange('ifscCode', e.target.value)}
                  placeholder="e.g. CHASUS33 / HDFC0001234"
                  className="font-mono uppercase"
                />
              </>
            ) : (
              <>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">Bank Name</span>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {formData.payrollInfo.bankName || 'Not configured'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">Account Number</span>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {formData.payrollInfo.accountNumber ? `•••• •••• ${formData.payrollInfo.accountNumber.slice(-4)}` : '—'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">Account Holder</span>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {formData.payrollInfo.accountHolderName || formData.displayName || `${formData.firstName} ${formData.lastName}`}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 block mb-1">Payment Method</span>
                  <div className="px-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {formData.payrollInfo.paymentMethod ? formData.payrollInfo.paymentMethod.replace('_', ' ') : 'DIRECT DEPOSIT'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(`/employees/${id}`)}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSaving}
            className="flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
