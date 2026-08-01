import { prisma } from '../config/db';

const doctorInclude = {
  doctorProfile: {
    include: {
      department: true,
    },
  },
  patientProfile: true,
};

export function formatUser(user: any) {
  if (!user) return null;
  const formatted = { ...user };
  if (user.doctorProfile) {
    Object.assign(formatted, {
      specialization: user.doctorProfile.specialization,
      qualifications: user.doctorProfile.qualifications,
      experienceYears: user.doctorProfile.experienceYears,
      consultationFee: user.doctorProfile.consultationFee,
      departmentId: user.doctorProfile.departmentId,
      department: user.doctorProfile.department,
      weeklySchedule: user.doctorProfile.weeklySchedule,
      averageRating: user.doctorProfile.averageRating,
      ratingsCount: user.doctorProfile.ratingsCount,
      isAvailable: user.doctorProfile.isAvailable,
      bio: user.doctorProfile.bio,
    });
  }
  if (user.patientProfile) {
    Object.assign(formatted, {
      dateOfBirth: user.patientProfile.dateOfBirth,
      gender: user.patientProfile.gender,
      bloodGroup: user.patientProfile.bloodGroup,
      address: user.patientProfile.address,
      emergencyContact: user.patientProfile.emergencyContact,
      allergies: user.patientProfile.allergies,
      chronicConditions: user.patientProfile.chronicConditions,
    });
  }
  return formatted;
}

export class UserRepository {
  /**
   * Find a user by their ID.
   */
  async findById(id: string, _includePassword = false): Promise<any> {
    if (!id) return null;
    const user = await prisma.user.findUnique({
      where: { id: id.toString() },
      include: doctorInclude,
    });
    return formatUser(user);
  }

