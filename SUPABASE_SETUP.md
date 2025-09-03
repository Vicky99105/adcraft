# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized

## 2. Set up Storage Buckets

### Create Storage Buckets

In your Supabase dashboard, go to **Storage** and create two buckets:

1. **`templates`** bucket:
   - Make it **public** (so template images can be accessed directly)
   - This will store your ad templates

2. **`uploads`** bucket:
   - Make it **public** (so uploaded images can be accessed directly)
   - This will store user-uploaded product images

3. **`results`** bucket:
   - Make it **public** (so generated ads can be accessed directly)
   - This will store the generated ad results

### Set up RLS (Row Level Security) Policies

For all three buckets, you'll need to set up policies to allow public access:

```sql
-- For templates bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'templates');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'templates');

-- For uploads bucket  
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads');

-- For results bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'results');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'results');
```

### Optional: Create Results Metadata Table

If you want to store metadata about generated results, create this table:

```sql
-- Create results metadata table
CREATE TABLE results_metadata (
  id SERIAL PRIMARY KEY,
  result_urls TEXT[] NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE results_metadata ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (adjust as needed for your security requirements)
CREATE POLICY "Public Access" ON results_metadata FOR SELECT USING (true);
CREATE POLICY "Public Insert" ON results_metadata FOR INSERT WITH CHECK (true);
```

### Create Tables For Logging Uploads, Templates, Results, Executions

Run these SQL statements in the Supabase SQL editor. They create minimal schemas to log every upload and workflow execution.

```sql
-- Enable pgcrypto for UUIDs if not already
create extension if not exists pgcrypto;

-- 1) Templates uploaded to the templates bucket
create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  file_name text,
  prompt text default 'Place the uploaded product onto this template image as a realistic ad composite. Keep aspect ratio and add soft shadow.',
  created_at timestamptz not null default now()
);

-- 2) User uploads to the uploads bucket
create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  file_name text,
  execution_id uuid references executions(id),
  file_size bigint,
  content_type text,
  is_fallback boolean default false,
  created_at timestamptz not null default now()
);

-- 3) Generated results stored in results bucket
create table if not exists results (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid,
  url text not null,
  file_name text,
  created_at timestamptz not null default now()
);

-- 4) Executions of your n8n workflow
create table if not exists executions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'started', -- started | success | error
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text,
  result_count int,
  templates jsonb,
  user_image_url text,
  prompts jsonb -- Array of prompts for each template
);

-- RLS
alter table templates enable row level security;
alter table uploads enable row level security;
alter table results enable row level security;
alter table executions enable row level security;

-- Public read; inserts will be done via service role from server routes
create policy if not exists "Public Read templates" on templates for select using (true);
create policy if not exists "Public Read uploads" on uploads for select using (true);
create policy if not exists "Public Read results" on results for select using (true);
create policy if not exists "Public Read executions" on executions for select using (true);
```

You can harden these policies later. Server routes in this app use the service role key, so inserts/updates are allowed regardless of RLS.

## 3. Get Your Supabase Credentials

1. Go to **Settings** > **API** in your Supabase dashboard
2. Copy the following values:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon public** key (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role** key (SUPABASE_SERVICE_ROLE_KEY) - **Keep this secret!**

## 4. Environment Variables

Create a `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# n8n Webhook Configuration
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/your-webhook-id
```

## 5. Install Dependencies

```bash
npm install
# or
pnpm install
```

## 6. Run the Application

```bash
npm run dev
# or
pnpm dev
```

## 7. Test the Setup

1. Go to `http://localhost:3000`
2. Try uploading templates in the "Template library (admin)" section
3. Check if templates appear in the "Select templates" section
4. Try uploading a product image and creating ads

## Troubleshooting

### Templates not showing up?
- Check that the `templates` bucket exists and is public
- Verify your environment variables are correct
- Check the browser console and server logs for errors

### Upload errors?
- Ensure both storage buckets are created and public
- Verify the RLS policies are set up correctly
- Check that your service role key has the correct permissions

### CORS issues?
- Supabase handles CORS automatically for public buckets
- If you're still having issues, check your Supabase project settings

## Future Supabase Features

This setup gives you a foundation to add more Supabase features:

- **Database**: Store user data, ad history, analytics
- **Authentication**: User login/signup
- **Real-time**: Live updates for collaborative features
- **Edge Functions**: Serverless functions for complex processing
- **Vector Search**: AI-powered search capabilities

## Security Notes

- Never commit your `.env.local` file to version control
- The service role key has admin access - keep it secure
- Consider implementing proper user authentication for production use
- Set up proper RLS policies for any database tables you create
