# NexaBook Setup Guide

This guide will walk you through setting up NexaBook with authentication and database.

## 📋 Prerequisites

1. **Node.js 18+** - [Download here](https://nodejs.org/)
2. **Clerk Account** - Free tier available at [clerk.com](https://clerk.com)
3. **Neon Database** - Free tier at [neon.tech](https://neon.tech) (Optional for development)

## 🔐 Step 1: Setup Clerk Authentication

### 1.1 Create a Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click **"Add Application"**
3. Choose **"Create a new application"**
4. Name it "NexaBook" (or your preferred name)
5. Select **Email + Password** as authentication strategy
6. Enable **Organizations** (for multi-tenancy)

### 1.2 Get Your API Keys

1. In Clerk Dashboard, go to **API Keys**
2. Copy both keys:
   - **Publishable Key** (starts with `pk_test_`)
   - **Secret Key** (starts with `sk_test_`)

### 1.3 Configure Clerk Settings

In Clerk Dashboard → **Paths**:
- Sign-in path: `/login`
- Sign-up path: `/register`
- After sign-in redirect: `/dashboard`
- After sign-up redirect: `/dashboard`

## 🗄️ Step 2: Setup Neon Database (Optional)

### 2.1 Create a Neon Project

1. Go to [Neon Console](https://neon.tech)
2. Sign up/Login
3. Click **"New Project"**
4. Name it "nexabook"
5. Select a region close to you
6. Click **"Create Project"**

### 2.2 Get Database Connection String

1. After project creation, you'll see a connection string like:
   ```
   postgresql://user:password@ep-cool-example-123456.us-east-2.aws.neon.tech/nexabook?sslmode=require
   ```
2. Copy this connection string

## 🔧 Step 3: Configure Environment Variables

### 3.1 Create .env.local File

```bash
cp .env.example .env.local
```

### 3.2 Update the Values

Open `.env.local` and replace the placeholder values:

```env
# Clerk Authentication (from Step 1)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
CLERK_SECRET_KEY=sk_test_your_actual_key_here

# Clerk URLs (keep these as is)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Neon Database (from Step 2, or leave as is for now)
DATABASE_URL=postgresql://user:password@your-neon-connection-string/nexabook?sslmode=require

# Application (keep as is)
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## 🚀 Step 4: Install & Run

### 4.1 Install Dependencies

```bash
npm install
```

### 4.2 Setup Database (Optional)

If you have a database connection:

```bash
# Generate database schema
npm run db:generate

# Push schema to database
npm run db:push

# (Optional) Seed with demo data
npx tsx src/db/seed.ts

# (Optional) Open database GUI
npm run db:studio
```

### 4.3 Start Development Server

```bash
npm run dev
```

### 4.4 Open Your Browser

Navigate to [http://localhost:3000](http://localhost:3000)

## ✨ What You'll See

### Landing Page (/)
- Premium landing page with NexaBook branding
- Features grid, pricing section, compliance badge
- "Try NexaBook Free" button

### Authentication (/login & /register)
- Beautiful Clerk-powered sign-in/sign-up forms
- Email + password authentication
- Automatic redirect to dashboard after login

### Dashboard (/dashboard)
- **Collapsible Sidebar** with all modules
- **Top Header** with search, notifications, user profile
- **Welcome Section** with personalized greeting
- **Quick Action Cards**: Create Invoice, Add Product, Add Employee, Record Expense
- **Recent Activity** feed
- **Upcoming Tasks** list

## 🏗️ Project Structure

```
nexabook/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Auth pages (login/register)
│   │   ├── (dashboard)/         # Protected dashboard routes
│   │   ├── layout.tsx           # Root layout with ClerkProvider
│   │   └── page.tsx             # Landing page
│   ├── db/
│   │   ├── index.ts             # Database connection
│   │   ├── schema.ts            # Multi-tenant schema
│   │   └── seed.ts              # Seed script
│   ├── middleware.ts             # Auth middleware
│   └── components/ui/           # UI components
├── .env.local                    # Your secrets (gitignored)
├── .env.example                  # Template for others
└── drizzle.config.ts             # Drizzle ORM config
```

## 🔒 Security Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Share `.env.example`** - Team members can use it as template
3. **Use different keys for production** - Get production keys from Clerk dashboard
4. **Enable 2FA** - In your Clerk dashboard for better security

## 🐛 Troubleshooting

### "Invalid API key" error
- Make sure your Clerk keys are correct in `.env.local`
- Check that you're using test keys for development

### Database connection error
- Verify your Neon connection string
- Ensure SSL mode is enabled (`?sslmode=require`)
- You can run without database for UI development

### "Module not found" errors
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## 📚 Next Steps

1. **Customize Branding** - Update colors in `tailwind.config.js`
2. **Add More Fields** - Extend user profile in `src/db/schema.ts`
3. **Create Modules** - Implement specific features in dashboard pages
4. **Deploy** - Follow deployment guide for production setup

## 🆘 Need Help?

- Check the [Clerk Documentation](https://clerk.com/docs)
- Check the [Drizzle ORM Documentation](https://orm.drizzle.team)
- Check the [Neon Documentation](https://neon.tech/docs)

---

**Made with ❤️ for Accountants by NexaBook**
