import type { Request, Response } from 'express';
import appointmentService from '../services/appointment.service';
import ApiResponse from '../utils/ApiResponse';

export class AppointmentController {
  async book(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentService.bookAppointment({
      ...req.body,
      patientId: req.user!.id as string,
    });
    res.status(201).json(new ApiResponse(201, appointment, 'Appointment booked successfully'));
  }

  async list(req: Request, res: Response): Promise<void> {
    const { page, limit, sortBy, sortOrder, ...filters } = req.query;
    const pagination = { page: Number(page), limit: Number(limit) };
    
    const result = await appointmentService.getAppointments(
      req.user!.id as string,
      req.user!.role,
      filters,
      pagination
    );
    res.status(200).json(new ApiResponse(200, result, 'Appointments fetched successfully'));
  }

  async getById(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentService.getAppointmentById(
      req.params.id,
      req.user!.id as string,
      req.user!.role
    );
    res.status(200).json(new ApiResponse(200, appointment, 'Appointment fetched successfully'));
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentService.updateAppointmentStatus(
      req.params.id,
      req.body.status,
      req.user!.id as string,
      req.user!.role
    );
    res.status(200).json(new ApiResponse(200, appointment, 'Appointment status updated successfully'));
  }

  async cancel(req: Request, res: Response): Promise<void> {
    const appointment = await appointmentService.updateAppointmentStatus(
      req.params.id,
      'cancelled',
      req.user!.id as string,
      req.user!.role
    );
    res.status(200).json(new ApiResponse(200, appointment, 'Appointment cancelled successfully'));
  }

  async getAvailableSlots(req: Request, res: Response): Promise<void> {
    const slots = await appointmentService.getDoctorAvailableSlots(
      req.params.doctorId,
      new Date(req.query.date as string)
    );
    res.status(200).json(new ApiResponse(200, slots, 'Available slots fetched successfully'));
  }

  async listDoctors(req: Request, res: Response): Promise<void> {
    const filters: Record<string, any> = {};
    if (req.query.departmentId) {
      filters.departmentId = req.query.departmentId;
    }
    const doctors = await appointmentService.getDoctors(filters);
    res.status(200).json(new ApiResponse(200, doctors, 'Doctors fetched successfully'));
  }

  async listDepartments(_req: Request, res: Response): Promise<void> {
    const departments = await appointmentService.getDepartments();
    res.status(200).json(new ApiResponse(200, departments, 'Departments fetched successfully'));
  }

  async getVideoSession(req: Request, res: Response): Promise<void> {
    const session = await appointmentService.getVideoSession(
      req.params.id,
      req.user!.id as string,
      req.user!.role
    );
    res.status(200).json(new ApiResponse(200, session, 'Video session fetched successfully'));
  }
}

export const appointmentController = new AppointmentController();
export default appointmentController;
