# PeopleOS — UI Inventory: Pages, Components, Utilities & Hooks

---

## 1. UI Pages List (By Domain & Portal)

### 1.1 Authentication & Onboarding Pages
- `LoginPage`
- `ForgotPasswordPage`
- `ResetPasswordPage`
- `AcceptInvitePage`
- `TwoFactorVerifyPage`
- `LockoutPage`
- `EmployeeSelfOnboardingPage`

### 1.2 Employee Self-Service (ESS) Portal Pages
- `EmployeeDashboardPage`
- `MyProfilePage`
- `MyAttendancePage`
- `MyLeavePage`
- `MyLeaveApplyPage`
- `MyRegularizationPage`
- `MyDocumentsPage`
- `MyRequestsPage`
- `MyApprovalsPage`
- `MyExpensesPage`
- `MyGoalsPage`
- `MyPerformanceReviewPage`
- `MyTrainingPage`
- `MyPayslipsPage`
- `CompanyDirectoryPage`
- `HolidayCalendarPage`
- `CompanyPoliciesPage`
- `AnnouncementsFeedPage`

### 1.3 Manager Portal Pages
- `ManagerDashboardPage`
- `TeamMembersPage`
- `TeamMemberDetailPage`
- `TeamAttendancePage`
- `TeamLeaveCalendarPage`
- `TeamApprovalsInboxPage`
- `TeamRegularizationApprovalsPage`
- `TeamProbationReviewsPage`
- `TeamPerformanceCyclesPage`
- `TeamExpensesApprovalsPage`
- `OneOnOneMeetingsPage`

### 1.4 HR Operations & Administration Pages
- `HRDashboardPage`
- `EmployeeDirectoryAdminPage`
- `EmployeeCreatePage`
- `EmployeeDetailPage`
- `EmployeeEditPage`
- `EmployeeLifecyclePage`
- `OnboardingTrackerPage`
- `ProbationTrackerPage`
- `PromotionsTransfersPage`
- `ExitManagementPage`
- `AttendanceDailyViewPage`
- `AttendanceMonthlyReportPage`
- `AttendanceRegularizationAdminPage`
- `ShiftManagementPage`
- `ShiftRosterPage`
- `LeaveApplicationsAdminPage`
- `LeaveBalancesPage`
- `LeavePoliciesPage`
- `LeaveTypesPage`
- `HolidayManagementPage`
- `OrganizationProfilePage`
- `DepartmentsPage`
- `DepartmentTreePage`
- `DesignationsPage`
- `LocationsPage`
- `CostCentersPage`
- `CompanyPoliciesAdminPage`
- `HRCaseListPage`
- `HRCaseDetailPage`

### 1.5 Talent, Recruitment & Performance Pages
- `PerformanceCyclesPage`
- `GoalSettingPage`
- `ReviewCyclesPage`
- `AppraisalCalibrationPage`
- `JobRequisitionsPage`
- `JobPositionsPage`
- `CandidatePipelinePage`
- `CandidateDetailPage`
- `InterviewSchedulingPage`
- `OfferManagementPage`
- `SkillsMatrixPage`
- `CompetenciesPage`
- `CourseCatalogPage`
- `TrainingAssignmentsPage`

### 1.6 Compensation, Expenses & Engagement Pages
- `SalaryStructuresPage`
- `CompensationBandsPage`
- `IncrementCyclesPage`
- `ExpenseClaimsAdminPage`
- `ExpenseCategoriesPage`
- `SurveysListPage`
- `SurveyBuilderPage`
- `SurveyResultsPage`
- `RecognitionFeedPage`

### 1.7 System Administration, Security & Analytics Pages
- `UsersListPage`
- `RolesPermissionsPage`
- `RoleCreateEditPage`
- `SecuritySettingsPage`
- `AuditLogsPage`
- `LoginHistoryPage`
- `ReportBuilderPage`
- `StandardReportsPage`
- `ExecutiveAnalyticsDashboardPage`
- `WorkflowDefinitionsPage`
- `WorkflowBuilderPage`
- `WorkflowExecutionLogsPage`
- `IntegrationsHubPage`
- `ApiKeyManagementPage`
- `TenantSettingsPage`

### 1.8 Error & Utility Pages
- `NotFound404Page`
- `Forbidden403Page`
- `ServerError500Page`
- `MaintenancePage`
- `UserProfileSettingsPage`
- `NotificationCenterPage`

---

## 2. Common UI Components

### 2.1 Layout & Navigation Components
- `AppShell`
- `Sidebar`
- `SidebarItem`
- `SidebarSubmenu`
- `Header`
- `Navbar`
- `Breadcrumbs`
- `PageHeader`
- `PageContainer`
- `ContentCard`
- `Footer`
- `UserMenuDropdown`
- `TenantSwitcher`
- `NotificationBell`
- `NotificationPopover`

### 2.2 Form & Input Components
- `Button`
- `IconButton`
- `ButtonGroup`
- `TextInput`
- `PasswordInput`
- `SearchInput`
- `NumberInput`
- `Textarea`
- `Select`
- `MultiSelect`
- `Combobox`
- `DatePicker`
- `DateRangePicker`
- `TimePicker`
- `Checkbox`
- `CheckboxGroup`
- `RadioGroup`
- `RadioItem`
- `Switch`
- `Toggle`
- `FileInput`
- `FileDropzone`
- `AvatarUpload`
- `ColorPicker`
- `Slider`
- `FormItem`
- `FormLabel`
- `FormHelperText`
- `FormErrorMessage`

