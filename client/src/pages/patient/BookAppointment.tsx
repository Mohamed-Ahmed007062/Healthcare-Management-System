import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import doctorApi, { type Department } from '../../api/doctor.api';
import appointmentApi from '../../api/appointment.api';
import type { User } from '../../types/auth.types';
import { toast } from 'sonner';
import Card from '../../components/ui/card';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Label from '../../components/ui/label';

export const BookAppointment: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  
  const [doctors, setDoctors] = useState<User[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);

  const [bookingDate, setBookingDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Array<{ start: string; end: string }>>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  
  const [reason, setReason] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('');
  const [meetingType, setMeetingType] = useState<'in_person' | 'video'>('in_person');
  
  const [isLoading, setIsLoading] = useState(false);

  // Stripe-like payment overlay state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Check state for doctor directory redirect
  useEffect(() => {
    if (location.state?.preselectedDoctor) {
      const doc = location.state.preselectedDoctor as User;
      setSelectedDoctor(doc);
      setSelectedDeptId(doc.departmentId || '');
      setStep(2);
    }
  }, [location]);

  // Fetch departments on step 1 mount
  useEffect(() => {
    const fetchDepts = async () => {
      setIsLoading(true);
      try {
        const res = await doctorApi.getDepartments();
        if (res.success) {
          setDepartments(res.data);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load departments');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDepts();
  }, []);

  // Fetch doctors when department is selected
  useEffect(() => {
    if (!selectedDeptId) return;
    const fetchDoctors = async () => {
      setIsLoading(true);
      try {
        const res = await doctorApi.getDoctors({ departmentId: selectedDeptId });
        if (res.success) {
          setDoctors(res.data);
          setSelectedDoctor(null);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load doctors');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoctors();
  }, [selectedDeptId]);

  // Fetch available slots when doctor and date are selected
  useEffect(() => {
    if (!selectedDoctor || !bookingDate) return;
    const fetchSlots = async () => {
      setIsLoading(true);
      try {
        const doctorId = selectedDoctor._id || selectedDoctor.id;
        const res = await appointmentApi.getAvailableSlots(doctorId, bookingDate);
        if (res.success) {
          setAvailableSlots(res.data);
          setSelectedSlot(null);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to fetch available time slots');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDoctor, bookingDate]);

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedSlot) {
      toast.error('Please select a physician and a time slot');
      return;
    }
    setIsPaymentOpen(true);
  };

  const submitBooking = async () => {
    if (!selectedDoctor || !selectedSlot) return;

    const symptoms = symptomsInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setIsProcessingPayment(true);
    try {
      // Simulating Stripe payment gateway transaction processing
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const res = await appointmentApi.book({
        doctorId: selectedDoctor._id || selectedDoctor.id,
        slot: selectedSlot,
        reason,
        symptoms,
        meetingType
      });

      if (res.success) {
        toast.success('Consultation fee authorized! Appointment booked successfully.');
        setIsPaymentOpen(false);
        navigate('/appointments');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Payment transaction failed');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1 && !selectedDoctor) {
      toast.error('Please choose a medical physician first');
      return;
    }
    if (step === 2 && (!bookingDate || !selectedSlot)) {
      toast.error('Please select date and a time slot');
      return;
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-850 dark:text-white">
          Book Appointment
        </h1>
        <p className="text-sm text-slate-550 dark:text-slate-400">
          Book a consultation with our medical specialists in a few simple steps.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl p-4 shadow-xs">
        <div className="flex items-center space-x-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 1 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-450 dark:bg-slate-900'
          }`}>1</span>
          <span className={`text-xs sm:text-sm font-bold ${step >= 1 ? 'text-slate-850 dark:text-white' : 'text-slate-400'}`}>
            Physician
          </span>
        </div>
        <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-center space-x-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 2 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-450 dark:bg-slate-900'
          }`}>2</span>
          <span className={`text-xs sm:text-sm font-bold ${step >= 2 ? 'text-slate-850 dark:text-white' : 'text-slate-400'}`}>
            Schedule
          </span>
        </div>
        <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-800" />
        <div className="flex items-center space-x-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            step >= 3 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-450 dark:bg-slate-900'
          }`}>3</span>
          <span className={`text-xs sm:text-sm font-bold ${step >= 3 ? 'text-slate-850 dark:text-white' : 'text-slate-400'}`}>
            Details
          </span>
        </div>
      </div>

      {/* STEP 1: Select Department & Doctor */}
      {step === 1 && (
        <Card className="p-6 space-y-6">
          {/* Department Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">1. Choose Clinic Specialization Department</Label>
            {isLoading && departments.length === 0 ? (
              <div className="h-10 w-full bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg" />
            ) : (
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
              >
                <option value="">Select a department...</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Doctor Selection */}
          {selectedDeptId && (
            <div className="space-y-4">
              <Label className="text-sm font-bold">2. Choose Medical Practitioner / Doctor</Label>
              {isLoading && doctors.length === 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg border border-slate-200 dark:border-slate-800" />
                  ))}
                </div>
              ) : doctors.length === 0 ? (
                <p className="text-sm text-slate-450">No doctors available in this department currently.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {doctors.map((doc) => (
                    <div
                      key={doc._id || doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        (selectedDoctor?._id || selectedDoctor?.id) === (doc._id || doc.id)
                          ? 'border-brand-600 bg-brand-50/30 dark:bg-brand-950/10 ring-2 ring-brand-600'
                          : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm">
                          Dr. {doc.firstName} {doc.lastName}
                        </h3>
                        <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold uppercase mt-0.5">
                          {doc.specialization}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 dark:border-slate-850 text-xs text-slate-500">
                        <span>Fee: ${doc.consultationFee}</span>
                        <span>Exp: {doc.experienceYears} Years</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-850">
            <Button onClick={handleNextStep} disabled={!selectedDoctor}>
              Next Step
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: Select Date & Available Slot */}
      {step === 2 && selectedDoctor && (
        <Card className="p-6 space-y-6">
          <div className="flex items-center space-x-3 bg-brand-50/50 dark:bg-brand-950/10 p-3 rounded-lg border border-brand-100 dark:border-brand-900/30">
            <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-655 font-bold flex items-center justify-center text-sm">
              {selectedDoctor.firstName[0]}
              {selectedDoctor.lastName[0]}
            </div>
            <div>
              <h4 className="font-bold text-slate-850 dark:text-white text-sm">
                Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
              </h4>
              <p className="text-xs text-brand-600 dark:text-brand-400 uppercase font-semibold">
                {selectedDoctor.specialization}
              </p>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-3">
            <Label htmlFor="booking-date" className="text-sm font-bold">1. Select Appointment Date</Label>
            <Input
              id="booking-date"
              type="date"
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full"
            />
          </div>

          {/* Slots Selector */}
          {bookingDate && (
            <div className="space-y-4">
              <Label className="text-sm font-bold">2. Select Available Hour Slot</Label>
              {isLoading && availableSlots.length === 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-10 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : availableSlots.length === 0 ? (
                <p className="text-sm text-slate-450">No available slots found for this physician on this date.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {availableSlots.map((slot, index) => {
                    const startStr = new Date(slot.start).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const isSelected = selectedSlot?.start === slot.start;

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 text-xs sm:text-sm font-bold rounded-lg border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        {startStr}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-850">
            <Button type="button" variant="outline" onClick={handlePrevStep}>
              Back
            </Button>
            <Button onClick={handleNextStep} disabled={!selectedSlot}>
              Next Step
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: Confirm & Details */}
      {step === 3 && selectedDoctor && selectedSlot && (
        <Card className="p-6">
          <form onSubmit={handleBook} className="space-y-6">
            {/* Booking Summary */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-850 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Booking Summary
              </h3>
              <div className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
                <div className="flex justify-between py-2">
                  <span className="text-slate-450">Physician:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Dr. {selectedDoctor.firstName} {selectedDoctor.lastName} ({selectedDoctor.specialization})
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-450">Date & Hour:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {new Date(selectedSlot.start).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
                    {new Date(selectedSlot.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-450">Consultation Fee:</span>
                  <span className="font-bold text-brand-600 dark:text-brand-400">
                    ${selectedDoctor.consultationFee}
                  </span>
                </div>
              </div>
            </div>

            {/* Meeting Type */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">Consultation Format</Label>
              <div className="grid grid-cols-2 gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setMeetingType('in_person')}
                  className={`py-3 px-4 rounded-lg border text-sm font-bold text-center transition-all cursor-pointer ${
                    meetingType === 'in_person'
                      ? 'border-brand-600 bg-brand-50/30 dark:bg-brand-950/10 ring-2 ring-brand-600 text-brand-600 dark:text-brand-400'
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-655'
                  }`}
                >
                  In-Person Visit
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingType('video')}
                  className={`py-3 px-4 rounded-lg border text-sm font-bold text-center transition-all cursor-pointer ${
                    meetingType === 'video'
                      ? 'border-brand-600 bg-brand-50/30 dark:bg-brand-950/10 ring-2 ring-brand-600 text-brand-600 dark:text-brand-400'
                      : 'border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-655'
                  }`}
                >
                  Telehealth Video Consultation
                </button>
              </div>
            </div>

            {/* Visit Reason */}
            <div>
              <Label htmlFor="visit-reason" className="text-sm font-bold">Reason for Visit</Label>
              <Input
                id="visit-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Annual checkup, chest pain, prescription renewal"
                required
                className="mt-1"
              />
            </div>

            {/* Symptoms */}
            <div>
              <Label htmlFor="visit-symptoms" className="text-sm font-bold">Current Symptoms (Optional)</Label>
              <Input
                id="visit-symptoms"
                value={symptomsInput}
                onChange={(e) => setSymptomsInput(e.target.value)}
                placeholder="e.g. fever, headache, cough (separated by commas)"
                className="mt-1"
              />
            </div>

            {/* Navigation Actions */}
             <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-850">
              <Button type="button" variant="outline" onClick={handlePrevStep} disabled={isProcessingPayment}>
                Back
              </Button>
              <Button type="submit" isLoading={isProcessingPayment}>
                Confirm & Book Appointment
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* MOCK CREDIT CARD CHECKOUT MODAL */}
      {isPaymentOpen && selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
                Secure Checkout
              </h2>
              <button
                type="button"
                onClick={() => setIsPaymentOpen(false)}
                className="text-slate-400 hover:text-slate-655 cursor-pointer"
                disabled={isProcessingPayment}
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Payment Details info summary */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-150 dark:border-slate-850 flex justify-between items-center text-xs">
                <div>
                  <p className="text-slate-400 font-bold uppercase">Consultation Payment</p>
                  <p className="font-extrabold text-slate-800 dark:text-slate-205 mt-0.5">
                    Dr. {selectedDoctor.firstName} {selectedDoctor.lastName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-slate-400 font-bold uppercase">Total Due</p>
                  <p className="font-extrabold text-brand-600 dark:text-brand-400 text-sm mt-0.5">
                    ${selectedDoctor.consultationFee}
                  </p>
                </div>
              </div>

              {/* Card Inputs form */}
              <div className="space-y-3.5">
                <div>
                  <Label htmlFor="card-name" className="text-[10px] font-bold uppercase text-slate-450">Cardholder Name</Label>
                  <Input
                    id="card-name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    required
                    disabled={isProcessingPayment}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="card-num" className="text-[10px] font-bold uppercase text-slate-450">Card Number</Label>
                  <div className="relative">
                    <Input
                      id="card-num"
                      type="text"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                        const matches = val.match(/\d{4,16}/g);
                        const match = (matches && matches[0]) || '';
                        const parts = [];
                        for (let i = 0, len = match.length; i < len; i += 4) {
                          parts.push(match.substring(i, i + 4));
                        }
                        if (parts.length > 0) {
                          setCardNumber(parts.join(' '));
                        } else {
                          setCardNumber(val);
                        }
                      }}
                      placeholder="4000 1234 5678 9010"
                      required
                      disabled={isProcessingPayment}
                      className="mt-1 pr-10"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="card-exp" className="text-[10px] font-bold uppercase text-slate-450">Expiration (MM/YY)</Label>
                    <Input
                      id="card-exp"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                        if (val.length >= 2) {
                          val = val.substring(0, 2) + '/' + val.substring(2, 4);
                        }
                        setCardExpiry(val);
                      }}
                      placeholder="12/28"
                      required
                      disabled={isProcessingPayment}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="card-cvv" className="text-[10px] font-bold uppercase text-slate-450">CVV</Label>
                    <Input
                      id="card-cvv"
                      type="password"
                      maxLength={3}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="123"
                      required
                      disabled={isProcessingPayment}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-850">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentOpen(false)}
                disabled={isProcessingPayment}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={submitBooking}
                isLoading={isProcessingPayment}
                className="bg-brand-600 hover:bg-brand-700 text-white"
              >
                Pay & Book Consultation
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BookAppointment;
