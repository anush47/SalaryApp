# SalaryApp API Refactor Plan

This document provides a comprehensive guide to refactor other API routes in the SalaryApp using the established architecture patterns with full modularization across services, schemas, and types.

## 1. Architecture Overview

The new architecture follows a clean, modular pattern with clear separation of concerns:
- **Route Handlers**: Minimal code that uses middleware and calls services
- **Service Layer**: Business logic encapsulation in dedicated service files
- **Schema Layer**: Zod validation schemas in separate files
- **Type Layer**: Interface definitions in dedicated type files
- **Middleware System**: Authentication, authorization, error handling, response formatting
- **Frontend Integration**: Updated to handle new response structure

## 2. Implementation Template

### 2.1. Schema File Template (`src/app/lib/schemas/[entity]Schemas.ts`)

```typescript
import { z } from "zod";

// Define the schema for [entity] validation
export const entityCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  // Add other validation fields as needed
});

export const entityUpdateSchema = z.object({
  _id: z.string().min(1, "Entity ID is required"),
  name: z.string().min(1, "Entity name is required"),
  // Add other validation fields as needed
});

export const entityIdSchema = z.string().min(1, "Entity ID is required");
```

### 2.2. Type File Template (`src/app/lib/types/[entity]Types.ts`)

```typescript
// Common type definitions for [entity] entities

export interface Entity {
  _id: string;
  id: string;
  name: string;
  // Add other fields as needed
  createdAt: Date;
  updatedAt: Date;
  [key: string]: any;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

### 2.3. Service File Template (`src/app/api/[entity]/service.ts`)

```typescript
import dbConnect from "@/app/lib/db";
import Entity from "@/app/models/Entity";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import {
  getPaginationParams,
  getTotalCount,
} from "@/app/lib/pagination";
import {
  entityCreateSchema,
  entityUpdateSchema,
  entityIdSchema
} from "@/app/lib/schemas/entitySchemas";

export class EntityService {
  static async getEntity(entityId: string, context: RequestContext) {
    await dbConnect();

    // Validate ID
    entityIdSchema.parse(entityId);

    // Validation and business logic
    const entity = await Entity.findById(entityId);
    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    // Add authorization checks if needed
    // await this.checkEntityAccess(entity, context);

    return entity;
  }

