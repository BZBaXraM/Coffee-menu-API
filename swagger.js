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
    },
  },
  apis: [],
};

module.exports = swaggerJsdoc(options);
