const { z } = require('zod');

// =============================================
// AUTH SCHEMAS
// =============================================

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

const updateProfileSchema = z.object({
    email: z.string().email('Invalid email format'),
    username: z.string().max(50, 'Username too long').optional(),
    avatar: z.string().optional(),
    bio: z.string().max(500, 'Bio too long').optional(),
    theme: z.enum(['light', 'dark']).optional(),
    notif_settings: z.string().optional()
});

const changePasswordSchema = z.object({
    email: z.string().email('Invalid email format'),
    currentPassword: z.string().min(1, 'Current password required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

// =============================================
// PLANT SCHEMAS
// =============================================

const createPlantSchema = z.object({
    name: z.string().min(1, 'Plant name required').max(100, 'Name too long'),
    owner_email: z.string().email('Invalid owner email'),
    caretaker_email: z.string().email('Invalid caretaker email').optional(),
    status: z.enum(['healthy', 'needs_attention', 'critical']).optional(),
    location: z.string().max(255, 'Location too long').optional(),
    coords: z.string().optional(),
    emoji: z.string().max(10).optional(),
    type: z.string().max(50).optional()
});

const updatePlantSchema = z.object({
    id: z.coerce.number().int().positive('Invalid plant ID'),
    size: z.string().max(50).optional(),
    height: z.string().max(50).optional(),
    age: z.string().max(50).optional(),
    soil_type: z.string().max(100).optional(),
    last_watered: z.string().optional(),
    status: z.enum(['healthy', 'needs_attention', 'critical']).optional()
});

// =============================================
// STEWARD SCHEMAS
// =============================================

const createTaskSchema = z.object({
    plant_id: z.number().int().positive().optional(),
    steward_email: z.string().email('Invalid steward email'),
    title: z.string().min(1, 'Task title required').max(255, 'Title too long'),
    type: z.string().max(50).optional(),
    due_date: z.string().optional()
});

const createRoutineSchema = z.object({
    steward_email: z.string().email('Invalid steward email'),
    plant_id: z.number().int().positive().optional(),
    title: z.string().min(1, 'Routine title required').max(255, 'Title too long'),
    type: z.string().max(50).optional(),
    frequency_days: z.number().int().positive('Frequency must be positive'),
    timing_block: z.string().max(50).optional()
});

const addInventorySchema = z.object({
    steward_email: z.string().email('Invalid steward email'),
    item_name: z.string().min(1, 'Item name required').max(255, 'Name too long'),
    quantity: z.number().min(0).optional(),
    unit: z.string().max(50).optional(),
    threshold: z.number().min(0).optional(),
    category: z.string().max(100).optional(),
    expiry_date: z.string().optional(),
    storage_location: z.string().max(255).optional(),
    cost_per_unit: z.number().min(0).optional(),
    owner_email: z.string().email().optional()
});

const stewardApplicationSchema = z.object({
    email: z.string().email('Invalid email'),
    full_name: z.string().min(1, 'Full name required').max(255),
    experience_years: z.coerce.number().int().min(0).optional(),
    certifications: z.string().optional(),
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(1000)
});

// =============================================
// COMMUNITY SCHEMAS
// =============================================

const createPostSchema = z.object({
    author: z.string().max(100).optional(),
    author_email: z.string().email('Invalid author email'),
    avatar: z.string().optional(),
    content: z.string().max(5000, 'Post too long').optional(),
    type: z.enum(['Tips', 'Question', 'Showcase', 'Discussion']).optional()
});

const createCommentSchema = z.object({
    author: z.string().max(100).optional(),
    author_email: z.string().email('Invalid author email'),
    avatar: z.string().optional(),
    content: z.string().min(1, 'Comment required').max(1000, 'Comment too long')
});

const likePostSchema = z.object({
    email: z.string().email('Invalid email')
});

// =============================================
// MESSAGE SCHEMAS
// =============================================

const sendMessageSchema = z.object({
    sender_email: z.string().email('Invalid sender email'),
    receiver_email: z.string().email('Invalid receiver email'),
    message_text: z.string().min(1, 'Message required').max(5000, 'Message too long')
});

// =============================================
// CONNECTION SCHEMAS
// =============================================

const connectionRequestSchema = z.object({
    user_email: z.string().email('Invalid user email'),
    steward_email: z.string().email('Invalid steward email'),
    user_name: z.string().max(100).optional()
});

const connectionAcceptSchema = z.object({
    user_email: z.string().email('Invalid user email'),
    steward_email: z.string().email('Invalid steward email'),
    steward_name: z.string().max(100).optional(),
    notif_id: z.number().int().positive().optional()
});

// =============================================
// ADMIN SCHEMAS
// =============================================

const approveStewSchema = z.object({
    email: z.string().email('Invalid email')
});

const broadcastSchema = z.object({
    message: z.string().max(1000).optional(),
    active: z.boolean().optional(),
    type: z.enum(['alert', 'broadcast'])
});

module.exports = {
    // Auth
    loginSchema,
    registerSchema,
    updateProfileSchema,
    changePasswordSchema,

    // Plants
    createPlantSchema,
    updatePlantSchema,

    // Steward
    createTaskSchema,
    createRoutineSchema,
    addInventorySchema,
    stewardApplicationSchema,

    // Community
    createPostSchema,
    createCommentSchema,
    likePostSchema,

    // Messages
    sendMessageSchema,

    // Connections
    connectionRequestSchema,
    connectionAcceptSchema,

    // Admin
    approveStewSchema,
    broadcastSchema
};