  static async getEntities(req: any, context: RequestContext) {
    await dbConnect();

    // Create filter based on user role
    const filter: any = {};
    if (context.user?.role !== "admin") {
      filter.user = context.user?.id;
    }

    // Get pagination params
    const { page, limit, skip } = getPaginationParams(req);

    // Fetch entities with pagination
    const entities = await Entity.find(filter)
      .populate('user', '-password') // Add populate as needed
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await getTotalCount(Entity, filter);

    return {
      data: entities,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      }
    };
  }

  static async createEntity(body: any, context: RequestContext) {
    await dbConnect();

    // Validate input
    const parsedBody = entityCreateSchema.parse(body);

    // Additional validation (e.g., permissions)
    // await this.validateEntityCreation(parsedBody, context);

    // Create new entity
    const newEntity = new Entity({
      ...parsedBody,
      user: context.user?.id, // Add user reference if needed
    });

    try {
      await newEntity.save();
    } catch (error) {
      // Handle duplicate key error or other specific errors
      if ((error as any).code === 11000) {
        throw new BadRequestError("Entity with this identifier already exists");
      }
      throw error;
    }

    return { message: "Entity created successfully", entityId: newEntity._id };
  }

  static async updateEntity(body: any, context: RequestContext) {
    await dbConnect();

    const entityId = body._id;
    const entityData = body;

    // Validate
    entityIdSchema.parse(entityId);
    const parsedData = entityUpdateSchema.parse(entityData);

    // Create filter
    const filter = { user: context.user?.id, _id: entityId };
    if (context.user?.role === "admin") {
      delete filter.user; // Admin can update any entity
    }

    // Find entity
    const entity = await Entity.findOne(filter);
    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    // Update entity
    const updatedEntity = await entity.updateOne(parsedData, { new: true, runValidators: true });
    if (!updatedEntity) {
      throw new NotFoundError("Entity update failed");
    }

    return { message: "Entity updated successfully", entity: updatedEntity };
  }

  static async deleteEntity(body: any, context: RequestContext) {
    await dbConnect();

    const entityId = body.id;
    entityIdSchema.parse(entityId);

    // Create filter
    const filter = { user: context.user?.id, _id: entityId };
    if (context.user?.role === "admin") {
      delete filter.user; // Admin can delete any entity
    }

    // Find entity
    const entity = await Entity.findOne(filter);
    if (!entity) {
      throw new NotFoundError("Entity not found");
    }

    // Delete entity
    await Entity.findByIdAndDelete(entityId);

    return { message: "Entity deleted successfully" };
  }
}
```

### 2.4. Route Handler Template (`src/app/api/[entity]/route.tsx`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { RequestContext } from "@/app/lib/apiResponse";
import { EntityService } from "./service";
import {
  entityCreateSchema,
  entityUpdateSchema,
  entityIdSchema
} from "@/app/lib/schemas/entitySchemas";
import { z } from "zod";

export async function GET(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const entityId = req.nextUrl.searchParams.get("entityId");

      if (entityId) {
        const entity = await EntityService.getEntity(entityId, context);
        return ApiResponseUtils.sendSuccess({ entity }, "Entity retrieved successfully");
      } else {
        const { data, pagination } = await EntityService.getEntities(req, context);
        return NextResponse.json({
          success: true,
          message: "Entities retrieved successfully",
          data,
          pagination,
          meta: {
            timestamp: new Date().toISOString(),
            executionTime: Date.now() - context.startTime,
            requestId: context.requestId,
          },
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}
```

