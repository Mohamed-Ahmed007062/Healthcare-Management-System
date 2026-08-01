import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import doctorApi, { type Department } from '../../api/doctor.api';
import type { User } from '../../types/auth.types';
import { toast } from 'sonner';
import Card, { CardHeader, CardContent } from '../../components/ui/card';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Label from '../../components/ui/label';

export const DoctorsDirectory: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [sortBy, setSortBy] = useState('experience'); // experience, fee_asc, fee_desc, name

  // Fetch departments and doctors
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [deptsRes, docsRes] = await Promise.all([
          doctorApi.getDepartments(),
          doctorApi.getDoctors()
        ]);
        
        if (deptsRes.success) setDepartments(deptsRes.data);
        if (docsRes.success) setDoctors(docsRes.data);
      } catch (err: any) {
        toast.error('Failed to load clinic physician directory');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter and sort logic
  const filteredDoctors = doctors
    .filter(doc => {
      const name = `${doc.firstName} ${doc.lastName}`.toLowerCase();
      const spec = doc.specialization?.toLowerCase() || '';
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || spec.includes(searchQuery.toLowerCase());
      
      const deptVal = doc.departmentId as any;
      const docDeptId = deptVal && typeof deptVal === 'object'
        ? (deptVal._id || deptVal.id)
        : deptVal;

      const matchesDept = selectedDeptId ? docDeptId === selectedDeptId : true;
      
      return matchesSearch && matchesDept;
    })
    .sort((a, b) => {
      if (sortBy === 'experience') {
        return (b.experienceYears || 0) - (a.experienceYears || 0);
      }
      if (sortBy === 'fee_asc') {
        return (a.consultationFee || 0) - (b.consultationFee || 0);
      }
      if (sortBy === 'fee_desc') {
        return (b.consultationFee || 0) - (a.consultationFee || 0);
      }
      if (sortBy === 'name') {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
      return 0;
    });

  const getDeptName = (dept: any) => {
    if (!dept) return 'General Medicine';
    if (typeof dept === 'object') {
      return dept.name || 'Medical Clinic';
    }
    const found = departments.find(d => d._id === dept);
    return found ? found.name : 'Medical Clinic';
  };

  const handleBookRedirect = (doctor: User) => {
    // Navigate to wizard passing selected doctor in route state to bypass step 1
    navigate('/book-appointment', { state: { preselectedDoctor: doctor } });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold text-slate-850 dark:text-white">
          Physicians Directory
          </h1>
        <p className="text-sm text-slate-550 dark:text-slate-400">
          Browse and filter expert medical practitioners across clinical specialties.
        </p>
      </div>

      {/* Filter panel */}
      <Card className="p-4 shadow-xs border border-slate-150 dark:border-slate-850">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="search-input" className="text-xs font-bold uppercase text-slate-450">Search Name or Specialty</Label>
            <Input
              id="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Cardiologist, Sarah..."
              className="mt-1 w-full"
            />
          </div>

          <div>
            <Label htmlFor="dept-select" className="text-xs font-bold uppercase text-slate-450">Department</Label>
            <select
              id="dept-select"
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="sort-select" className="text-xs font-bold uppercase text-slate-450">Sort By</Label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full mt-1 rounded-lg border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
            >
              <option value="experience">Experience (Highest First)</option>
              <option value="fee_asc">Consultation Fee (Lowest First)</option>
              <option value="fee_desc">Consultation Fee (Highest First)</option>
              <option value="name">Name (Alphabetical)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Grid of Doctor Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-xl border border-slate-200 dark:border-slate-850" />
          ))}
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl shadow-xs">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-slate-450 font-medium text-sm">No physicians found matching these criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDoctors.map((doc) => (
            <Card key={doc._id || doc.id} className="hover:shadow-md transition-shadow border border-slate-150 dark:border-slate-850 flex flex-col justify-between overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center space-x-3.5 mb-2.5">
                  <div className="w-12 h-12 rounded-full bg-brand-100 text-brand-600 font-bold flex items-center justify-center text-sm">
                    {doc.firstName[0]}{doc.lastName[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-850 dark:text-white text-base">
                      Dr. {doc.firstName} {doc.lastName}
                    </h3>
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                      {doc.specialization || 'Clinical Specialist'}
                    </span>
                  </div>
                </div>
                <div className="mt-1">
                  <span className="text-[10px] bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 px-2 py-0.5 rounded-full uppercase font-bold">
                    {getDeptName(doc.departmentId)}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-slate-100 dark:border-slate-900 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Experience</p>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                      {doc.experienceYears} Years
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Fee</p>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                      ${doc.consultationFee}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Rating</p>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-0.5 flex items-center justify-center text-amber-500">
                      ★ 4.8
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-xs text-slate-550 dark:text-slate-400">
                    <svg className="w-3.5 h-3.5 text-brand-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Qualifications: {doc.qualifications?.join(', ') || 'MD, Clinical Medicine'}</span>
                  </div>
                  <div className="flex items-center text-xs text-slate-550 dark:text-slate-400">
                    <svg className="w-3.5 h-3.5 text-emerald-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>Availability: weekly schedule set</span>
                  </div>
                </div>

                <Button onClick={() => handleBookRedirect(doc)} className="w-full justify-center">
                  Book Appointment
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoctorsDirectory;