### 2.3 Data Display & Presentation Components
- `DataTable`
- `DataTableRow`
- `DataTableCell`
- `TableHeader`
- `TableSortIndicator`
- `Pagination`
- `PaginationInfo`
- `ItemsPerPageSelect`
- `Badge`
- `StatusPill`
- `Tag`
- `Avatar`
- `AvatarGroup`
- `Tooltip`
- `Popover`
- `Accordion`
- `AccordionItem`
- `Tabs`
- `TabList`
- `TabItem`
- `TabPanel`
- `StatisticCard`
- `MetricWidget`
- `Timeline`
- `TimelineItem`
- `TreeView`
- `OrgChartNode`
- `CalendarGrid`
- `CalendarEventPill`
- `LeaveHeatmap`
- `ProgressBar`
- `CircularProgress`
- `EmptyState`
- `Divider`
- `Kbd`

### 2.4 Feedback, Modals & Overlay Components
- `Modal`
- `ModalHeader`
- `ModalBody`
- `ModalFooter`
- `ConfirmationDialog`
- `Drawer`
- `Alert`
- `Toast`
- `ToastContainer`
- `Skeleton`
- `SkeletonCard`
- `SkeletonTable`
- `SkeletonAvatar`
- `Spinner`
- `LoadingOverlay`
- `Backdrop`

### 2.5 Domain-Specific Custom Components
- `ClockInOutWidget`
- `WorkHoursProgressGauge`
- `LeaveBalanceCard`
- `LeaveBalanceSummaryBar`
- `ApprovalStatusBadge`
- `ApprovalActionButtons`
- `ApprovalChainStepper`
- `EmployeeLifecycleStepper`
- `EmployeeCard`
- `EmployeeSummaryHeader`
- `DocumentPreviewModal`
- `DocumentUploadCard`
- `PolicyAcknowledgmentModal`
- `ProbationRatingSelector`
- `QuickFilterBar`
- `FilterPill`
- `ExportDropdown`
- `PermissionMatrixTable`

---

## 3. Common Utility Functions

### 3.1 Date & Time Utils (`dateUtils.ts`)
- `formatDate`
- `formatTime`
- `formatDateTime`
- `formatRelativeTime`
- `formatDurationMinutes`
- `calculateWorkHours`
- `calculateOvertime`
- `isDateInPast`
- `isDateInFuture`
- `isToday`
- `isWeekend`
- `getDateRangeDays`
- `getDaysDifference`
- `getStartOfMonth`
- `getEndOfMonth`
- `getMonthCalendarDays`
- `addDays`
- `subtractDays`

### 3.2 String & Formatting Utils (`stringUtils.ts`)
- `capitalize`
- `capitalizeWords`
- `toKebabCase`
- `toCamelCase`
- `toSnakeCase`
- `truncateText`
- `slugify`
- `getInitials`
- `formatFullName`
- `formatEmployeeCode`
- `formatPhoneNumber`
- `maskSensitiveString`

### 3.3 Number, Currency & File Utils (`formatUtils.ts`)
- `formatCurrency`
- `formatNumber`
- `formatPercentage`
- `formatFileSize`
- `clampNumber`
- `roundToDecimal`

### 3.4 File & Download Utils (`fileUtils.ts`)
- `downloadFileFromBlob`
- `exportToCsv`
- `exportToJson`
- `getFileExtension`
- `getMimeType`
- `validateFileType`
- `validateFileSize`
- `convertFileToBase64`

### 3.5 Validation & Regex Utils (`validationUtils.ts`)
- `isValidEmail`
- `isValidPhoneNumber`
- `isValidPassword`
- `isValidUrl`
- `isValidObjectId`
- `isValidDateString`

### 3.6 Object & Array Utils (`collectionUtils.ts`)
- `groupBy`
- `sortByField`
- `deepClone`
- `pick`
- `omit`
- `flattenTree`
- `buildTree`
- `filterFuzzy`
- `uniqueBy`
- `paginateArray`

### 3.7 Storage & Session Utils (`storageUtils.ts`)
- `getLocalStorageItem`
- `setLocalStorageItem`
- `removeLocalStorageItem`
- `clearLocalStorage`
- `getSessionStorageItem`
- `setSessionStorageItem`
- `getCookie`
- `setCookie`
- `removeCookie`

### 3.8 RBAC & Auth Utils (`authUtils.ts`)
- `hasPermission`
- `hasAnyPermission`
- `hasAllPermissions`
- `hasRole`
- `isTokenExpired`
- `extractTokenPayload`

---

## 4. Custom React Hooks (`hooks/`)

### 4.1 Auth & Permission Hooks
- `useAuth`
- `useCurrentUser`
- `usePermissions`
- `useRequireAuth`
- `useRequireRole`
- `useLogout`
- `useRefreshToken`

### 4.2 Data Querying & Mutation Hooks
- `useEmployees`
- `useEmployeeDetail`
- `useCreateEmployee`
- `useUpdateEmployee`
- `useDepartments`
- `useDesignations`
- `useAttendance`
- `useClockInOut`
- `useRegularizations`
- `useLeaveBalances`
- `useLeaveRequests`
- `useApplyLeave`
- `useApprovalsInbox`
- `useApprovalAction`
- `useHolidays`
- `useCompanyPolicies`
- `useAuditLogs`

### 4.3 UI & Interaction Hooks
- `useDisclosure` (Modal / Drawer open, close, toggle)
- `usePagination`
- `useSorting`
- `useFilters`
- `useTableSelection`
- `useDebounce`
- `useThrottle`
- `useMediaQuery`
- `useOnClickOutside`
- `useClipboard`
- `useLocalStorage`
- `useTheme`
- `useToast`
- `useConfirmDialog`
- `useKeyPress`
- `useWindowSize`
- `useDocumentTitle`
- `useNetworkStatus`
- `useIdleTimer`
