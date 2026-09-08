export interface MemberInputData {
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  status?: string;
  shop_id?: string;
  password?: string;
}

export interface AIRecommendations {
  roleRecommendation: string;
  departmentMatch: string;
  riskFlags: string[];
}

export interface MemberValidationResult {
  isValid: boolean;
  validationErrors: string[];
  warnings: string[];
  suggestions: string[];
  aiRecommendations: AIRecommendations;
}

export const PREDEFINED_ROLES = [
  'Super Admin',
  'Admin',
  'Staff',
  'Agent',
  'HR',
  'Finance',
  'Sales',
  'Manager',
];

export const PREDEFINED_DEPARTMENTS = [
  'Sales',
  'HR',
  'Finance',
  'Support',
  'Engineering',
  'Operations',
  'Administration',
  'CRM',
];

export const COMPANY_DOMAINS = ['nexusglobal.com', 'nexus.com'];

/**
 * Validates and suggests improvements for member data according to Nexus Global rules.
 */
export function validateMemberData(
  data: MemberInputData,
  existingMembers: MemberInputData[] = []
): MemberValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  const riskFlags: string[] = [];

  const name = (data.full_name || '').trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();
  const role = (data.role || '').trim();
  const department = (data.department || '').trim();
  const status = (data.status || 'Active').trim();
  const shopId = (data.shop_id || '').trim();
  const password = data.password || '';

  // 1. Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    errors.push('Email address is required.');
  } else if (!emailRegex.test(email)) {
    errors.push('Invalid email address format.');
  } else {
    // Check company domain
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && !COMPANY_DOMAINS.some((cd) => domain === cd || domain.endsWith('.' + cd))) {
      warnings.push(`Email domain '@${domain}' is not a recognized company email (@nexusglobal.com). Please confirm if external domain is intended.`);
      suggestions.push(`Consider using corporate email format (e.g. ${name.toLowerCase().replace(/\s+/g, '.')}@nexusglobal.com).`);
    }
  }


  // 2. Phone number validation (if provided)
  if (phone) {
    const phoneRegex = /^\+?[1-9]\d{7,14}$/;
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) {
      errors.push('Phone number must contain between 8 and 15 digits.');
    } else if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      warnings.push('Phone number should use standard international format (e.g., +1234567890).');
    }

    // Check phone duplicates
    const phoneDuplicate = existingMembers.find(
      (m) => m.phone && m.phone.replace(/\D/g, '') === digitsOnly && m.email !== email
    );
    if (phoneDuplicate) {
      warnings.push(`Phone number '${phone}' is already associated with member '${phoneDuplicate.full_name}'.`);
      suggestions.push(`Check for duplicate profiles or verify phone number ownership.`);
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

  const specialCharRegex = /[<>{}\[\]\\\/@#$%^&*()_=+~`|]/;
  if (specialCharRegex.test(name)) {
    errors.push('Name contains invalid special characters.');
    riskFlags.push('Suspicious special characters detected in user name field.');
  }

  // 4. Role validation
  const normalizedRoleMap: Record<string, string> = {
    'super_admin': 'Super Admin',
    'super admin': 'Super Admin',
    'admin': 'Admin',
    'staff': 'Staff',
    'agent': 'Agent',
    'hr': 'HR',
    'finance': 'Finance',
    'sales': 'Sales',
    'manager': 'Manager',
  };

  const matchedRole = normalizedRoleMap[role.toLowerCase()] || PREDEFINED_ROLES.find(r => r.toLowerCase() === role.toLowerCase());
  if (!role) {
    errors.push('Role selection is required.');
  } else if (!matchedRole) {
    errors.push(`Role '${role}' is invalid. Allowed roles: ${PREDEFINED_ROLES.join(', ')}.`);
  }

  // 5. Department validation & Role Mismatch check
  let matchedDepartment = PREDEFINED_DEPARTMENTS.find(d => d.toLowerCase() === department.toLowerCase());
  if (department && !matchedDepartment) {
    errors.push(`Department '${department}' is invalid. Allowed departments: ${PREDEFINED_DEPARTMENTS.join(', ')}.`);
  }

  // AI Recommendation for Department and Role Alignment
  let roleRecommendation = matchedRole || 'Staff';
  let departmentMatch = matchedDepartment || 'Operations';

  if (matchedRole === 'Super Admin' || matchedRole === 'Admin') {
    departmentMatch = 'Administration';
    if (department && department.toLowerCase() !== 'administration') {
      suggestions.push(`Admins are typically assigned to the 'Administration' department.`);
    }
  } else if (matchedRole === 'Sales') {
    departmentMatch = 'Sales';
    if (department && department.toLowerCase() !== 'sales' && department.toLowerCase() !== 'crm') {
      warnings.push(`Role 'Sales' differs from department '${department}'.`);
      suggestions.push(`Suggest updating department to 'Sales' or 'CRM' for optimal workflow access.`);
    }
  } else if (matchedRole === 'HR') {
    departmentMatch = 'HR';
    if (department && department.toLowerCase() !== 'hr') {
      warnings.push(`Role 'HR' mismatch with department '${department}'.`);
      suggestions.push(`Suggest updating department to 'HR'.`);
    }
  } else if (matchedRole === 'Finance') {
    departmentMatch = 'Finance';
    if (department && department.toLowerCase() !== 'finance') {
      warnings.push(`Role 'Finance' mismatch with department '${department}'.`);
      suggestions.push(`Suggest updating department to 'Finance'.`);
    }
  } else if (matchedRole === 'Agent') {
    departmentMatch = 'CRM';
  } else if (matchedRole === 'Staff') {
    departmentMatch = department || 'Operations';
  }

  // If department wasn't provided, suggest matching department
  if (!department && matchedRole) {
    suggestions.push(`Suggested department for '${matchedRole}': ${departmentMatch}.`);
  }

  // 6. Status validation
  if (status && status.toLowerCase() !== 'active' && status.toLowerCase() !== 'inactive') {
    errors.push(`Status '${status}' is invalid. Allowed values: Active, Inactive.`);
  }

  // 7. Shop Assignment validation
  if (!shopId) {
    warnings.push('No Shop Assignment provided. Member will be assigned to main tenant default shop.');
    suggestions.push('Assign a specific Shop ID for multi-location access control.');
  }

  // SUGGESTION LOGIC & DUPLICATE CHECKS
  if (email && existingMembers.length > 0) {
    const duplicateEmail = existingMembers.find(
      (m) => m.email.toLowerCase() === email.toLowerCase()
    );
    if (duplicateEmail) {
      errors.push(`Duplicate email detected: '${email}' is already registered to member '${duplicateEmail.full_name}'.`);
      suggestions.push(`Consider updating existing member account instead of creating a duplicate.`);
      riskFlags.push('Duplicate identity detection triggered.');
    } else {
      // Check similar names
      const duplicateName = existingMembers.find(
        (m) => m.full_name.toLowerCase() === name.toLowerCase()
      );
      if (duplicateName) {
        warnings.push(`Member with name '${duplicateName.full_name}' already exists (${duplicateName.email}).`);
        suggestions.push('Verify if this is a duplicate team member or separate individual with identical name.');
      }
    }
  }

  // Weak password check & recommendation
  if (password) {
    const isWeak =
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/[a-z]/.test(password) ||
      !/[0-9]/.test(password) ||
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (isWeak) {
      warnings.push('Password does not meet strong complexity recommendations (min 8 chars with uppercase, lowercase, numbers, and symbols).');
      const suggestedPass = `Nexus#${Math.floor(1000 + Math.random() * 9000)}!Pass`;
      suggestions.push(`Recommended strong password: '${suggestedPass}'`);
    }
  }

  // SECURITY CHECKS
  if (matchedRole === 'Super Admin') {
    riskFlags.push('High-privilege role (Super Admin) requested. Confirm administrative authorization.');
  }

  const suspiciousPatterns = ['<script', 'javascript:', 'SELECT ', 'DROP TABLE', 'DELETE FROM', 'UNION SELECT', 'OR 1=1'];
  const rawInput = `${name} ${email} ${role} ${department} ${shopId}`.toUpperCase();
  if (suspiciousPatterns.some((pattern) => rawInput.includes(pattern.toUpperCase()))) {
    errors.push('Security Alert: Suspicious script or query payload detected in member input.');
    riskFlags.push('Possible code injection attack pattern detected in input payload.');
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    validationErrors: errors,
    warnings,
    suggestions,
    aiRecommendations: {
      roleRecommendation,
      departmentMatch,
      riskFlags,
    },
  };
}

/**
 * Call backend validation API endpoint with fallback to local validation function.
 */
export async function validateMemberViaApi(
  data: MemberInputData,
  existingMembers: MemberInputData[] = []
): Promise<MemberValidationResult> {
  try {
    const response = await fetch('/api/staff/validate-member', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ memberData: data, existingMembers }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result && typeof result.isValid === 'boolean') {
        return result as MemberValidationResult;
      }
    }
  } catch (err) {
    console.warn('Backend API validation offline, running local rule engine:', err);
  }

  // Fallback to local deterministic rule engine
  return validateMemberData(data, existingMembers);
}