  /**
   * Find a user by email.
   */
  async findByEmail(email: string, _includePassword = false): Promise<any> {
    if (!email) return null;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: doctorInclude,
    });
    return formatUser(user);
  }

  /**
   * Find user by refresh token hash.
   */
  async findByRefreshTokenHash(hash: string): Promise<any> {
    if (!hash) return null;
    const user = await prisma.user.findFirst({
      where: { refreshTokenHash: hash },
      include: doctorInclude,
    });
    return formatUser(user);
  }

  /**
   * Find user by verification token.
   */
  async findByVerificationTokenHash(hash: string): Promise<any> {
    if (!hash) return null;
    const user = await prisma.user.findFirst({
      where: {
        emailVerifyToken: hash,
        emailVerifyExpiresAt: { gt: new Date() },
      },
      include: doctorInclude,
    });
    return formatUser(user);
  }

  /**
   * Find user by password reset token.
   */
  async findByResetPasswordTokenHash(hash: string): Promise<any> {
    if (!hash) return null;
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hash,
        resetPasswordExpiresAt: { gt: new Date() },
      },
      include: doctorInclude,
    });
    return formatUser(user);
  }

  /**
   * Create a new Patient.
   */
  async createPatient(data: Record<string, any>): Promise<any> {
    const {
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      avatarUrl,
      isActive,
      isEmailVerified,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      allergies,
      chronicConditions,
    } = data;

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: 'patient',
        firstName,
        lastName,
        phone,
        avatarUrl,
        isActive: isActive ?? true,
        isEmailVerified: isEmailVerified ?? false,
        patientProfile: {
          create: {
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender,
            bloodGroup,
            address: address ?? undefined,
            emergencyContact: emergencyContact ?? undefined,
            allergies: allergies ?? [],
            chronicConditions: chronicConditions ?? [],
          },
        },
      },
      include: doctorInclude,
    });
    return formatUser(user);
  }

  /**
   * Create a new Doctor.
   */
  async createDoctor(data: Record<string, any>): Promise<any> {
    const {
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      avatarUrl,
      isActive,
      isEmailVerified,
      specialization,
      qualifications,
      experienceYears,
      consultationFee,
      departmentId,
      weeklySchedule,
      averageRating,
      ratingsCount,
      isAvailable,
      bio,
    } = data;

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: 'doctor',
        firstName,
        lastName,
        phone,
        avatarUrl,
        isActive: isActive ?? true,
        isEmailVerified: isEmailVerified ?? false,
        doctorProfile: {
          create: {
            specialization: specialization || 'General Practice',
            qualifications: qualifications || [],
            experienceYears: experienceYears || 0,
            consultationFee: consultationFee || 0,
            departmentId: departmentId || null,
            weeklySchedule: weeklySchedule || [],
            averageRating: averageRating || 0,
            ratingsCount: ratingsCount || 0,
            isAvailable: isAvailable ?? true,
            bio: bio || null,
          },
        },
      },
      include: doctorInclude,
    });
    return formatUser(user);
  }

  /**
   * Create a base/Admin User.
   */
  async createAdmin(data: Record<string, any>): Promise<any> {
    const { email, passwordHash, firstName, lastName, phone, avatarUrl, isActive, isEmailVerified } = data;
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: 'admin',
        firstName,
        lastName,
        phone,
        avatarUrl,
        isActive: isActive ?? true,
        isEmailVerified: isEmailVerified ?? false,
      },
      include: doctorInclude,
    });
    return formatUser(user);
  }

  /**
   * Update a user document.
   */
  async update(id: string, updateData: Record<string, any>): Promise<any> {
    const userId = id.toString();

    const userFields: Record<string, any> = {};
    const doctorFields: Record<string, any> = {};
    const patientFields: Record<string, any> = {};

    const docKeys = [
      'specialization', 'qualifications', 'experienceYears', 'consultationFee',
      'departmentId', 'weeklySchedule', 'averageRating', 'ratingsCount', 'isAvailable', 'bio'
    ];
    const patKeys = [
      'dateOfBirth', 'gender', 'bloodGroup', 'address', 'emergencyContact', 'allergies', 'chronicConditions'
    ];

    for (const [k, v] of Object.entries(updateData)) {
      if (k === 'emailVerifyToken' && typeof v === 'object' && v !== null) {
        userFields.emailVerifyToken = v.tokenHash;
        userFields.emailVerifyExpiresAt = v.expiresAt;
      } else if (k === 'resetPasswordToken' && typeof v === 'object' && v !== null) {
        userFields.resetPasswordToken = v.tokenHash;
        userFields.resetPasswordExpiresAt = v.expiresAt;
      } else if (docKeys.includes(k)) {
        doctorFields[k] = v;
      } else if (patKeys.includes(k)) {
        patientFields[k] = v;
      } else {
        userFields[k] = v;
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...userFields,
        ...(Object.keys(doctorFields).length > 0 && {
          doctorProfile: {
            upsert: {
              create: doctorFields as any,
              update: doctorFields as any,
            },
          },
        }),
        ...(Object.keys(patientFields).length > 0 && {
          patientProfile: {
            upsert: {
              create: patientFields as any,
              update: patientFields as any,
            },
          },
        }),
      },
      include: doctorInclude,
    });

    return formatUser(updated);
  }

  /**
   * Invalidate all refresh tokens for a family (revoke entire family session).
   */
  async revokeRefreshFamily(familyId: string): Promise<void> {
    if (!familyId) return;
    await prisma.user.updateMany({
      where: { refreshFamilyId: familyId.toString() },
      data: { refreshTokenHash: null, refreshFamilyId: null },
    });
  }

  /**
   * List all active/available doctors.
   */
  async findActiveDoctors(filters: Record<string, any> = {}): Promise<any[]> {
    const where: any = {
      role: 'doctor',
      isActive: true,
      doctorProfile: {
        isAvailable: true,
      },
    };

    if (filters.departmentId) {
      where.doctorProfile.departmentId = filters.departmentId;
    }

    const users = await prisma.user.findMany({
      where,
      include: doctorInclude,
    });

    return users.map(formatUser);
  }
}

export const userRepo = new UserRepository();
export default userRepo;
