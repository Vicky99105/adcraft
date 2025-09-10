# AdCraft - AI-Powered Ad Generation

A Next.js application that generates product ads using AI and n8n workflows.

## Features

- **Template Management**: Upload and manage ad templates via Supabase
- **Product Image Upload**: Upload product images with automatic size validation
- **AI-Powered Generation**: Generate ads using n8n workflows and AI
- **Result Storage**: Store generated results in Supabase storage
- **Admin Panel**: Password-protected admin functions for template management
- **Template Visibility Control**: Show/hide templates from public view
- **Bulk Operations**: Bulk delete templates with storage cleanup
- **Prompt Editing**: Edit template prompts directly from the admin panel

## File Size Limits

- **Maximum file size**: 50MB
- **Recommended file size**: Under 10MB for optimal performance
- **Supported formats**: PNG, JPG, WebP

Files larger than 10MB will show a warning but can still be uploaded. Files larger than 50MB will be rejected.

## Setup

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed setup instructions.

## Environment Variables

Required environment variables in `.env.local`:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# n8n Webhook Configuration
N8N_WEBHOOK_URL=your_n8n_webhook_url

# Admin Password (optional, defaults to "admin123")
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_admin_password
```

## Development

```bash
npm install
npm run dev
```

## Troubleshooting

### Upload Issues
- Check file size limits (max 50MB, recommended under 10MB)
- Verify Supabase storage bucket is properly configured
- Check browser console for detailed error messages

### Database Schema Updates
If you need to update your database schema, run the SQL script in `database_update.sql` in your Supabase SQL editor.

### Admin Panel Access
- **Template Upload**: Publicly accessible at `/admin`
- **Admin Management**: Password-protected at `/admin/secure`
- **Default Password**: `admin123` (change via `NEXT_PUBLIC_ADMIN_PASSWORD` environment variable)
- **Admin Functions**: Template visibility control, bulk deletion, prompt editing, template management

### Template Visibility
- Templates are visible by default when uploaded
- Use the admin panel to hide/show templates from public view
- Hidden templates won't appear on the main landing page
- Run `add_visibility_column.sql` in Supabase to add the visibility feature


📁 /app/
├── 📄 layout.tsx (27 lines) - Root layout with fonts and analytics
├── 📄 page.tsx (474 lines) - Main application (4-step workflow)
├── 📄 globals.css (135 lines) - Global styles
├── 📁 admin/
│   ├── �� page.tsx (54 lines) - Template upload page
│   └── 📁 secure/
│       └── 📄 page.tsx (432 lines) - Admin management panel
└── �� api/ - Backend API routes
    ├── �� executions/create/route.ts
    ├── 📁 results/upload/route.ts
    ├── �� templates/
    │   ├── 📁 bulk-delete/route.ts
    │   ├── 📁 list/route.ts
    │   ├── 📁 prompt/route.ts
    │   ├── 📁 upload/route.ts
    │   └── 📁 visibility/route.ts
    ├── 📁 trigger/route.ts
    └── 📁 upload/route.ts

📁 /components/ - Reusable UI components
├── 📄 result-grid.tsx (135 lines) - Displays generated ads
├── �� template-picker.tsx (140 lines) - Template selection interface
├── 📄 template-uploader.tsx - Admin template upload
├── �� upload-image.tsx - Image upload component
└── 📁 ui/ - shadcn/ui component library (30+ components)

�� /lib/ - Utilities
├── 📄 supabase.ts - Database client
└── 📄 utils.ts - Helper functions

📁 /hooks/ - Custom React hooks
├── 📄 use-mobile.ts
└── �� use-toast.ts