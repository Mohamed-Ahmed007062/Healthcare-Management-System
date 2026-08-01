import { prisma } from '../config/db';

export class AnalyticsService {
  /**
   * Get role-specific dashboard metrics & weekly chart activity from PostgreSQL.
   */
  async getOverview(userId: string, role: string) {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    let roleMetrics: Record<string, any> = {};

    if (role === 'admin') {
      const [totalPatients, activeDoctors, totalAppointments, completedAppointments, revenueAgg] =
        await Promise.all([
          prisma.user.count({ where: { role: 'patient', isActive: true } }),
          prisma.user.count({ where: { role: 'doctor', isActive: true } }),
          prisma.appointment.count(),
          prisma.appointment.count({ where: { status: 'completed' } }),
          prisma.appointment.findMany({
            where: { status: { in: ['confirmed', 'completed'] } },
            include: {
              doctor: {
                select: { doctorProfile: { select: { consultationFee: true } } },
              },
            },
          }),
        ]);

      const totalRevenue = revenueAgg.reduce((sum, appt) => {
        const fee = appt.doctor?.doctorProfile?.consultationFee || 100;
        return sum + fee;
      }, 0);

      roleMetrics = {
        totalPatients,
        activeDoctors,
        totalAppointments,
        completedAppointments,
        totalRevenue,
      };
    } else if (role === 'doctor') {
      const [todayAppointments, completedConsultations, uniquePatientsAgg, earningsAgg] = await Promise.all([
        prisma.appointment.count({
          where: {
            doctorId: userId,
            slotStart: { gte: startOfToday, lte: endOfToday },
            status: { not: 'cancelled' },
          },
        }),
        prisma.appointment.count({
          where: { doctorId: userId, status: 'completed' },
        }),
        prisma.appointment.findMany({
          where: { doctorId: userId },
          select: { patientId: true },
          distinct: ['patientId'],
        }),
        prisma.appointment.findMany({
          where: { doctorId: userId, status: { in: ['confirmed', 'completed'] } },
          include: {
            doctor: { select: { doctorProfile: { select: { consultationFee: true } } } },
          },
        }),
      ]);

      const totalEarnings = earningsAgg.reduce((sum, appt) => {
        const fee = appt.doctor?.doctorProfile?.consultationFee || 100;
        return sum + fee;
      }, 0);

      roleMetrics = {
        todayAppointments,
        completedConsultations,
        totalPatients: uniquePatientsAgg.length,
        totalEarnings,
      };
    } else {
      // Patient metrics
      const [totalConsultations, upcomingAppointments, medicalRecordsCount, latestPrescription] = await Promise.all([
        prisma.appointment.count({ where: { patientId: userId } }),
        prisma.appointment.count({
          where: {
            patientId: userId,
            status: 'confirmed',
            slotStart: { gte: now },
          },
        }),
        prisma.medicalRecord.count({ where: { patientId: userId } }),
        prisma.prescription.findFirst({
          where: { patientId: userId },
          orderBy: { createdAt: 'desc' },
          include: {
            doctor: { select: { firstName: true, lastName: true } },
          },
        }),
      ]);

      roleMetrics = {
        totalConsultations,
        upcomingAppointments,
        medicalRecordsCount,
        latestPrescription: latestPrescription
          ? {
              id: latestPrescription.id,
              doctorName: `Dr. ${latestPrescription.doctor.firstName} ${latestPrescription.doctor.lastName}`,
              createdAt: latestPrescription.createdAt,
            }
          : null,
      };
    }

    // Generate weekly 7-day consultation activity for SVG chart
    const weeklyActivity: Array<{ day: string; count: number }> = [];
    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const dayDate = new Date();
      dayDate.setDate(now.getDate() - i);
      const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0);
      const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59);

      const whereCondition: any = {
        slotStart: { gte: dayStart, lte: dayEnd },
        status: { not: 'cancelled' },
      };

      if (role === 'doctor') whereCondition.doctorId = userId;
      else if (role === 'patient') whereCondition.patientId = userId;

      const count = await prisma.appointment.count({ where: whereCondition });

      weeklyActivity.push({
        day: daysName[dayDate.getDay()],
        count,
      });
    }

    return {
      role,
      metrics: roleMetrics,
      weeklyActivity,
    };
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;
