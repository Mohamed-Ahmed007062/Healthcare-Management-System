import React, { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../../store/authSlice';
import medicalRecordApi, { type MedicalRecord, type MedicalRecordFile } from '../../api/medicalRecord.api';
import appointmentApi from '../../api/appointment.api';
import type { Appointment } from '../../types/appointment.types';
import { toast } from 'sonner';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import Button from '../../components/ui/button';
import Input from '../../components/ui/input';
import Label from '../../components/ui/label';

export const MedicalRecords: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  // Doctor state: select patient to view records
  const [patients, setPatients] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [recordType, setRecordType] = useState('lab_report');
  const [isConfidential, setIsConfidential] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Array<{ name: string; size: number }>>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch unique patients for doctor dropdown
  useEffect(() => {
    if (user?.role !== 'doctor') return;
    const fetchDoctorPatients = async () => {
      try {
        const res = await appointmentApi.list();
        if (res.success) {
          const appts = (res.data as any).data || res.data;
          const patientMap = new Map<string, { id: string; name: string; email?: string }>();
          if (Array.isArray(appts)) {
            appts.forEach((appt: Appointment) => {
              const pat = appt.patientId;
              if (pat && typeof pat === 'object') {
                const id = pat._id || (pat as any).id;
                if (id) {
                  patientMap.set(id, {
                    id,
                    name: `${pat.firstName} ${pat.lastName}`,
                    email: pat.email,
                  });
                }
              }
            });
          }
          const patientList = Array.from(patientMap.values());
          setPatients(patientList);
          if (patientList.length > 0) {
            setSelectedPatientId(patientList[0].id);
          }
        }
      } catch (err: any) {
        toast.error('Failed to load patient list');
      }
    };
    fetchDoctorPatients();
  }, [user]);

  // Fetch records
  const fetchRecords = useCallback(async () => {
    const targetPatientId = user?.role === 'patient' ? (user._id || user.id) : selectedPatientId;
    if (!targetPatientId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await medicalRecordApi.getByPatient(targetPatientId);
      if (res.success) {
        const listData = (res.data as any).data || res.data;
        setRecords(Array.isArray(listData) ? listData : []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch medical records');
    } finally {
      setIsLoading(false);
    }
  }, [user, selectedPatientId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Simulating file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files).map(f => ({
        name: f.name,
        size: f.size
      }));
      setSelectedFiles(filesArr);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPatientId = user?.role === 'patient' ? (user._id || user.id) : selectedPatientId;
    if (!targetPatientId) {
      toast.error('Patient reference is missing.');
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error('Please select at least one document to upload');
      return;
    }

    setIsUploading(true);
    // Simulating file upload progress
    setTimeout(async () => {
      try {
        // Construct mock files array
        const files: MedicalRecordFile[] = selectedFiles.map(f => ({
          fileName: f.name,
          sizeBytes: f.size,
          url: `/uploads/mock_medical_records/${encodeURIComponent(f.name)}`, // Local mock storage path
          mimeType: f.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'
        }));

        const res = await medicalRecordApi.create({
          patientId: targetPatientId,
          title,
          description,
          type: recordType,
          isConfidential,
          files
        });

        if (res.success) {
          toast.success('Medical report uploaded and registered successfully!');
          setIsUploadOpen(false);
          setTitle('');
          setDescription('');
          setRecordType('lab_report');
          setIsConfidential(false);
          setSelectedFiles([]);
          fetchRecords();
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    }, 1500);
  };

  const filteredRecords = records.filter(r => {
    if (activeFilter === 'all') return true;
    return r.type === activeFilter;
  });

  const getRecordTypeLabel = (type: string) => {
    switch (type) {
      case 'lab_report': return 'Lab Report';
      case 'scan': return 'Imaging Scan';
      case 'prescription': return 'Prescription';
      case 'discharge_summary': return 'Discharge Summary';
      default: return 'Medical Record';
    }
  };

  const getRecordTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'lab_report': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
      case 'scan': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30';
      case 'prescription': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'discharge_summary': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
      default: return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-350';
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-slate-850 dark:text-white">
            Medical Records Portal
          </h1>
          <p className="text-sm text-slate-550 dark:text-slate-400">
            Secure repository for clinical reports, imaging, and discharge summaries.
          </p>
        </div>

        {user.role !== 'admin' && (
          <Button onClick={() => setIsUploadOpen(true)} className="flex items-center justify-center space-x-1.5 self-start sm:self-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Upload Document</span>
          </Button>
        )}
      </div>

      {/* Doctor Patient Selector */}
      {user.role === 'doctor' && (
        <Card className="p-4 border-brand-100 dark:border-brand-900/20 bg-brand-50/20">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <Label htmlFor="patient-select" className="text-sm font-bold text-slate-850 dark:text-slate-200 whitespace-nowrap">
              Viewing Records for Patient:
            </Label>
            <select
              id="patient-select"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 px-3 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
            >
              {patients.length === 0 ? (
                <option value="">No patients available...</option>
              ) : (
                patients.map((pat) => (
                  <option key={pat.id} value={pat.id}>
                    {pat.name} {pat.email ? `(${pat.email})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-850">
        {[
          { id: 'all', label: 'All Records' },
          { id: 'lab_report', label: 'Lab Reports' },
          { id: 'scan', label: 'Scans & Imaging' },
          { id: 'prescription', label: 'Prescriptions' },
          { id: 'discharge_summary', label: 'Discharge Summaries' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeFilter === tab.id
                ? 'border-brand-600 text-brand-600 dark:text-brand-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Medical Records */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-xl border border-slate-200 dark:border-slate-850" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl shadow-xs">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-slate-450 font-medium text-sm">No medical records found matching this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map((record) => {
            const uploader = record.uploadedById;
            const uploaderName = uploader
              ? `${uploader.firstName} ${uploader.lastName}`
              : 'System';
            const uploaderRole = uploader?.role ?? 'admin';

            return (
              <Card key={record._id} className="hover:shadow-md transition-shadow duration-200 border border-slate-150 dark:border-slate-850 flex flex-col justify-between overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getRecordTypeBadgeColor(record.type)}`}>
                      {getRecordTypeLabel(record.type)}
                    </span>
                    {record.isConfidential && (
                      <span className="text-[10px] font-bold text-red-655 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 px-2 py-0.5 rounded-full flex items-center space-x-0.5">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                        <span>Confidential</span>
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base font-bold text-slate-850 dark:text-white line-clamp-1">
                    {record.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-450">
                    Uploaded on {new Date(record.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-4 flex-1 flex flex-col justify-between">
                  {record.description && (
                    <p className="text-xs text-slate-655 dark:text-slate-350 line-clamp-2 leading-relaxed">
                      {record.description}
                    </p>
                  )}

                  {/* Files section */}
                  {record.files && record.files.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-900">
                      <p className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">
                        Attachments ({record.files.length})
                      </p>
                      <div className="space-y-1">
                        {record.files.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline truncate"
                          >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="truncate">{file.fileName}</span>
                            {file.sizeBytes && (
                              <span className="text-[10px] text-slate-400 font-semibold no-underline">
                                ({Math.round(file.sizeBytes / 1024)} KB)
                              </span>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-900 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>By: <strong className="text-slate-655 dark:text-slate-350">{uploaderName}</strong> ({uploaderRole})</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh] p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <h2 className="text-lg font-heading font-bold text-slate-900 dark:text-white">
                Upload Medical Document
              </h2>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-655 cursor-pointer">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <Label htmlFor="record-title" className="text-xs font-bold uppercase">Document Title</Label>
                <Input
                  id="record-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. CBC Blood Report, Head MRI Scan"
                  required
                  className="mt-1 w-full"
                />
              </div>

              <div>
                <Label htmlFor="record-type" className="text-xs font-bold uppercase">Category</Label>
                <select
                  id="record-type"
                  value={recordType}
                  onChange={(e) => setRecordType(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                >
                  <option value="lab_report">Lab Report</option>
                  <option value="scan">Imaging Scan (X-Ray, MRI)</option>
                  <option value="prescription">Prescription Receipt</option>
                  <option value="discharge_summary">Discharge Summary</option>
                  <option value="other">Other Document</option>
                </select>
              </div>

              <div>
                <Label htmlFor="record-desc" className="text-xs font-bold uppercase">Description / Physician Notes</Label>
                <textarea
                  id="record-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summarize the findings or details..."
                  className="w-full mt-1 rounded-lg border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand-600"
                />
              </div>

              {/* Drag-n-drop Upload area */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Attachment File</Label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-xs font-semibold text-slate-655 dark:text-slate-350">
                    Click or drag report file to upload
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">PDF, PNG, JPG up to 10MB</p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-bold">
                    <span className="truncate max-w-[250px]">{selectedFiles[0].name}</span>
                    <span>({Math.round(selectedFiles[0].size / 1024)} KB)</span>
                  </div>
                )}
              </div>

              {/* Confidential Checkbox */}
              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900">
                <input
                  type="checkbox"
                  id="confidential"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-655 cursor-pointer w-4 h-4"
                />
                <div className="flex flex-col">
                  <Label htmlFor="confidential" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                    Mark as Confidential
                  </Label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Limits visibility to only the patient and assigned physician.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-850">
                <Button type="button" variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isUploading}>
                  Upload Report
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;
