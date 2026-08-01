import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authSlice';
import appointmentApi from '../../api/appointment.api';
import prescriptionApi from '../../api/prescription.api';
import type { Appointment, Prescription } from '../../types/appointment.types';
import { toast } from 'sonner';
import Button from '../../components/ui/button';
import Card from '../../components/ui/card';
import Input from '../../components/ui/input';
import Label from '../../components/ui/label';

export const Appointments: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleDownloadPdf = async (prescriptionId: string) => {
    try {
      const blob = await prescriptionApi.downloadPdf(prescriptionId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription-${prescriptionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      toast.error('Failed to download PDF prescription');
    }
  };
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [isPrescriptionCreateOpen, setIsPrescriptionCreateOpen] = useState(false);
  const [activeAppointmentForPrescription, setActiveAppointmentForPrescription] = useState<Appointment | null>(null);
  
  // Prescription creation form state
  const [medications, setMedications] = useState<Array<{ name: string; dosage: string; frequency: string; durationDays: number; instructions: string }>>([
    { name: '', dosage: '', frequency: '', durationDays: 7, instructions: '' }
  ]);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [isSubmittingPrescription, setIsSubmittingPrescription] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, any> = {};
      if (statusFilter) {
        filters.status = statusFilter;
      }
      const res = await appointmentApi.list(filters);
      if (res.success) {
        // Double-check structure. Paginated format has .data containing the items, or it could be flat.
        const listData = (res.data as any).data || res.data;
        setAppointments(Array.isArray(listData) ? listData : []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch appointments');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await appointmentApi.updateStatus(id, newStatus);
      if (res.success) {
        toast.success(`Appointment status updated to ${newStatus}`);
        fetchAppointments();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const res = await appointmentApi.cancel(id);
      if (res.success) {
        toast.success('Appointment cancelled successfully');
        fetchAppointments();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel appointment');
    }
  };

  const viewPrescription = async (appointmentId: string) => {
    try {
      const res = await prescriptionApi.getByAppointment(appointmentId);
      if (res.success) {
        setSelectedPrescription(res.data);
        setIsPrescriptionModalOpen(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'No prescription found for this appointment');
    }
  };

  const openPrescriptionCreate = (appointment: Appointment) => {
    setActiveAppointmentForPrescription(appointment);
    setMedications([{ name: '', dosage: '', frequency: '', durationDays: 7, instructions: '' }]);
    setPrescriptionNotes('');
    setIsPrescriptionCreateOpen(true);
  };

  const handleAddMedicationField = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', durationDays: 7, instructions: '' }]);
  };

  const handleMedicationChange = (index: number, field: string, value: any) => {
    const updated = medications.map((med, idx) => {
      if (idx === index) {
        return { ...med, [field]: value };
      }
      return med;
    });
    setMedications(updated);
  };

  const handleRemoveMedicationField = (index: number) => {
    if (medications.length === 1) return;
    setMedications(medications.filter((_, idx) => idx !== index));
  };

  const submitPrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAppointmentForPrescription) return;
    
    // Validate medications
    const emptyMed = medications.some(m => !m.name || !m.dosage || !m.frequency);
    if (emptyMed) {
      toast.error('Please fill in name, dosage, and frequency for all medications');
      return;
    }

    setIsSubmittingPrescription(true);
    try {
      const patientId = typeof activeAppointmentForPrescription.patientId === 'object'
        ? (activeAppointmentForPrescription.patientId as any)._id
        : activeAppointmentForPrescription.patientId;

      const res = await prescriptionApi.create({
        appointmentId: activeAppointmentForPrescription._id,
        patientId,
        medications,
        notes: prescriptionNotes
      });

      if (res.success) {
        // Also update appointment status to completed
        await appointmentApi.updateStatus(activeAppointmentForPrescription._id, 'completed');
        toast.success('Prescription created and appointment completed successfully');
        setIsPrescriptionCreateOpen(false);
        fetchAppointments();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create prescription');
    } finally {
      setIsSubmittingPrescription(false);
    }
  };

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'completed':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'no_show':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-850 dark:text-white">
            Appointments
          </h1>
          <p className="text-sm text-slate-550 dark:text-slate-400">
            View and manage medical consultations.
          </p>
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
            Filter Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm rounded-lg border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 px-3 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-brand-600 text-slate-800 dark:text-white"
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse border border-slate-200 dark:border-slate-800" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <Card className="text-center p-12 flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">No appointments found</h3>
            <p className="text-sm text-slate-450 mt-1">There are no consultations matching your filters.</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appointments.map((appt) => {
            const doctorObj = typeof appt.doctorId === 'object' ? (appt.doctorId as any) : null;
            const patientObj = typeof appt.patientId === 'object' ? (appt.patientId as any) : null;
            const docName = doctorObj ? `${doctorObj.firstName} ${doctorObj.lastName}` : 'Assigned Doctor';
            const patName = patientObj ? `${patientObj.firstName} ${patientObj.lastName}` : 'Registered Patient';
            
            const start = new Date(appt.slot.start);
            const end = new Date(appt.slot.end);

            return (
              <Card key={appt._id} className="relative overflow-hidden border border-slate-100 dark:border-slate-850 flex flex-col justify-between h-full hover:shadow-md transition-shadow">
                <div className="space-y-4">
                  {/* Top: Status Badge & Meeting Type */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(appt.status)}`}>
                      {appt.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-medium text-slate-400 capitalize">
                      {appt.meetingType.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Body: Doctor & Date details */}
                  <div className="space-y-2.5">
                    <div>
                      <h3 className="font-heading font-bold text-slate-800 dark:text-white text-base">
                        {user?.role === 'patient' ? `Dr. ${docName}` : `Patient: ${patName}`}
                      </h3>
                      {user?.role === 'patient' && doctorObj?.specialization && (
                        <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold uppercase tracking-wider mt-0.5">
                          {doctorObj.specialization}
                        </p>
                      )}
                    </div>

                    {/* Date/Time info */}
                    <div className="flex items-center space-x-2 text-xs text-slate-550 dark:text-slate-400">
                      <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                        {start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {appt.reason && (
                      <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg text-slate-655 dark:text-slate-350">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Reason:</span> {appt.reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-end space-x-2 mt-5 pt-3 border-t border-slate-100 dark:border-slate-900/80">
                  {/* Join Video Call button if it is a video consultation and confirmed */}
                  {appt.meetingType === 'video' && appt.status === 'confirmed' && (
                    <Button
                      onClick={() => navigate(`/appointments/${appt._id}/video`)}
                      size="sm"
                      className="bg-brand-600 hover:bg-brand-700 text-white flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Join Video</span>
                    </Button>
                  )}

                  {/* Doctor actions: Confirm, No Show, Prescription */}
                  {user?.role === 'doctor' && appt.status === 'pending' && (
                    <Button onClick={() => handleStatusChange(appt._id, 'confirmed')} size="sm">
                      Confirm
                    </Button>
                  )}

                  {user?.role === 'doctor' && appt.status === 'confirmed' && (
                    <>
                      <Button onClick={() => handleStatusChange(appt._id, 'no_show')} variant="outline" size="sm" className="border-amber-250 text-amber-600 dark:border-amber-900/40 dark:text-amber-500">
                        No Show
                      </Button>
                      <Button onClick={() => openPrescriptionCreate(appt)} size="sm">
                        Write Prescription
                      </Button>
                    </>
                  )}

                  {/* Anyone can cancel pending/confirmed */}
                  {['pending', 'confirmed'].includes(appt.status) && (
                    <Button onClick={() => handleCancel(appt._id)} variant="outline" size="sm" className="border-red-200 text-red-655 hover:bg-red-50 dark:border-red-950 dark:text-red-500 dark:hover:bg-red-950/20">
                      Cancel
                    </Button>
                  )}

                  {/* View prescription if completed */}
                  {appt.status === 'completed' && appt.prescriptionId && (
                    <Button onClick={() => viewPrescription(appt._id)} variant="outline" size="sm" className="border-brand-200 text-brand-655 dark:border-brand-950 dark:text-brand-400">
                      View Prescription
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL 1: View Prescription */}
      {isPrescriptionModalOpen && selectedPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-950 shadow-xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-4">
              <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
                Prescription Details
              </h2>
              <button
                onClick={() => setIsPrescriptionModalOpen(false)}
                className="text-slate-400 hover:text-slate-655 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Doctor Details */}
              <div className="bg-brand-50 dark:bg-brand-950/20 p-3 rounded-lg border border-brand-100 dark:border-brand-900/30">
                <p className="text-xs text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider">
                  Prescribing Physician
                </p>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Dr. {typeof selectedPrescription.doctorId === 'object' 
                    ? `${(selectedPrescription.doctorId as any).firstName} ${(selectedPrescription.doctorId as any).lastName}` 
                    : 'Assigned Physician'}
                </h4>
              </div>

              {/* Medications List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Prescribed Medications
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-850 border border-slate-100 dark:border-slate-850 rounded-lg overflow-hidden">
                  {selectedPrescription.medications.map((med, idx) => (
                    <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-850 dark:text-white text-sm">
                          {med.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-350 px-2 py-0.5 rounded-full">
                          {med.durationDays} Days
                        </span>
                      </div>
                      <p className="text-xs text-slate-655 dark:text-slate-350">
                        <span className="font-semibold text-slate-700 dark:text-slate-250">Dosage:</span> {med.dosage} | <span className="font-semibold text-slate-700 dark:text-slate-250">Frequency:</span> {med.frequency}
                      </p>
                      {med.instructions && (
                        <p className="text-[11px] italic text-slate-450 mt-1">
                          Note: {med.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor Notes */}
              {selectedPrescription.notes && (
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                    Physician Notes
                  </h3>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-900">
                    {selectedPrescription.notes}
                  </div>
                </div>
              )}

              {/* Close & Download Buttons */}
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  onClick={() => handleDownloadPdf(selectedPrescription._id)}
                  variant="outline"
                  className="border-emerald-250 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-400"
                >
                  Download PDF
                </Button>
                <Button onClick={() => setIsPrescriptionModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL 2: Create Prescription */}
      {isPrescriptionCreateOpen && activeAppointmentForPrescription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl bg-white dark:bg-slate-950 shadow-xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 mb-4">
              <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
                Write Prescription
              </h2>
              <button
                onClick={() => setIsPrescriptionCreateOpen(false)}
                className="text-slate-400 hover:text-slate-655 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={submitPrescription} className="space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Medications
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddMedicationField}
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                  >
                    + Add Medication
                  </button>
                </div>

                {medications.map((med, index) => (
                  <div key={index} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-900 space-y-3 relative">
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicationField(index)}
                        className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-red-500 cursor-pointer"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`med-name-${index}`} className="text-xs font-bold">Medication Name</Label>
                        <Input
                          id={`med-name-${index}`}
                          value={med.name}
                          onChange={(e) => handleMedicationChange(index, 'name', e.target.value)}
                          placeholder="e.g. Paracetamol"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`med-dosage-${index}`} className="text-xs font-bold">Dosage</Label>
                        <Input
                          id={`med-dosage-${index}`}
                          value={med.dosage}
                          onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                          placeholder="e.g. 500mg"
                          required
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`med-freq-${index}`} className="text-xs font-bold">Frequency</Label>
                        <Input
                          id={`med-freq-${index}`}
                          value={med.frequency}
                          onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)}
                          placeholder="e.g. Twice daily"
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`med-duration-${index}`} className="text-xs font-bold">Duration (Days)</Label>
                        <Input
                          id={`med-duration-${index}`}
                          type="number"
                          value={med.durationDays}
                          onChange={(e) => handleMedicationChange(index, 'durationDays', parseInt(e.target.value) || 0)}
                          required
                          min={1}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor={`med-inst-${index}`} className="text-xs font-bold">Instructions (Optional)</Label>
                      <Input
                        id={`med-inst-${index}`}
                        value={med.instructions}
                        onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)}
                        placeholder="e.g. Take after food"
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* General Prescription Notes */}
              <div>
                <Label htmlFor="prescription-notes" className="text-xs font-bold">General Prescription Notes (Optional)</Label>
                <textarea
                  id="prescription-notes"
                  value={prescriptionNotes}
                  onChange={(e) => setPrescriptionNotes(e.target.value)}
                  placeholder="Any additional notes or instructions for the patient..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 p-2.5 text-sm text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-transparent transition-all"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPrescriptionCreateOpen(false)}
                  disabled={isSubmittingPrescription}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={isSubmittingPrescription}
                >
                  Complete & Save
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Appointments;
