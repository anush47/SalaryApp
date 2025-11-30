# SalaryApp API Refactor Plan

This document provides a step-by-step guide to refactor other API routes in the SalaryApp using the same architecture patterns implemented for employees and companies.

## 1. Architecture Overview

The new architecture separates concerns into:
- **Route Handlers**: Minimal code that uses middleware and calls services
- **Service Layer**: Business logic encapsulation
- **Middleware System**: Authentication, authorization, error handling, response formatting
- **Frontend Integration**: Updated to handle new response structure

## 2. Implementation Template

### 2.1. Service File Template (`src/app/api/[entity]/service.ts`)

```typescript
import dbConnect from "@/app/lib/db";
import Entity from "@/app/models/Entity";
import { BadRequestError, NotFoundError, ForbiddenError } from "@/app/lib/errorHandler";
import { RequestContext } from "@/app/lib/apiResponse";
import {
  getPaginationParams,
  createPaginatedResponse,
  getTotalCount,
} from "@/app/lib/pagination";
import { z } from "zod";

// Define validation schemas
export const entityCreateSchema = z.object({
  // Define your validation schema
});

export const entityUpdateSchema = z.object({
  // Define your validation schema
});

const entityIdSchema = z.string().min(1, "Entity ID is required");

export class EntityService {
  static async getEntity(entityId: string, context: RequestContext) {
    await dbConnect();
    
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
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await getTotalCount(Entity, filter);

    return { page, limit, total, entities };
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
    const updatedEntity = await entity.updateOne(parsedData);
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

### 2.2. Route Handler Template (`src/app/api/[entity]/route.tsx`)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { ApiMiddleware } from "@/app/lib/apiMiddleware";
import { ApiResponseUtils } from "@/app/lib/apiResponseUtils";
import { RequestContext } from "@/app/lib/apiResponse";
import { EntityService } from "./service";
import { entityCreateSchema, entityUpdateSchema } from "./service";
import { z } from "zod";

const entityIdSchema = z.string().min(1, "Entity ID is required");

export async function GET(req: NextRequest) {
  return ApiMiddleware.authenticated(req, async (req, context) => {
    try {
      const entityId = req.nextUrl.searchParams.get("entityId");
      
      if (entityId) {
        const entity = await EntityService.getEntity(entityId, context);
        return ApiResponseUtils.sendSuccess({ entity }, "Entity retrieved successfully");
      } else {
        const { page, limit, total, entities } = await EntityService.getEntities(req, context);
        const response = { page, limit, total, data: entities };
        return NextResponse.json({
          success: true,
          message: "Entities retrieved successfully",
          ...response,
          entities: response.data,
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

### Step 1: Create Service File
- Create `src/app/api/[entity]/service.ts`
- Define Zod validation schemas
- Create service methods with proper error handling
- Include business logic and validation

### Step 2: Update Route File
- Replace existing route file with minimal handler
- Use middleware for authentication and authorization
- Call service methods
- Return consistent responses using ApiResponseUtils

### Step 3: Update Frontend Components
- Update fetch functions to handle new response structure
- Update mutation functions to handle new response format
- Ensure navigation and display logic works with new structure
- Add proper error handling

### Step 4: Test Thoroughly
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

## 7. Benefits of Refactoring

- Consistent API response structure across all endpoints
- Separation of concerns (business logic vs route handling)
- Centralized authentication and authorization
- Improved error handling and logging
- Better maintainability and testability
- Scalable architecture for future development