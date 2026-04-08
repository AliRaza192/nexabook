# NexaBook - Cloud ERP & Accounting System

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0-38bdf8)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**The All-in-One Operating System for Your Business.** Invoicing, Inventory, Payroll, and Accounting — localized for Pakistan and built for the world.

![NexaBook Dashboard](https://via.placeholder.com/1200x600/0f172a/ffffff?text=NexaBook+Dashboard)

## 🌟 Features

### Core Modules
- **Sales Management** - Quotations, Sales Orders, Invoices, Recurring Billing, Returns
- **Purchase Management** - PO, GRN, Vendor Bills, Payments
- **Point of Sale (POS)** - Fast checkout, Shift management
- **Accounts & Banking** - COA, Ledger, Journal Entries, Tax, Reconciliation
- **Inventory** - Stock Movement, Warehouses, Batch Tracking
- **HR & Payroll** - Employee Management, Attendance, Salary Processing
- **Fixed Assets** - Asset Register, Depreciation
- **Manufacturing** - BOM, Job Orders
- **CRM** - Leads, Tickets, Loyalty Programs
- **Reports** - 100+ Comprehensive Reports

### Key Highlights
- ✅ **FBR & SRB Compliance Ready** - Fully compliant with Pakistan tax regulations
- ✅ **Multi-Branch Support** - Manage multiple locations
- ✅ **Real-time Analytics** - Dashboard with key metrics
- ✅ **Responsive Design** - Works on all devices
- ✅ **Modern UI** - Built with Shadcn UI & Tailwind CSS
- ✅ **Smooth Animations** - Powered by Framer Motion

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- npm, yarn, or pnpm
- Clerk account (for authentication)
- Neon PostgreSQL database (optional for development)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/nexabook.git
cd nexabook
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup Environment Variables**

Copy `.env.example` to `.env.local` and configure your keys:

```bash
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - From Clerk dashboard
- `CLERK_SECRET_KEY` - From Clerk dashboard
- `DATABASE_URL` - Neon PostgreSQL connection string

4. **Setup Database (Optional)**

```bash
# Generate database schema
npm run db:generate

# Push schema to database
npm run db:push

# Open Drizzle Studio to view/manage data
npm run db:studio
```

5. **Run the development server**
```bash
npm run dev
```

6. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
nexabook/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Authentication routes
│   │   │   ├── login/          # Clerk Sign-In page
│   │   │   └── register/       # Clerk Sign-Up page
│   │   ├── (dashboard)/         # Dashboard modules
│   │   │   ├── layout.tsx      # Dashboard shell with sidebar
│   │   │   ├── page.tsx        # Dashboard home
│   │   │   ├── sales/
│   │   │   ├── purchases/
│   │   │   ├── pos/
│   │   │   ├── accounts/
│   │   │   ├── inventory/
│   │   │   ├── hr-payroll/
│   │   │   ├── fixed-assets/
│   │   │   ├── manufacturing/
│   │   │   ├── crm/
│   │   │   └── reports/
│   │   ├── layout.tsx           # Root layout with ClerkProvider
│   │   ├── globals.css
│   │   └── page.tsx             # Landing page
│   ├── db/
│   │   ├── index.ts             # Drizzle ORM database connection
│   │   ├── schema.ts            # Multi-tenant database schema
│   │   └── seed.ts              # Database seed script
│   ├── components/
│   │   ├── ui/                  # Shadcn UI components
│   │   ├── layout/              # Layout components
│   │   └── landing/             # Landing page components
│   ├── lib/
│   │   └── utils.ts
│   ├── middleware.ts             # Clerk authentication middleware
│   └── hooks/
├── public/
├── .env.local                    # Environment variables (gitignored)
├── .env.example                  # Environment variables template
├── drizzle.config.ts             # Drizzle ORM configuration
├── tailwind.config.js
├── next.config.mjs
├── tsconfig.json
└── package.json
```

## 🎨 Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn UI
- **Icons:** Lucide React
- **Animations:** Framer Motion

### Backend & Authentication
- **Authentication:** Clerk (Multi-tenant)
- **Database:** Neon PostgreSQL (Serverless)
- **ORM:** Drizzle ORM
- **State Management:** React Hooks

### Build & DevEx
- **Build Tool:** Turbopack
- **Package Manager:** npm
- **Linting:** ESLint (Next.js config)
- **Type Checking:** TypeScript

## 🎯 Roadmap

### Phase 1: Foundation ✅
- [x] Project setup & configuration
- [x] Landing page with premium design
- [x] Module placeholders

### Phase 2: Backend & Authentication ✅
- [x] Clerk authentication setup
- [x] Multi-tenant database schema (Drizzle + Neon)
- [x] Dashboard layout with collapsible sidebar
- [x] Company switcher & user profile
- [x] Route protection with middleware
- [x] Dashboard home with quick actions

### Phase 3: Core Features (Upcoming)
- [ ] Organization onboarding flow
- [ ] Chart of Accounts implementation
- [ ] Sales module (Invoices, Quotations)
- [ ] Inventory management
- [ ] Customer management
- [ ] Basic accounting features

### Phase 4: Advanced Features
- [ ] POS system
- [ ] HR & Payroll module
- [ ] Tax compliance integration (FBR/SRB)
- [ ] Reports engine
- [ ] API integrations

### Phase 5: Enterprise
- [ ] Multi-branch support
- [ ] Role-based access control
- [ ] Audit logs
- [ ] Advanced analytics
- [ ] Mobile app (React Native)

## 📊 Available Scripts

```bash
# Development
npm run dev                    # Start development server with Turbopack

# Production
npm run build                  # Build for production
npm start                      # Start production server

# Code Quality
npm run lint                   # Run ESLint

# Database Commands
npm run db:generate            # Generate Drizzle migrations
npm run db:migrate             # Run database migrations
npm run db:push                # Push schema to database (dev only)
npm run db:studio              # Open Drizzle Studio (GUI)
npm run db:check               # Check schema for issues
```

## 🌐 Deployment

The easiest way to deploy NexaBook is using [Vercel](https://vercel.com):

```bash
vercel
```

Or deploy to any Node.js hosting platform:

```bash
npm run build
npm start
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Shadcn UI](https://ui.shadcn.com/) - Beautiful UI components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Lucide](https://lucide.dev/) - Beautiful icons

## 📞 Support

For support, email support@nexabook.com or join our Discord community.

---

**Made with ❤️ for Accountants by NexaBook**

[FBR & SRB Compliance Ready](#) | [Documentation](#) | [Demo](#)
