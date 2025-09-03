# AdCraft - AI-Powered Ad Generation

A Next.js application that generates product ads using AI and n8n workflows.

## Features

- **Template Management**: Upload and manage ad templates via Supabase
- **Product Image Upload**: Upload product images with automatic size validation
- **AI-Powered Generation**: Generate ads using n8n workflows and AI
- **Result Storage**: Store generated results in Supabase storage

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
