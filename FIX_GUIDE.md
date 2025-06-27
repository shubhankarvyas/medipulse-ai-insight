# MediPulse AI - Quick Fix Guide

## 🚨 Current Issues & Solutions

### Problem: Database RLS Policies Too Restrictive

The app is getting 403/406 errors because Supabase Row Level Security (RLS) policies are blocking user operations.

### ✅ SOLUTION - Follow These Steps:

#### 1. Fix Database Permissions
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/rcopavlcfnbwjqstseau/sql
2. Copy and paste the contents of `SUPABASE_FIX.sql` into the SQL editor
3. Click "Run" to execute the script

#### 2. Create Demo Users (Optional)
1. In the same SQL editor, copy and paste the contents of `DEMO_USERS.sql`
2. Click "Run" to create test users
3. You can now login with:
   - Email: `patient@demo.com` Password: `password123`
   - Email: `doctor@demo.com` Password: `password123`

#### 3. Start the Application
```bash
npm run dev
```

### 🎯 What The Fix Does:

1. **Removes restrictive RLS policies** that were blocking user creation/access
2. **Grants proper permissions** to authenticated users
3. **Creates a robust user creation trigger** that handles both patients and doctors
4. **Enables simple "allow all" policy** for testing (you can tighten this later)

### 🔧 Current Environment:

- **Supabase URL**: `https://rcopavlcfnbwjqstseau.supabase.co`
- **Local Dev Server**: `http://localhost:8080`
- **Framework**: React + TypeScript + Vite + Supabase

### 📱 Features Working After Fix:

- ✅ User Authentication (Sign up/Sign in)
- ✅ Role-based access (Patient/Doctor)
- ✅ Profile management
- ✅ Navigation between different views
- ✅ AI Chat integration
- ✅ MRI Upload functionality
- ✅ Real-time ECG monitoring
- ✅ Responsive design

### 🔐 Security Note:

The current fix uses permissive policies for quick testing. For production, you should:
1. Re-enable proper RLS policies
2. Implement proper role-based access control
3. Add input validation
4. Use environment-specific configurations

### 🚀 Next Steps:

1. Run the SQL fixes
2. Test with demo users or create new accounts
3. Explore the different dashboard views
4. Customize the features as needed

### 📞 Need Help?

If you encounter any issues:
1. Check the browser console for errors
2. Verify the SQL scripts ran successfully
3. Ensure environment variables are correct in `.env`
