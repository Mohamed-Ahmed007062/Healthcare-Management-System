import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authSlice';
import authApi from '../../api/auth.api';
import appointmentApi from '../../api/appointment.api';
import medicalRecordApi from '../../api/medicalRecord.api';
import type { Appointment } from '../../types/appointment.types';
import Button from '../../components/ui/button';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { toast } from 'sonner';
import MedicalHistoryTimeline from '../../components/medical/MedicalHistoryTimeline';

export const Dashboard: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [checkingDb, setCheckingDb] = useState(false);

  // Dynamic statistics state
  const [totalAppointments, setTotalAppointments] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [uniquePatients, setUniquePatients] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]); // Mon..Sun counts

  const testDbConnection = async () => {
    setCheckingDb(true);
    try {
      const response = await authApi.checkDbHealth();
      setDbStatus(response.data.database === 'connected' ? 'connected' : 'disconnected');
      toast.success(response.message || 'Database test successful!');
    } catch (err: any) {
      setDbStatus('error');
      toast.error(err.response?.data?.message || 'Database connection test failed.');
    } finally {
      setCheckingDb(false);
    }
  };

  const fetchStats = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Fetch appointments to calculate statistics
      const apptRes = await appointmentApi.list();
      if (apptRes.success) {
        const appts = (apptRes.data as any).data || apptRes.data;
        if (Array.isArray(appts)) {
          setTotalAppointments(appts.length);
          
          // Filter upcoming confirmed
          const confirmed = appts.filter((a: Appointment) => a.status === 'confirmed');
          setUpcomingCount(confirmed.length);

          // Get next upcoming confirmed appointment
          const sortedConfirmed = [...confirmed].sort((a, b) => 
            new Date(a.slot.start).getTime() - new Date(b.slot.start).getTime()
          );
          if (sortedConfirmed.length > 0) {
            setNextAppointment(sortedConfirmed[0]);
          }

          // Role-specific calculations
          if (user.role === 'doctor') {
            // Count unique patients
            const patientIds = new Set(appts.map((a: Appointment) => {
              if (a.patientId && typeof a.patientId === 'object') {
                return a.patientId._id || (a.patientId as any).id;
              }
              return a.patientId;
            }).filter(Boolean));
            setUniquePatients(patientIds.size);

            // Sum consultation fees for confirmed/completed appointments
            let earningsSum = 0;
            appts.forEach((a: Appointment) => {
              if (['confirmed', 'completed'].includes(a.status)) {
                const doctorFee = typeof a.doctorId === 'object' 
                  ? (a.doctorId as any).consultationFee 
                  : user.consultationFee;
                earningsSum += Number(doctorFee || 50);
              }
            });
            setTotalEarnings(earningsSum);
          }

          // Calculate weekly chart activity (index 0 = Monday ... 6 = Sunday)
          const daysActivity = [0, 0, 0, 0, 0, 0, 0];
          appts.forEach((appt: Appointment) => {
            if (appt.slot?.start) {
              const date = new Date(appt.slot.start);
              const day = date.getDay();
              const index = day === 0 ? 6 : day - 1;
              daysActivity[index] += 1;
            }
          });
          setWeeklyActivity(daysActivity);
        }
      }

      // 2. Fetch medical records count for patient
      if (user.role === 'patient') {
        const targetId = user._id || user.id;
        if (targetId) {
          const recordRes = await medicalRecordApi.getByPatient(targetId);
          if (recordRes.success) {
            const recordsData = (recordRes.data as any).data || recordRes.data;
            if (Array.isArray(recordsData)) {
              setTotalRecords(recordsData.length);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!user) return null;

  // Max value of weekly activity to scale SVG chart heights
  const maxActivityValue = Math.max(...weeklyActivity, 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-accent-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-heading">
            Welcome back, {user.firstName}!
          </h1>
          <p className="mt-2 text-brand-100 max-w-xl text-xs sm:text-sm md:text-base">
            This is your clinical workspace. You are currently logged in as a{' '}
            <strong className="underline uppercase tracking-wider">{user.role}</strong>.
          </p>
        </div>
        <div className="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-center">
          <span className="text-[10px] uppercase tracking-wider font-extrabold block text-brand-100">Local Time</span>
          <span className="text-sm sm:text-base font-extrabold font-mono">
            {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Analytics Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {user.role === 'patient' && (
          <>
            <Card className="p-5 flex items-center justify-between border-slate-150 dark:border-slate-850 hover:shadow-xs transition-shadow">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Total Consultations</p>
                <p className="text-3xl font-extrabold text-slate-850 dark:text-white mt-1">{totalAppointments}</p>
                <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold block mt-1">On-file consultations</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </Card>

            <Card className="p-5 flex items-center justify-between border-slate-150 dark:border-slate-850 hover:shadow-xs transition-shadow">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Upcoming Confirmed</p>
                <p className="text-3xl font-extrabold text-slate-850 dark:text-white mt-1">{upcomingCount}</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">Confirmed appointments</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </Card>

            <Card className="p-5 flex items-center justify-between border-slate-150 dark:border-slate-850 hover:shadow-xs transition-shadow">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Medical Reports</p>
                <p className="text-3xl font-extrabold text-slate-850 dark:text-white mt-1">{totalRecords}</p>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1">Scans & Lab reports</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </Card>
          </>
        )}

        {user.role === 'doctor' && (
          <>
            <Card className="p-5 flex items-center justify-between border-slate-150 dark:border-slate-850 hover:shadow-xs transition-shadow">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Active Patients</p>
                <p className="text-3xl font-extrabold text-slate-850 dark:text-white mt-1">{uniquePatients}</p>
                <span className="text-[10px] text-brand-600 dark:text-brand-400 font-bold block mt-1">Unique patients treated</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </Card>

            <Card className="p-5 flex items-center justify-between border-slate-150 dark:border-slate-850 hover:shadow-xs transition-shadow">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Today's Appointments</p>
                <p className="text-3xl font-extrabold text-slate-850 dark:text-white mt-1">{totalAppointments}</p>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">Appointments on schedule</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </Card>

            <Card className="p-5 flex items-center justify-between border-slate-150 dark:border-slate-850 hover:shadow-xs transition-shadow">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-450 tracking-wider">Total Income</p>
                <p className="text-3xl font-extrabold text-slate-850 dark:text-white mt-1">${totalEarnings}</p>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block mt-1">Consultation fees collected</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/20 dark:text-indigo-400 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V5" />
                </svg>
              </div>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card & Info */}
        <Card className="lg:col-span-2 shadow-md border-slate-150 dark:border-slate-850">
          <CardHeader className="border-b border-slate-100 dark:border-slate-900 pb-3">
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Personal and clinical identification parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-900/60 pb-3">
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase">Full Name</p>
                <p className="font-semibold text-slate-850 dark:text-slate-205">{user.firstName} {user.lastName}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase">Email Address</p>
                <p className="font-semibold text-slate-850 dark:text-slate-205">{user.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-900/60 pb-3">
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase">Role / Auth Level</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 border border-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-900/40 mt-1 capitalize font-bold">
                  {user.role}
                </span>
              </div>
              <div>
                <p className="text-[10px] text-slate-450 font-bold uppercase">Phone Number</p>
                <p className="font-semibold text-slate-850 dark:text-slate-205">{user.phone || 'Not provided'}</p>
              </div>
            </div>

            {/* Role specific rendering */}
            {user.role === 'patient' && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase">Blood Group</p>
                  <p className="font-semibold text-slate-850 dark:text-slate-205 capitalize">{user.bloodGroup || 'unknown'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase">Gender</p>
                  <p className="font-semibold text-slate-850 dark:text-slate-205 capitalize">{user.gender || 'unknown'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase">Date of Birth</p>
                  <p className="font-semibold text-slate-850 dark:text-slate-205">
                    {user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'unknown'}
                  </p>
                </div>
              </div>
            )}

            {user.role === 'doctor' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase">Specialization</p>
                  <p className="font-semibold text-slate-855 dark:text-slate-205">{user.specialization || 'General Practice'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-450 font-bold uppercase">Experience Years</p>
                  <p className="font-semibold text-slate-855 dark:text-slate-205">{user.experienceYears || 0} Years</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Card */}
        <Card className="shadow-md border-slate-150 dark:border-slate-850">
          <CardHeader className="border-b border-slate-100 dark:border-slate-900 pb-3">
            <CardTitle>Clinical Workspace</CardTitle>
            <CardDescription>Common operations and tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <Link to="/appointments" className="block w-full">
              <Button className="w-full justify-center">
                View Appointments
              </Button>
            </Link>
            
            <Link to="/medical-records" className="block w-full">
              <Button variant="outline" className="w-full justify-center">
                Medical Records Portal
              </Button>
            </Link>

            {user.role === 'patient' && (
              <>
                <Link to="/doctors" className="block w-full">
                  <Button variant="outline" className="w-full justify-center">
                    Physicians Directory
                  </Button>
                </Link>
                <Link to="/book-appointment" className="block w-full">
                  <Button variant="outline" className="w-full justify-center">
                    Book Consultation
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Analytics Weekly Consultations Chart (SVG) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md border-slate-150 dark:border-slate-850 p-5">
          <h3 className="font-heading font-bold text-slate-800 dark:text-white text-base mb-1">
            Weekly Consultations Activity
          </h3>
          <p className="text-xs text-slate-450 mb-6">
            Visual statistics of appointment distribution over weekdays.
          </p>
          
          {/* Responsive SVG Chart */}
          <div className="w-full bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-900 rounded-xl p-4 flex flex-col justify-end h-56">
            <svg viewBox="0 0 500 160" className="w-full h-full overflow-visible">
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="480" y2="20" stroke="rgba(203, 213, 225, 0.1)" strokeWidth="1" />
              <line x1="40" y1="70" x2="480" y2="70" stroke="rgba(203, 213, 225, 0.1)" strokeWidth="1" />
              <line x1="40" y1="120" x2="480" y2="120" stroke="rgba(203, 213, 225, 0.1)" strokeWidth="1" />
              <line x1="40" y1="140" x2="480" y2="140" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="1" />

              {/* Bars */}
              {weeklyActivity.map((count, index) => {
                const barWidth = 32;
                const spacing = (440 - barWidth * 7) / 6;
                const x = 40 + index * (barWidth + spacing);
                const barHeight = (count / maxActivityValue) * 100;
                const y = 140 - barHeight;

                return (
                  <g key={index} className="group cursor-pointer">
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      className="fill-brand-600 hover:fill-brand-700 transition-all duration-300"
                    />
                    <text
                      x={x + barWidth / 2}
                      y={y - 6}
                      textAnchor="middle"
                      className="text-[10px] font-extrabold fill-slate-700 dark:fill-slate-350 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {count}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
                const barWidth = 32;
                const spacing = (440 - barWidth * 7) / 6;
                const x = 40 + index * (barWidth + spacing) + barWidth / 2;
                return (
                  <text
                    key={index}
                    x={x}
                    y="155"
                    textAnchor="middle"
                    className="text-[10px] font-bold fill-slate-450"
                  >
                    {day}
                  </text>
                );
              })}

              {/* Y Axis Labels */}
              <text x="30" y="23" textAnchor="end" className="text-[8px] font-bold fill-slate-450">{maxActivityValue}</text>
              <text x="30" y="73" textAnchor="end" className="text-[8px] font-bold fill-slate-450">{Math.round(maxActivityValue / 2)}</text>
              <text x="30" y="123" textAnchor="end" className="text-[8px] font-bold fill-slate-450">0</text>
            </svg>
          </div>
        </Card>

        {/* Next confirmed appointment card info */}
        {nextAppointment ? (
          <Card className="shadow-md border-brand-100 dark:border-brand-900/30 bg-brand-50/20 p-5 flex flex-col justify-between">
            <div>
              <span className="text-[9px] uppercase font-bold bg-brand-100 text-brand-850 px-2 py-0.5 rounded-full border border-brand-200">
                Next Appointment
              </span>
              <h3 className="font-heading font-extrabold text-slate-800 dark:text-white text-base mt-3">
                {user.role === 'patient' 
                  ? `Dr. ${(nextAppointment.doctorId as any).firstName} ${(nextAppointment.doctorId as any).lastName}`
                  : `Patient: ${(nextAppointment.patientId as any).firstName} ${(nextAppointment.patientId as any).lastName}`
                }
              </h3>
              <p className="text-xs text-brand-700 dark:text-brand-400 font-bold uppercase mt-1">
                {(nextAppointment.doctorId as any).specialization || 'Clinical Consult'}
              </p>

              <div className="mt-4 space-y-2 text-xs text-slate-655 dark:text-slate-350">
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-brand-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{new Date(nextAppointment.slot.start).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-brand-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    {new Date(nextAppointment.slot.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} - {' '}
                    {new Date(nextAppointment.slot.end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-brand-100 dark:border-brand-900/20">
              <Link to="/appointments">
                <Button className="w-full justify-center">Manage Consultations</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="shadow-md border-slate-150 dark:border-slate-850 p-5 text-center flex flex-col justify-center">
            <svg className="w-10 h-10 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-slate-450 font-bold">No confirmed appointments scheduled.</p>
            {user.role === 'patient' && (
              <Link to="/book-appointment" className="mt-4 block">
                <Button variant="outline" className="w-full justify-center">Book One Now</Button>
              </Link>
            )}
          </Card>
        )}
      </div>

      {/* Patient Medical History Timeline */}
      {user.role === 'patient' && (
        <div className="mt-8">
          <MedicalHistoryTimeline patientId={user._id || user.id} />
        </div>
      )}

      {/* Database Verification Box */}
      <Card className="shadow-md border-slate-150 dark:border-slate-850 max-w-md">
        <CardHeader>
          <CardTitle>System Integration</CardTitle>
          <CardDescription>Verify live database connectivity through proxy</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testDbConnection}
            variant="outline"
            className="w-full justify-center"
            isLoading={checkingDb}
          >
            Test Mongoose Connection
          </Button>

          {dbStatus && (
            <div className="p-3 rounded-lg border text-center animate-fade-in text-xs font-bold bg-slate-50 dark:bg-slate-900/50">
              {dbStatus === 'connected' && (
                <div className="text-success-600">
                  ● Database connected successfully
                </div>
              )}
              {dbStatus === 'disconnected' && (
                <div className="text-warning-600">
                  ▲ Database is disconnected
                </div>
              )}
              {dbStatus === 'error' && (
                <div className="text-danger-600">
                  × Connection error. Check server logs.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
