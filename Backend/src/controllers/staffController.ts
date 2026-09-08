import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { supabaseAdmin } from '../config/supabaseAdmin';

export const createStaffUser = async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, fullName } = req.body;
  const shopId = req.user?.shop_id;

  if (!shopId) {
    return res.status(400).json({ error: 'User does not belong to any shop' });
  }

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  try {
    const { data: authUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || '',
        role: 'staff',
        shop_id: shopId,
      },
    });

    if (createUserError) {
      return res.status(400).json({ error: createUserError.message });
    }

    return res.status(201).json({
      message: 'Staff user created successfully',
      user: authUser.user,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createStaffUserDedicated = async (req: AuthenticatedRequest, res: Response) => {
  const { fullName, email, phone, role, department, shopAssignments, status, password, created_by_role, created_by_email, created_by_id } = req.body;
  if (!email || !fullName) {
    return res.status(400).json({ error: 'fullName and email are required' });
  }

  try {
    const userRole = (role || 'staff').toLowerCase();
    const cRole = created_by_role || 'SUPER_ADMIN';
    const cEmail = created_by_email || 'admin@nexus.com';

    const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || 'Nexus#2026!Staff',
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || '',
        role: userRole,
        department: department || 'Operations',
        shop_assignments: shopAssignments || ['shop-001'],
        status: status || 'Active',
        created_by_role: cRole,
        created_by_email: cEmail,
        created_by_id: created_by_id || null,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (authUser.user) {
      await supabaseAdmin.from('profiles').upsert({
        id: authUser.user.id,
        email: email.toLowerCase().trim(),
        full_name: fullName,
        role: userRole,
        has_data_access: status !== 'Inactive',
        password: password || 'Nexus#2026!Staff',
        created_by_role: cRole,
        created_by_email: cEmail,
        created_by_id: created_by_id || null,
      });
    }

    return res.status(201).json({ message: 'Staff created successfully', user: authUser.user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const createSalesUserDedicated = async (req: AuthenticatedRequest, res: Response) => {
  const { fullName, email, phone, salesTerritory, commissionRate, shopAssignments, status, password, created_by_role, created_by_email, created_by_id } = req.body;
  if (!email || !fullName) {
    return res.status(400).json({ error: 'fullName and email are required' });
  }

  try {
    const cRole = created_by_role || 'SUPER_ADMIN';
    const cEmail = created_by_email || 'admin@nexus.com';

    const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || 'Nexus#2026!Sales',
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone: phone || '',
        role: 'sales',
        department: 'Sales',
        sales_territory: salesTerritory || 'Central Region',
        commission_rate: commissionRate || 5.0,
        shop_assignments: shopAssignments || ['shop-001'],
        status: status || 'Active',
        created_by_role: cRole,
        created_by_email: cEmail,
        created_by_id: created_by_id || null,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (authUser.user) {
      await supabaseAdmin.from('profiles').upsert({
        id: authUser.user.id,
        email: email.toLowerCase().trim(),
        full_name: fullName,
        role: 'sales',
        has_data_access: status !== 'Inactive',
        password: password || 'Nexus#2026!Sales',
        created_by_role: cRole,
        created_by_email: cEmail,
        created_by_id: created_by_id || null,
      });
    }

    return res.status(201).json({ message: 'Sales Representative created successfully', user: authUser.user });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};


export const listStaffUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    let query = supabaseAdmin.from('profiles').select('*').eq('role', 'staff');

    if (req.user?.role !== 'super_admin') {
      query = query.eq('shop_id', req.user?.shop_id || '');
    }

    const { data: staff, error } = await query;

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ staff });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const validateMemberDataHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { memberData = {}, existingMembers = [] } = req.body;
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    const riskFlags: string[] = [];

    const name = (memberData.full_name || '').trim();
    const email = (memberData.email || '').trim();
    const phone = (memberData.phone || '').trim();
    const role = (memberData.role || '').trim();
    const department = (memberData.department || '').trim();
    const status = (memberData.status || 'Active').trim();
    const password = memberData.password || '';

    // 1. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.push('Email address is required.');
    } else if (!emailRegex.test(email)) {
      errors.push('Invalid email address format.');
    } else {
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain && !['nexusglobal.com', 'nexus.com'].some((cd) => domain === cd || domain.endsWith('.' + cd))) {
        warnings.push(`Email domain '@${domain}' is not a recognized company email (@nexusglobal.com).`);
        suggestions.push(`Consider using corporate email format (e.g. ${name.toLowerCase().replace(/\s+/g, '.')}@nexusglobal.com).`);
      }
    }

    // 2. Phone validation
    if (phone) {
      const digitsOnly = phone.replace(/\D/g, '');
      if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        errors.push('Phone number must contain between 8 and 15 digits.');
      }
    }

    // 3. Name validation
    if (!name) {
      errors.push('Name is required.');
    } else if (name.length < 3) {
      errors.push('Name is too short (minimum 3 characters).');
    } else if (name.length > 100) {
      errors.push('Name is too long (maximum 100 characters).');
    }

    if (/[<>{}\[\]\\\/@#$%^&*()_=+~`|]/.test(name)) {
      errors.push('Name contains invalid special characters.');
      riskFlags.push('Suspicious special characters detected in user name field.');
    }

    // 4. Role validation
    const allowedRoles = ['Super Admin', 'Admin', 'Staff', 'Agent', 'HR', 'Finance', 'Sales', 'Manager'];
    const matchedRole = allowedRoles.find((r) => r.toLowerCase() === role.toLowerCase());
    if (!role) {
      errors.push('Role selection is required.');
    } else if (!matchedRole) {
      errors.push(`Role '${role}' is invalid. Allowed roles: ${allowedRoles.join(', ')}.`);
    }

    // 5. Department alignment
    let roleRecommendation = matchedRole || 'Staff';
    let departmentMatch = department || 'Operations';

    if (matchedRole === 'Sales' && department.toLowerCase() !== 'sales') {
      warnings.push(`Role 'Sales' differs from department '${department}'.`);
      suggestions.push(`Suggest updating department to 'Sales' for optimal workflow access.`);
    }

    // Password strength check
    if (password && (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))) {
      warnings.push('Password does not meet strong complexity recommendations.');
      suggestions.push(`Recommended strong password: 'Nexus#${Math.floor(1000 + Math.random() * 9000)}!Pass'`);
    }

    const isValid = errors.length === 0;

    return res.json({
      isValid,
      validationErrors: errors,
      warnings,
      suggestions,
      aiRecommendations: {
        roleRecommendation,
        departmentMatch,
        riskFlags,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

