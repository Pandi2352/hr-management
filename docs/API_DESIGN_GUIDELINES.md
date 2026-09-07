# PeopleOS — API Design & Contract Standards

This standard specifies the REST API design conventions, status codes, standard response envelopes, validation rules, authentication guards, and OpenAPI / Swagger contracts for **PeopleOS**.

---

## 1. Global REST API Conventions

### 1.1 Base URL & Versioning
All endpoints are versioned through the URI path:
```
https://api.peopleos.internal/api/v1/{resource}
```
- Minor/patch changes must preserve backward compatibility.
- Breaking schema modifications require incrementing the route prefix (e.g., `/api/v2/`).

### 1.2 Resource Naming Rules
- Use lowercase, plural nouns for collection resources:
  - `/api/v1/departments`
  - `/api/v1/employees`
  - `/api/v1/leave-requests`
- Use kebab-case for multi-word endpoints: `/api/v1/attendance-records/clock-in`
- Use nested sub-resources exclusively for child relationships:
  - `/api/v1/employees/{employeeId}/documents`
  - `/api/v1/departments/{departmentId}/teams`

---

## 2. Standard Response Envelopes

Every JSON response returned by the backend conforms to one of two standard envelopes.

### 2.1 Success Response (`ApiResponse<T>`)
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Employee record retrieved successfully",
  "data": {
    "id": "c7a8b4e0-7e1d-44cf-a82f-8a032ecbd832",
    "employeeCode": "EMP-00142",
    "firstName": "Jane",
    "lastName": "Doe",
    "workEmail": "jane.doe@company.com",
    "status": "ACTIVE"
  },
  "meta": {
    "timestamp": "2026-09-02T06:30:00.000Z"
  }
}
```

### 2.2 Paginated List Response (`PaginatedResponse<T>`)
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    { "id": "uuid-1", "name": "Engineering" },
    { "id": "uuid-2", "name": "Product Design" }
  ],
  "meta": {
    "total": 48,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false,
    "timestamp": "2026-09-02T06:30:00.000Z"
  }
}
```

### 2.3 Standard Error Response (RFC 7807 Aligned)
```json
{
  "success": false,
  "statusCode": 400,
  "errorCode": "VALIDATION_FAILED",
  "message": "Input validation failed on 2 fields",
  "errors": [
    {
      "field": "workEmail",
      "rule": "isEmail",
      "message": "workEmail must be an email"
    },
    {
      "field": "dateOfJoining",
      "rule": "isDateString",
      "message": "dateOfJoining must be a valid ISO-8601 date"
    }
  ],
  "timestamp": "2026-09-02T06:30:00.000Z",
  "path": "/api/v1/employees"
}
```

---

## 3. Standard HTTP Status Codes

| Code | Meaning | PeopleOS Usage Scenario |
| :--- | :--- | :--- |
| `200 OK` | Success | Standard `GET`, `PATCH`, or `PUT` completion. |
| `201 Created` | Created | Successful `POST` creating an entity (returns location / entity payload). |
| `204 No Content` | No Content | Successful `DELETE` operation where no body is returned. |
| `400 Bad Request` | Bad Request | Malformed JSON, unparseable UUID, or invalid parameters. |
| `401 Unauthorized` | Unauthorized | Missing, expired, or tampered JWT Bearer token. |
| `403 Forbidden` | Forbidden | Authenticated, but lacking required RBAC permission. |
| `404 Not Found` | Not Found | Entity ID does not exist within the requester's organization. |
| `409 Conflict` | Conflict | Unique constraint violation (e.g., email or employee code already exists). |
| `422 Unprocessable` | Domain Error | Syntactically valid, but violates business rule (e.g., negative leave balance). |
| `429 Too Many Req` | Rate Limited | Token bucket quota exceeded for IP / User. |
| `500 Internal Error`| Server Error | Unhandled server exception (logged with stack trace in internal logs). |

---

## 4. Query Parameters: Filtering, Sorting & Pagination

All collection endpoints support standardized query parameters:

| Parameter | Type | Default | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `integer` | `1` | Page number (1-indexed) | `?page=2` |
| `limit` | `integer` | `20` | Items per page (max: 100) | `?limit=50` |
| `search` | `string` | `null` | Global fuzzy search term across primary fields | `?search=doe` |
| `sortBy` | `string` | `createdAt` | Target column name for sorting | `?sortBy=dateOfJoining` |
| `sortOrder` | `string` | `DESC` | Sorting direction: `ASC` or `DESC` | `?sortOrder=ASC` |
| `filter[field]`| `string` | `null` | Exact match or range filters | `?status=ACTIVE&departmentId=uuid` |

---

## 5. Security & Authorization Decorators

In NestJS controllers, declare authentication and authorization using explicit guards and custom decorators:

```typescript
@ApiTags('Employees')
@Controller('api/v1/employees')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @RequirePermissions('employee:create')
  @ApiOperation({ summary: 'Create a new employee profile' })
  @ApiResponse({ status: 201, type: EmployeeResponseDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEmployeeDto,
  ): Promise<ApiResponse<EmployeeResponseDto>> {
    const employee = await this.employeesService.create(user.organizationId, user.id, dto);
    return ApiResponse.created(employee, 'Employee created successfully');
  }

  @Get(':id')
  @RequirePermissions('employee:read')
  @ApiOperation({ summary: 'Get employee details by ID' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<EmployeeResponseDto>> {
    const employee = await this.employeesService.findById(user.organizationId, id);
    return ApiResponse.ok(employee);
  }
}
```

---

## 6. Audit Log Interception

Endpoints that alter data (`POST`, `PATCH`, `PUT`, `DELETE`) are tagged with the `@Audit()` decorator to automatically extract and record before-and-after audit state:

```typescript
@Patch(':id/designation')
@RequirePermissions('employee:update')
@Audit({ action: 'UPDATE', resource: 'Employee', trackDiff: true })
async updateDesignation(
  @CurrentUser() user: AuthenticatedUser,
  @Param('id', ParseUUIDPipe) id: string,
  @Body() dto: UpdateDesignationDto,
) {
  return this.employeesService.updateDesignation(user.organizationId, id, dto, user.id);
}
```
