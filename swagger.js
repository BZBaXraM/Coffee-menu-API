const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'QR Menu API',
      version: '1.0.0',
      description: 'REST API for QR Menu restaurant system',
    },
    servers: [{ url: 'http://localhost:3000', description: 'Development' }],
    components: {
      securitySchemes: {
        AdminPassword: {
          type: 'apiKey',
          in: 'header',
          name: 'x-admin-password',
          description: 'Admin password (default: admin123)',
        },
      },
      schemas: {
        Category: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', description: 'JSON string with lang keys, e.g. {"en":"Salads","az":"Salatlar"}' },
            icon: { type: 'string', example: '🥗' },
            sort_order: { type: 'integer' },
            is_active: { type: 'integer', enum: [0, 1] },
          },
        },
        Dish: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            category_id: { type: 'integer' },
            name: { type: 'string', description: 'JSON string with lang keys' },
            description: { type: 'string', description: 'JSON string with lang keys' },
            ingredients: { type: 'string', description: 'JSON string with lang keys' },
            price: { type: 'number' },
            old_price: { type: 'number', nullable: true },
            weight: { type: 'integer', nullable: true },
            calories: { type: 'integer', nullable: true },
            protein: { type: 'number', nullable: true },
            fat: { type: 'number', nullable: true },
            carbs: { type: 'number', nullable: true },
            allergens: { type: 'string', description: 'JSON array string' },
            sizes: { type: 'string', description: 'JSON array of size variants, e.g. [{"label":"S","price":4},{"label":"M","price":5}]. Empty [] means no sizes; `price` then applies.' },
            image: { type: 'string', nullable: true },
            is_available: { type: 'integer', enum: [0, 1] },
            is_featured: { type: 'integer', enum: [0, 1] },
            spice_level: { type: 'integer', minimum: 0, maximum: 3 },
            is_vegetarian: { type: 'integer', enum: [0, 1] },
            is_vegan: { type: 'integer', enum: [0, 1] },
            sort_order: { type: 'integer' },
          },
        },
        Promotion: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string', description: 'JSON string with lang keys' },
            description: { type: 'string', nullable: true },
            discount_percent: { type: 'integer' },
            dish_ids: { type: 'string', description: 'JSON array of dish IDs' },
            category_id: { type: 'integer', nullable: true },
            image: { type: 'string', nullable: true },
            start_date: { type: 'string', format: 'date', nullable: true },
            end_date: { type: 'string', format: 'date', nullable: true },
            is_active: { type: 'integer', enum: [0, 1] },
            sort_order: { type: 'integer' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            items: { type: 'string', description: 'JSON array of cart items' },
            total: { type: 'number' },
            currency: { type: 'string', example: 'AZN' },
            table_number: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['new', 'preparing', 'ready', 'done'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        OkResponse: {
          type: 'object',
          properties: {
            ok: { type: 'boolean', example: true },
          },
        },

        // ── Driver Game Center (DGC) ──────────────────────────────────
        DgcCategory: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', description: 'JSON string with lang keys' },
            icon: { type: 'string', example: '🎮' },
            icon_type: { type: 'string', enum: ['svg', 'emoji', 'image'], default: 'svg' },
            icon_key: { type: 'string', nullable: true, description: 'Named SVG icon key' },
            icon_url: { type: 'string', nullable: true, description: 'Uploaded icon URL (Cloudinary or /uploads-dgc/...)' },
            scope: { type: 'string', enum: ['menu', 'cabinet', 'both'], default: 'menu', description: 'Where the category is visible: table menu, cabinet-only menu, or both' },
            sort_order: { type: 'integer' },
            is_active: { type: 'integer', enum: [0, 1] },
          },
        },
        DgcItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            category_id: { type: 'integer' },
            name: { type: 'string', description: 'JSON string with lang keys' },
            description: { type: 'string', nullable: true, description: 'JSON string with lang keys' },
            ingredients: { type: 'string', nullable: true, description: 'JSON string with lang keys' },
            price: { type: 'number' },
            old_price: { type: 'number', nullable: true },
            weight: { type: 'integer', nullable: true },
            calories: { type: 'integer', nullable: true },
            protein: { type: 'number', nullable: true },
            fat: { type: 'number', nullable: true },
            carbs: { type: 'number', nullable: true },
            allergens: { type: 'string', description: 'JSON array string' },
            sizes: { type: 'string', description: 'JSON array of {label, price} size variants. Empty [] means no sizes; `price` then applies.' },
            image: { type: 'string', nullable: true },
            scope: { type: 'string', enum: ['menu', 'cabinet', 'both'], default: 'both', description: 'cabinet-only items are hidden from the table menu' },
            is_hookah: { type: 'integer', enum: [0, 1] },
            is_available: { type: 'integer', enum: [0, 1] },
            is_featured: { type: 'integer', enum: [0, 1] },
            spice_level: { type: 'integer', minimum: 0, maximum: 3 },
            is_vegetarian: { type: 'integer', enum: [0, 1] },
            is_vegan: { type: 'integer', enum: [0, 1] },
            sort_order: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        DgcSet: {
          type: 'object',
          description: 'Ready-made cabinet combo (set of items, possibly with hookah)',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', description: 'JSON string with lang keys' },
            description: { type: 'string', nullable: true },
            price: { type: 'number' },
            old_price: { type: 'number', nullable: true },
            item_ids: { type: 'string', description: 'JSON array of item IDs included in the set' },
            includes_hookah: { type: 'integer', enum: [0, 1] },
            image: { type: 'string', nullable: true },
            is_active: { type: 'integer', enum: [0, 1] },
            sort_order: { type: 'integer' },
          },
        },
        DgcCabinet: {
          type: 'object',
          description: 'Private gaming room billed per hour. Public/list responses add live `elapsed_minutes` and `running_cost` fields.',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string', description: 'JSON string with lang keys' },
            description: { type: 'string', nullable: true },
            capacity: { type: 'integer', default: 4, description: 'Number of seats' },
            hourly_rate: { type: 'number', description: 'Price per started hour (AZN)' },
            image: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['open', 'closed'], default: 'closed' },
            opened_at: { type: 'string', format: 'date-time', nullable: true, description: 'When the current session started (null when closed)' },
            is_active: { type: 'integer', enum: [0, 1] },
            sort_order: { type: 'integer' },
            elapsed_minutes: { type: 'integer', description: 'Live: minutes since opened (0 when closed)' },
            running_cost: { type: 'number', description: 'Live: estimated cost so far, hours rounded up (0 when closed)' },
          },
        },
        DgcCabinetSession: {
          type: 'object',
          description: 'A completed cabinet rental, recorded on close',
          properties: {
            id: { type: 'integer' },
            cabinet_id: { type: 'integer' },
            opened_at: { type: 'string', format: 'date-time' },
            closed_at: { type: 'string', format: 'date-time', nullable: true },
            duration_minutes: { type: 'integer', nullable: true },
            hourly_rate: { type: 'number', nullable: true },
            cost: { type: 'number', nullable: true, description: 'hourly_rate × hours, hours rounded up' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        DgcPromotion: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string', description: 'JSON string with lang keys' },
            description: { type: 'string', nullable: true },
            discount_percent: { type: 'integer' },
            item_ids: { type: 'string', description: 'JSON array of item IDs' },
            category_id: { type: 'integer', nullable: true },
            image: { type: 'string', nullable: true },
            start_date: { type: 'string', format: 'date', nullable: true },
            end_date: { type: 'string', format: 'date', nullable: true },
            is_active: { type: 'integer', enum: [0, 1] },
            sort_order: { type: 'integer' },
          },
        },
        DgcOrder: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            items: { type: 'string', description: 'JSON array of cart items' },
            total: { type: 'number' },
            currency: { type: 'string', example: 'AZN' },
            table_number: { type: 'string', nullable: true },
            cabinet_id: { type: 'integer', nullable: true },
            customer_phone: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['new', 'preparing', 'ready', 'done', 'cancelled'] },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        DgcItemList: {
          type: 'object',
          description: 'Paginated list envelope',
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/DgcItem' } },
            total: { type: 'integer' },
            page: { type: 'integer' },
            totalPages: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
        DgcOrderList: {
          type: 'object',
          description: 'Paginated list envelope',
          properties: {
            items: { type: 'array', items: { $ref: '#/components/schemas/DgcOrder' } },
            total: { type: 'integer' },
            page: { type: 'integer' },
            totalPages: { type: 'integer' },
            limit: { type: 'integer' },
          },
        },
      },
    },
    tags: [
      { name: 'Menu', description: 'Public menu endpoints' },
      { name: 'Admin – Categories', description: 'Category management (requires auth)' },
      { name: 'Admin – Dishes', description: 'Dish management (requires auth)' },
      { name: 'Admin – Promotions', description: 'Promotion management (requires auth)' },
      { name: 'Admin – Orders', description: 'Order management (requires auth)' },
      { name: 'Orders', description: 'Place orders (public)' },
      { name: 'AI', description: 'AI chat & recommendations' },
      { name: 'Settings', description: 'Restaurant settings' },
      { name: 'DGC – Menu', description: 'Driver Game Center public menu (items, sets, promotions)' },
      { name: 'DGC – Cabinets', description: 'Driver Game Center cabinets (public, with live timer/cost)' },
      { name: 'DGC – Orders', description: 'Place Driver Game Center orders (public)' },
      { name: 'DGC – AI', description: 'Driver Game Center AI chat & recommendations' },
      { name: 'DGC – Settings', description: 'Driver Game Center settings & QR' },
      { name: 'DGC – Admin', description: 'Driver Game Center management (requires DGC admin password)' },
    ],
    paths: {
      // ── Menu ──────────────────────────────────────────────────────
      '/api/menu/categories': {
        get: {
          tags: ['Menu'],
          summary: 'Get active categories',
          responses: {
            200: {
              description: 'List of active categories',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } },
            },
          },
        },
      },
      '/api/menu/dishes': {
        get: {
          tags: ['Menu'],
          summary: 'Get available dishes',
          parameters: [
            { name: 'category_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by category' },
            { name: 'featured', in: 'query', schema: { type: 'string', enum: ['1'] }, description: 'Only featured dishes' },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search in name/description' },
          ],
          responses: {
            200: {
              description: 'List of dishes',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Dish' } } } },
            },
          },
        },
      },
      '/api/menu/dishes/{id}': {
        get: {
          tags: ['Menu'],
          summary: 'Get dish by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Dish object', content: { 'application/json': { schema: { $ref: '#/components/schemas/Dish' } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/menu/promotions': {
        get: {
          tags: ['Menu'],
          summary: 'Get active promotions',
          responses: {
            200: {
              description: 'List of active promotions',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Promotion' } } } },
            },
          },
        },
      },

      // ── Orders (public) ────────────────────────────────────────────
      '/api/orders': {
        post: {
          tags: ['Orders'],
          summary: 'Place a new order',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items', 'total'],
                  properties: {
                    items: { type: 'array', items: { type: 'object' }, description: 'Cart items array' },
                    total: { type: 'number' },
                    currency: { type: 'string', example: 'AZN' },
                    table_number: { type: 'string', nullable: true },
                    notes: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Created order ID', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } },
            400: { description: 'No items', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ── AI ─────────────────────────────────────────────────────────
      '/api/ai/chat': {
        post: {
          tags: ['AI'],
          summary: 'Chat with AI assistant',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: { type: 'string' },
                    language: { type: 'string', default: 'en', example: 'en' },
                    history: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          role: { type: 'string', enum: ['user', 'assistant'] },
                          content: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'AI reply',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      reply: { type: 'string' },
                      offline: { type: 'boolean', description: 'True when the AI service is unavailable' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/ai/recommend': {
        post: {
          tags: ['AI'],
          summary: 'Get dish recommendations based on cart',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cartItems: { type: 'array', items: { type: 'object' } },
                    language: { type: 'string', default: 'en' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Recommended dishes (up to 3)',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Dish' } } } },
            },
          },
        },
      },

      // ── Settings ───────────────────────────────────────────────────
      '/api/settings/public': {
        get: {
          tags: ['Settings'],
          summary: 'Get public restaurant settings',
          description: 'Returns subset of settings safe for public access (name, phone, hours, colors, etc.)',
          responses: {
            200: { description: 'Key-value settings object', content: { 'application/json': { schema: { type: 'object' } } } },
          },
        },
      },
      '/api/settings': {
        get: {
          tags: ['Settings'],
          summary: 'Get all settings (admin)',
          security: [{ AdminPassword: [] }],
          responses: {
            200: { description: 'All settings as key-value object', content: { 'application/json': { schema: { type: 'object' } } } },
            401: { description: 'Unauthorized' },
          },
        },
        put: {
          tags: ['Settings'],
          summary: 'Update settings (admin)',
          security: [{ AdminPassword: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', description: 'Key-value pairs to update' } } },
          },
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/settings/qrcode': {
        post: {
          tags: ['Settings'],
          summary: 'Generate QR code (admin)',
          security: [{ AdminPassword: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', description: 'Override menu URL' },
                    table: { type: 'string', description: 'Table number to append as ?table=' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'QR code as data URL',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      qr: { type: 'string', description: 'Base64 data URL (image/png)' },
                      url: { type: 'string' },
                    },
                  },
                },
              },
            },
            401: { description: 'Unauthorized' },
          },
        },
      },

      // ── Admin – Categories ─────────────────────────────────────────
      '/api/admin/categories': {
        get: {
          tags: ['Admin – Categories'],
          summary: 'List all categories',
          security: [{ AdminPassword: [] }],
          responses: {
            200: { description: 'All categories', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Category' } } } } },
          },
        },
        post: {
          tags: ['Admin – Categories'],
          summary: 'Create category',
          security: [{ AdminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string' },
                    icon: { type: 'string', example: '🍽️' },
                    sort_order: { type: 'integer', default: 0 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Created ID', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } },
          },
        },
      },
      '/api/admin/categories/{id}': {
        put: {
          tags: ['Admin – Categories'],
          summary: 'Update category',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } },
          },
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
        delete: {
          tags: ['Admin – Categories'],
          summary: 'Delete category',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
      },

      // ── Admin – Dishes ─────────────────────────────────────────────
      '/api/admin/dishes': {
        get: {
          tags: ['Admin – Dishes'],
          summary: 'List all dishes',
          security: [{ AdminPassword: [] }],
          responses: {
            200: { description: 'All dishes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Dish' } } } } },
          },
        },
        post: {
          tags: ['Admin – Dishes'],
          summary: 'Create dish (supports image upload)',
          security: [{ AdminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['category_id', 'name', 'price'],
                  properties: {
                    category_id: { type: 'integer' },
                    name: { type: 'string', description: 'JSON lang object' },
                    description: { type: 'string' },
                    ingredients: { type: 'string' },
                    price: { type: 'number' },
                    old_price: { type: 'number' },
                    weight: { type: 'integer' },
                    calories: { type: 'integer' },
                    protein: { type: 'number' },
                    fat: { type: 'number' },
                    carbs: { type: 'number' },
                    allergens: { type: 'string', description: 'JSON array string' },
                    sizes: { type: 'string', description: 'JSON array of {label, price} size variants (optional)' },
                    is_available: { type: 'integer', enum: [0, 1] },
                    is_featured: { type: 'integer', enum: [0, 1] },
                    spice_level: { type: 'integer', minimum: 0, maximum: 3 },
                    is_vegetarian: { type: 'integer', enum: [0, 1] },
                    is_vegan: { type: 'integer', enum: [0, 1] },
                    sort_order: { type: 'integer' },
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Created ID', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } },
          },
        },
      },
      '/api/admin/dishes/{id}': {
        put: {
          tags: ['Admin – Dishes'],
          summary: 'Update dish (supports image upload)',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } },
              },
            },
          },
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
        delete: {
          tags: ['Admin – Dishes'],
          summary: 'Delete dish',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
      },

      // ── Admin – Promotions ─────────────────────────────────────────
      '/api/admin/promotions': {
        get: {
          tags: ['Admin – Promotions'],
          summary: 'List all promotions',
          security: [{ AdminPassword: [] }],
          responses: {
            200: { description: 'All promotions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Promotion' } } } } },
          },
        },
        post: {
          tags: ['Admin – Promotions'],
          summary: 'Create promotion',
          security: [{ AdminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    discount_percent: { type: 'integer' },
                    dish_ids: { type: 'string', description: 'JSON array' },
                    category_id: { type: 'integer' },
                    start_date: { type: 'string', format: 'date' },
                    end_date: { type: 'string', format: 'date' },
                    is_active: { type: 'integer', enum: [0, 1] },
                    sort_order: { type: 'integer' },
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Created ID', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } } },
        },
      },
      '/api/admin/promotions/{id}': {
        put: {
          tags: ['Admin – Promotions'],
          summary: 'Update promotion',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object' } } },
          },
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
        delete: {
          tags: ['Admin – Promotions'],
          summary: 'Delete promotion',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
      },

      // ── Admin – Orders ─────────────────────────────────────────────
      '/api/admin/orders': {
        get: {
          tags: ['Admin – Orders'],
          summary: 'List last 100 orders',
          security: [{ AdminPassword: [] }],
          responses: {
            200: { description: 'Orders list', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Order' } } } } },
          },
        },
      },
      '/api/admin/orders/{id}/status': {
        put: {
          tags: ['Admin – Orders'],
          summary: 'Update order status',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: { status: { type: 'string', enum: ['new', 'preparing', 'ready', 'done'] } },
                },
              },
            },
          },
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
      },

      // ╔══════════════════════════════════════════════════════════════╗
      // ║  Driver Game Center (DGC) — second product under /api/dgc     ║
      // ╚══════════════════════════════════════════════════════════════╝

      // ── DGC – Menu (public) ────────────────────────────────────────
      '/api/dgc/menu/categories': {
        get: {
          tags: ['DGC – Menu'],
          summary: 'Get active categories',
          parameters: [
            { name: 'scope', in: 'query', schema: { type: 'string', enum: ['menu', 'cabinet'] }, description: "`cabinet` (cabinet QR) returns all scopes; otherwise only 'menu'/'both' categories" },
          ],
          responses: {
            200: { description: 'Active categories', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DgcCategory' } } } } },
          },
        },
      },
      '/api/dgc/menu/items': {
        get: {
          tags: ['DGC – Menu'],
          summary: 'Get available items (paginated)',
          parameters: [
            { name: 'scope', in: 'query', schema: { type: 'string', enum: ['menu', 'cabinet'] }, description: "`cabinet` returns all scopes; otherwise cabinet-only items are hidden" },
            { name: 'category_id', in: 'query', schema: { type: 'integer' }, description: 'Filter by category' },
            { name: 'featured', in: 'query', schema: { type: 'string', enum: ['1'] }, description: 'Only featured items' },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search in name/description' },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 12, maximum: 50 } },
          ],
          responses: {
            200: { description: 'Paginated items', content: { 'application/json': { schema: { $ref: '#/components/schemas/DgcItemList' } } } },
          },
        },
      },
      '/api/dgc/menu/items/{id}': {
        get: {
          tags: ['DGC – Menu'],
          summary: 'Get item by ID',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Item object', content: { 'application/json': { schema: { $ref: '#/components/schemas/DgcItem' } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/dgc/menu/sets': {
        get: {
          tags: ['DGC – Menu'],
          summary: 'Get active cabinet sets',
          responses: {
            200: { description: 'Active sets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DgcSet' } } } } },
          },
        },
      },
      '/api/dgc/menu/promotions': {
        get: {
          tags: ['DGC – Menu'],
          summary: 'Get active promotions',
          responses: {
            200: { description: 'Active promotions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DgcPromotion' } } } } },
          },
        },
      },

      // ── DGC – Cabinets (public) ────────────────────────────────────
      '/api/dgc/cabinets': {
        get: {
          tags: ['DGC – Cabinets'],
          summary: 'List active cabinets (with live timer/cost)',
          responses: {
            200: { description: 'Cabinets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DgcCabinet' } } } } },
          },
        },
      },
      '/api/dgc/cabinets/{id}': {
        get: {
          tags: ['DGC – Cabinets'],
          summary: 'Get cabinet by ID (with live timer/cost)',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Cabinet object', content: { 'application/json': { schema: { $ref: '#/components/schemas/DgcCabinet' } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ── DGC – Orders (public) ──────────────────────────────────────
      '/api/dgc/orders': {
        post: {
          tags: ['DGC – Orders'],
          summary: 'Place a new order',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    items: { type: 'array', items: { type: 'object' }, description: 'Cart items array (must be non-empty)' },
                    total: { type: 'number' },
                    currency: { type: 'string', example: 'AZN' },
                    table_number: { type: 'string', nullable: true },
                    cabinet_id: { type: 'integer', nullable: true },
                    customer_phone: { type: 'string', nullable: true },
                    notes: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Created order ID', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } },
            400: { description: 'No items', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },

      // ── DGC – AI ───────────────────────────────────────────────────
      '/api/dgc/ai/chat': {
        post: {
          tags: ['DGC – AI'],
          summary: 'Chat with the Game Center AI host',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: { type: 'string' },
                    language: { type: 'string', default: 'az', example: 'az' },
                    history: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          role: { type: 'string', enum: ['user', 'assistant'] },
                          content: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'AI reply plus any mentioned items',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      reply: { type: 'string' },
                      dishes: { type: 'array', items: { $ref: '#/components/schemas/DgcItem' }, description: 'Items mentioned in the reply (omitted when offline)' },
                      offline: { type: 'boolean', description: 'True when the AI service is unavailable' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/dgc/ai/recommend': {
        post: {
          tags: ['DGC – AI'],
          summary: 'Recommend up to 3 items not already in the cart',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    cartItems: { type: 'array', items: { type: 'object' }, description: 'Current cart items (their `id`s are excluded)' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Recommended items (up to 3)', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DgcItem' } } } } },
          },
        },
      },

      // ── DGC – Settings ─────────────────────────────────────────────
      '/api/dgc/settings/public': {
        get: {
          tags: ['DGC – Settings'],
          summary: 'Get public settings',
          description: 'All settings except private keys (admin_password)',
          responses: {
            200: { description: 'Key-value settings object', content: { 'application/json': { schema: { type: 'object' } } } },
          },
        },
      },
      '/api/dgc/settings': {
        get: {
          tags: ['DGC – Settings'],
          summary: 'Get all settings (admin)',
          security: [{ AdminPassword: [] }],
          responses: {
            200: { description: 'All settings as key-value object', content: { 'application/json': { schema: { type: 'object' } } } },
            401: { description: 'Unauthorized' },
          },
        },
        put: {
          tags: ['DGC – Settings'],
          summary: 'Update settings (admin)',
          security: [{ AdminPassword: [] }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', description: 'Key-value pairs to update (the reserved `password` key is ignored)' } } },
          },
          responses: {
            200: { description: 'Updated settings object', content: { 'application/json': { schema: { type: 'object' } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/dgc/settings/qrcode': {
        post: {
          tags: ['DGC – Settings'],
          summary: 'Generate QR code for the Game Center menu (admin)',
          security: [{ AdminPassword: [] }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    url: { type: 'string', description: 'Override menu URL (defaults to the menu_url setting; the driver-game-center slug is appended)' },
                    table: { type: 'string', description: 'Table number appended as ?table=' },
                    cabinet: { type: 'string', description: 'Cabinet id appended as ?cabinet= (unlocks the cabinet-only menu)' },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: 'QR code as data URL',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      qr: { type: 'string', description: 'Base64 data URL (image/png)' },
                      url: { type: 'string', description: 'The encoded target URL' },
                    },
                  },
                },
              },
            },
            400: { description: 'No menu_url configured', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            401: { description: 'Unauthorized' },
          },
        },
      },

      // ── DGC – Admin: Categories ────────────────────────────────────
      '/api/dgc/admin/categories': {
        get: {
          tags: ['DGC – Admin'],
          summary: 'List all categories',
          security: [{ AdminPassword: [] }],
          responses: {
            200: { description: 'All categories', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DgcCategory' } } } } },
          },
        },
        post: {
          tags: ['DGC – Admin'],
          summary: 'Create category (supports icon upload)',
          security: [{ AdminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', description: 'JSON lang object' },
                    icon: { type: 'string', example: '🎮' },
                    icon_type: { type: 'string', enum: ['svg', 'emoji', 'image'] },
                    icon_key: { type: 'string' },
                    icon_url: { type: 'string', description: 'Existing icon URL (alternative to iconFile upload)' },
                    scope: { type: 'string', enum: ['menu', 'cabinet', 'both'], default: 'menu' },
                    sort_order: { type: 'integer' },
                    iconFile: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Created ID', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } } },
        },
      },
      '/api/dgc/admin/categories/{id}': {
        put: {
          tags: ['DGC – Admin'],
          summary: 'Update category (supports icon upload)',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', properties: { iconFile: { type: 'string', format: 'binary' } } } } },
          },
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
        delete: {
          tags: ['DGC – Admin'],
          summary: 'Delete category',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
      },

      // ── DGC – Admin: Items ─────────────────────────────────────────
      '/api/dgc/admin/items': {
        get: {
          tags: ['DGC – Admin'],
          summary: 'List all items (paginated)',
          security: [{ AdminPassword: [] }],
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: {
            200: { description: 'Paginated items', content: { 'application/json': { schema: { $ref: '#/components/schemas/DgcItemList' } } } },
          },
        },
        post: {
          tags: ['DGC – Admin'],
          summary: 'Create item (supports image upload)',
          security: [{ AdminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['category_id', 'name', 'price'],
                  properties: {
                    category_id: { type: 'integer' },
                    name: { type: 'string', description: 'JSON lang object' },
                    description: { type: 'string' },
                    ingredients: { type: 'string' },
                    price: { type: 'number' },
                    old_price: { type: 'number' },
                    weight: { type: 'integer' },
                    calories: { type: 'integer' },
                    protein: { type: 'number' },
                    fat: { type: 'number' },
                    carbs: { type: 'number' },
                    allergens: { type: 'string', description: 'JSON array string' },
                    sizes: { type: 'string', description: 'JSON array of {label, price} size variants' },
                    scope: { type: 'string', enum: ['menu', 'cabinet', 'both'], default: 'both' },
                    is_hookah: { type: 'integer', enum: [0, 1] },
                    is_available: { type: 'integer', enum: [0, 1] },
                    is_featured: { type: 'integer', enum: [0, 1] },
                    spice_level: { type: 'integer', minimum: 0, maximum: 3 },
                    is_vegetarian: { type: 'integer', enum: [0, 1] },
                    is_vegan: { type: 'integer', enum: [0, 1] },
                    sort_order: { type: 'integer' },
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Created ID', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } } },
        },
      },
      '/api/dgc/admin/items/{id}': {
        put: {
          tags: ['DGC – Admin'],
          summary: 'Update item (supports image upload)',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } },
          },
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
        delete: {
          tags: ['DGC – Admin'],
          summary: 'Delete item',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
      },

      // ── DGC – Admin: Sets ──────────────────────────────────────────
      '/api/dgc/admin/sets': {
        get: {
          tags: ['DGC – Admin'],
          summary: 'List all cabinet sets',
          security: [{ AdminPassword: [] }],
          responses: {
            200: { description: 'All sets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DgcSet' } } } } },
          },
        },
        post: {
          tags: ['DGC – Admin'],
          summary: 'Create set (supports image upload)',
          security: [{ AdminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['name', 'price'],
                  properties: {
                    name: { type: 'string', description: 'JSON lang object' },
                    description: { type: 'string' },
                    price: { type: 'number' },
                    old_price: { type: 'number' },
                    item_ids: { type: 'string', description: 'JSON array of item IDs' },
                    includes_hookah: { type: 'integer', enum: [0, 1] },
                    is_active: { type: 'integer', enum: [0, 1] },
                    sort_order: { type: 'integer' },
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Created ID', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } } },
        },
      },
      '/api/dgc/admin/sets/{id}': {
        put: {
          tags: ['DGC – Admin'],
          summary: 'Update set (supports image upload)',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } },
          },
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
        delete: {
          tags: ['DGC – Admin'],
          summary: 'Delete set',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
      },

      // ── DGC – Admin: Cabinets ──────────────────────────────────────
      '/api/dgc/admin/cabinets': {
        get: {
          tags: ['DGC – Admin'],
          summary: 'List all cabinets (with live timer/cost)',
          security: [{ AdminPassword: [] }],
          responses: {
            200: { description: 'All cabinets', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DgcCabinet' } } } } },
          },
        },
        post: {
          tags: ['DGC – Admin'],
          summary: 'Create cabinet (supports image upload)',
          security: [{ AdminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string', description: 'JSON lang object' },
                    description: { type: 'string' },
                    capacity: { type: 'integer', default: 4 },
                    hourly_rate: { type: 'number', default: 0 },
                    is_active: { type: 'integer', enum: [0, 1] },
                    sort_order: { type: 'integer' },
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Created ID', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } } },
        },
      },
      '/api/dgc/admin/cabinets/{id}': {
        put: {
          tags: ['DGC – Admin'],
          summary: 'Update cabinet (supports image upload)',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } },
          },
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
        delete: {
          tags: ['DGC – Admin'],
          summary: 'Delete cabinet',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
      },
      '/api/dgc/admin/cabinets/{id}/open': {
        post: {
          tags: ['DGC – Admin'],
          summary: 'Open a cabinet (start the timer)',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Cabinet with live timer', content: { 'application/json': { schema: { $ref: '#/components/schemas/DgcCabinet' } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Cabinet already open', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/dgc/admin/cabinets/{id}/close': {
        post: {
          tags: ['DGC – Admin'],
          summary: 'Close a cabinet (record session + cost)',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: {
              description: 'Session summary',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      ok: { type: 'boolean', example: true },
                      duration_minutes: { type: 'integer' },
                      hourly_rate: { type: 'number' },
                      cost: { type: 'number' },
                    },
                  },
                },
              },
            },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
            409: { description: 'Cabinet is not open', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/api/dgc/admin/cabinets/{id}/sessions': {
        get: {
          tags: ['DGC – Admin'],
          summary: 'List last 100 sessions for a cabinet',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: {
            200: { description: 'Sessions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DgcCabinetSession' } } } } },
          },
        },
      },

      // ── DGC – Admin: Promotions ────────────────────────────────────
      '/api/dgc/admin/promotions': {
        get: {
          tags: ['DGC – Admin'],
          summary: 'List all promotions',
          security: [{ AdminPassword: [] }],
          responses: {
            200: { description: 'All promotions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/DgcPromotion' } } } } },
          },
        },
        post: {
          tags: ['DGC – Admin'],
          summary: 'Create promotion (supports image upload)',
          security: [{ AdminPassword: [] }],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  required: ['title'],
                  properties: {
                    title: { type: 'string', description: 'JSON lang object' },
                    description: { type: 'string' },
                    discount_percent: { type: 'integer' },
                    item_ids: { type: 'string', description: 'JSON array of item IDs' },
                    category_id: { type: 'integer' },
                    start_date: { type: 'string', format: 'date' },
                    end_date: { type: 'string', format: 'date' },
                    is_active: { type: 'integer', enum: [0, 1] },
                    sort_order: { type: 'integer' },
                    image: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Created ID', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } } },
        },
      },
      '/api/dgc/admin/promotions/{id}': {
        put: {
          tags: ['DGC – Admin'],
          summary: 'Update promotion (supports image upload)',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: { 'multipart/form-data': { schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } } },
          },
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
        delete: {
          tags: ['DGC – Admin'],
          summary: 'Delete promotion',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
      },

      // ── DGC – Admin: Orders ────────────────────────────────────────
      '/api/dgc/admin/orders': {
        get: {
          tags: ['DGC – Admin'],
          summary: 'List orders (paginated, filterable)',
          security: [{ AdminPassword: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['new', 'preparing', 'ready', 'done', 'cancelled'] }, description: 'Filter by status' },
            { name: 'date', in: 'query', schema: { type: 'string', enum: ['today', 'yesterday', 'month'] }, description: 'Filter by date range' },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: {
            200: { description: 'Paginated orders', content: { 'application/json': { schema: { $ref: '#/components/schemas/DgcOrderList' } } } },
          },
        },
      },
      '/api/dgc/admin/orders/stats': {
        get: {
          tags: ['DGC – Admin'],
          summary: 'Order stats for a date range',
          security: [{ AdminPassword: [] }],
          parameters: [
            { name: 'date', in: 'query', schema: { type: 'string', enum: ['today', 'yesterday', 'month'], default: 'today' } },
          ],
          responses: {
            200: {
              description: 'Aggregated stats',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      count: { type: 'integer' },
                      revenue: { type: 'number', description: 'Sum of done orders' },
                      expectedRevenue: { type: 'number', description: 'Sum of orders not done/cancelled' },
                      newCount: { type: 'integer' },
                      preparingCount: { type: 'integer' },
                      deliveredCount: { type: 'integer' },
                      currency: { type: 'string', example: 'AZN' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/dgc/admin/orders/{id}/status': {
        put: {
          tags: ['DGC – Admin'],
          summary: 'Update order status',
          security: [{ AdminPassword: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: { status: { type: 'string', enum: ['new', 'preparing', 'ready', 'done', 'cancelled'] } },
                },
              },
            },
          },
          responses: { 200: { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/OkResponse' } } } } },
        },
      },
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
