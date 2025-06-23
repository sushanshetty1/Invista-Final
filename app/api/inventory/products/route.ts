import { NextRequest } from 'next/server'
import {
  successResponse,
  errorResponse,
  handleError,
  checkRateLimit
} from '@/lib/api-utils'
import { authenticate } from '@/lib/auth'
import {
  productQuerySchema,
  createProductSchema,
  type ProductQueryInput,
  type CreateProductInput
} from '@/lib/validations/product'
import {
  getProducts,
  createProduct
} from '@/lib/actions/products'
import { supabaseClient } from '@/lib/db'

// Rate limiting: 100 requests per minute per IP
const RATE_LIMIT = 100
const RATE_WINDOW = 60 * 1000 // 1 minute

function getClientIdentifier(request: NextRequest): string {
  // Get client IP for rate limiting
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] :
    request.headers.get('x-real-ip') ||
    'unknown'
  return ip
}

// GET /api/inventory/products - List products with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const clientId = getClientIdentifier(request)
    if (!checkRateLimit(clientId, RATE_LIMIT, RATE_WINDOW)) {
      return errorResponse('Rate limit exceeded', 429)
    }

    // Parse and validate query parameters
    const { searchParams } = new URL(request.url)

    const queryInput: ProductQueryInput = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100), // Max 100 items      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      brandId: searchParams.get('brandId') || undefined,
      status: (searchParams.get('status') as 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED' | 'DRAFT') || undefined,
      sortBy: (searchParams.get('sortBy') as 'name' | 'sku' | 'createdAt' | 'updatedAt') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    }

    // Validate query parameters
    const validatedQuery = productQuerySchema.parse(queryInput)

    // Fetch products using server action
    const result = await getProducts(validatedQuery)

    if (!result.success) {
      return errorResponse(result.error!, 400)
    }

    return successResponse(
      result.data,
      result.message
    )

  } catch (error) {
    return handleError(error)
  }
}

// POST /api/inventory/products - Create new product
export async function POST(request: NextRequest) {
  try {
    // Rate limiting (stricter for write operations)
    const clientId = getClientIdentifier(request)
    if (!checkRateLimit(`${clientId}:write`, 20, RATE_WINDOW)) {
      return errorResponse('Rate limit exceeded for write operations', 429)
    }    // Parse request body
    const body = await request.json()

    // Authentication check
    const authResult = await authenticate(request)
    if (!authResult.success) {
      return errorResponse('Authentication required', 401)
    }

    const userId = authResult.user?.id
    if (!userId) {
      return errorResponse('User ID not found', 401)
    }

    // Get user's company from Supabase using Prisma client
    console.log('Looking up company for userId:', userId)

    try {
      const companyUser = await supabaseClient.companyUser.findFirst({
        where: {
          userId: userId,
          isActive: true
        },
        select: {
          companyId: true,
          role: true
        }
      })

      console.log('Company lookup result:', companyUser)

      if (!companyUser) {
        return errorResponse('User not associated with any company', 403)
      }

      // Prepare the input with all required fields
      const createInput: CreateProductInput = {
        ...body,
        createdBy: userId,
        companyId: companyUser.companyId // Add the companyId from lookup
      }      // Validate input
      const validatedInput = createProductSchema.parse(createInput)

      // Create product using server action
      const result = await createProduct(validatedInput)

      console.log('API route: createProduct result:', result)

      if (!result.success) {
        console.log('API route: Product creation failed with error:', result.error)
        return errorResponse(result.error!, 400)
      }

      return successResponse(
        result.data,
        result.message,
        undefined
      )
    } catch (companyLookupError) {
      console.error('Company lookup error:', companyLookupError)
      return errorResponse('Failed to lookup user company', 500)
    }

  } catch (error) {
    return handleError(error)
  }
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