export async function POST(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await EntityService.createEntity(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}

export async function PUT(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await EntityService.updateEntity(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}

export async function DELETE(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const body = await req.json();
      const result = await EntityService.deleteEntity(body, context);
      return ApiResponseUtils.sendSuccess(result, result.message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return ApiResponseUtils.sendBadRequest(error.errors[0].message);
      }
      throw error; // Let the middleware handle the error
    }
  });
}
```

### 2.3. Frontend Component Template Update

Update fetch functions to handle new response structure:

```typescript
const fetchEntities = async (
  page: number,
  limit: number
): Promise<PaginatedResponse> => {
  const response = await fetch(
    `/api/entities?page=${page}&limit=${limit}`
  );
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
  }
  const data = await response.json();

  // Handle the new API response structure
  if (data.success) {
    const responseEntities = data.data?.data || data.data || data.entities || [];
    const paginationData = data.data?.pagination || data.pagination;

    return {
      data: responseEntities.map((entity: any) => ({
        ...entity,
        id: entity._id,
      })),
      pagination: {
        page: paginationData?.page || 1,
        limit: paginationData?.limit || limit,
        total: paginationData?.total || (responseEntities ? responseEntities.length : 0),
        totalPages: paginationData?.totalPages || 0,
        hasNextPage: (paginationData?.page || 1) < (paginationData?.totalPages || 0),
        hasPrevPage: (paginationData?.page || 1) > 1,
      },
    };
  } else {
    throw new Error(data.error?.message || "Failed to fetch entities");
  }
};
```

Update mutation functions:

```typescript
const updateEntityMutation = useMutation({
  mutationFn: async (newEntity: any) => {
    const response = await fetch("/api/entities", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newEntity),
    });
    const result = await response.json();
    
    if (!response.ok) {
      const errorMessage = result.error?.message || result.message || "Failed to update entity";
      throw new Error(errorMessage);
    }
    
    // Handle the new API response structure
    if (result.success) {
      return result;
    } else {
      const errorMessage = result.error?.message || "Failed to update entity";
      throw new Error(errorMessage);
    }
  },
  onSuccess: (data: any) => {
    queryClient.invalidateQueries({ queryKey: ["entities"] });
    showSnackbar({
      message: data?.message || "Entity updated successfully!",
      severity: "success",
    });
  },
  onError: (err) => {
    showSnackbar({ message: err.message, severity: "error" });
  },
});
```

## 3. Migration Steps

### Step 1: Create Schema File
- Create `src/app/lib/schemas/[entity]Schemas.ts`
- Define Zod validation schemas (create, update, id validation)
- Export all schemas for use in service files

### Step 2: Create Type File
- Create `src/app/lib/types/[entity]Types.ts`
- Define TypeScript interfaces for entity and paginated responses
- Export common types for use across the application

### Step 3: Create Service File
- Create `src/app/api/[entity]/service.ts`
- Import schemas and types from their respective files
- Create service methods with proper error handling
- Include business logic and validation

### Step 4: Update Route File
- Replace existing route file with minimal handler
- Use middleware for authentication and authorization
- Call service methods
- Return consistent responses using ApiResponseUtils

### Step 5: Update Frontend Components
- Update fetch functions to handle new response structure
- Update mutation functions to handle new response format
- Ensure navigation and display logic works with new structure
- Add proper error handling

### Step 6: Test Thoroughly
- Test all CRUD operations
- Verify authentication and authorization work correctly
- Check error handling
- Ensure frontend displays data correctly
- Test pagination if applicable

## 4. Routes to Refactor

### High Priority:
- `src/app/api/leave-requests/route.tsx`
- `src/app/api/leave-types/route.tsx`
- `src/app/api/salaries/route.tsx`

### Medium Priority:
- `src/app/api/departments/route.tsx`
- `src/app/api/payments/route.tsx`
- `src/app/api/tax-configuration/route.tsx`

### Low Priority:
- `src/app/api/users/route.tsx`
- `src/app/api/calendar/holidays/route.tsx`
- All other routes in `src/app/api/`

## 5. Frontend Components to Update

For each route, update corresponding frontend components:

- Data grid components (e.g., `employeesDataGrid.tsx`)
- Add/Edit forms (e.g., `AddEmployee.tsx`, `EditEmployee.tsx`)
- API call functions in all relevant components
- Any component that calls the API endpoints

## 6. Testing Checklist

Before deployment, ensure:

- [ ] All CRUD operations work correctly
- [ ] Authentication is enforced properly
- [ ] Authorization rules are working
- [ ] Validation errors are handled properly
- [ ] Frontend displays success/error messages
- [ ] Pagination works if applicable
- [ ] Navigation links work correctly
- [ ] All existing functionality is preserved
- [ ] Error states are properly handled
- [ ] Performance is maintained or improved
- [ ] Schema validation works as expected
- [ ] Service layer methods handle edge cases properly
- [ ] Response structure is consistent across all endpoints
- [ ] Type safety is maintained throughout the application

## 7. Benefits of Refactoring

- **Modular Architecture**: Fully separated concerns with dedicated files for schemas, types, services, and routes
- **Consistent API Response Structure**: All endpoints follow the same format with success, data, message, error, and meta fields
- **Enhanced Type Safety**: Proper TypeScript interfaces and Zod schema validation
- **Separation of Concerns**: Clear separation between route handling, business logic, validation, and type definitions
- **Centralized Authentication and Authorization**: Consistent middleware implementation
- **Improved Error Handling and Logging**: Standardized approach across all endpoints
- **Better Maintainability and Testability**: Modular components are easier to maintain and test
- **Scalable Architecture**: Foundation for future development with consistent patterns
- **Reduced Code Duplication**: Shared schemas and types eliminate redundancy
- **Enhanced Developer Experience**: Clear file structure and predictable patterns