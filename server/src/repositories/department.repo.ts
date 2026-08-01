import { prisma } from '../config/db';

export function formatDepartment(dept: any) {
  if (!dept) return null;
  return {
    ...dept,
    _id: dept.id,
  };
}

export class DepartmentRepository {
  /**
   * Find a department by ID.
   */
  async findById(id: string) {
    if (!id) return null;
    const dept = await prisma.department.findUnique({
      where: { id: id.toString() },
    });
    return formatDepartment(dept);
  }

  /**
   * Find a department by name.
   */
  async findByName(name: string) {
    if (!name) return null;
    const dept = await prisma.department.findUnique({
      where: { name },
    });
    return formatDepartment(dept);
  }

  /**
   * List all active departments.
   */
  async listActive() {
    const depts = await prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return depts.map(formatDepartment);
  }

  /**
   * Create a new department.
   */
  async create(data: { name: string; description?: string; headDoctorId?: string }) {
    const dept = await prisma.department.create({
      data: {
        name: data.name,
        description: data.description,
        headDoctorId: data.headDoctorId ? data.headDoctorId.toString() : null,
      },
    });
    return formatDepartment(dept);
  }

  /**
   * Update department head.
   */
  async updateHead(id: string, headDoctorId: string | null) {
    const dept = await prisma.department.update({
      where: { id: id.toString() },
      data: {
        headDoctorId: headDoctorId ? headDoctorId.toString() : null,
      },
    });
    return formatDepartment(dept);
  }
}

export const departmentRepo = new DepartmentRepository();
export default departmentRepo;
