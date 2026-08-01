import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '../.env') });

import { prisma } from './config/db';

const DEPARTMENTS_DATA = [
  { name: 'Cardiology', description: 'Diagnosis, prevention, and treatment of heart and vascular disorders.' },
  { name: 'Neurology', description: 'Medical specialty dealing with disorders of the nervous system.' },
  { name: 'Pediatrics', description: 'Comprehensive medical care of infants, children, and adolescents.' },
  { name: 'Dermatology', description: 'Diagnosis and treatment of skin, hair, and nail disorders.' },
  { name: 'Orthopedics', description: 'Care for the musculoskeletal system, including bones, joints, and ligaments.' },
  { name: 'Ophthalmology', description: 'Medical and surgical care of the eyes and visual system.' },
  { name: 'Psychiatry', description: 'Diagnosis, treatment, and prevention of mental, emotional, and behavioral disorders.' },
  { name: 'Internal Medicine', description: 'Comprehensive medical care for adults, focusing on complex diseases.' },
  { name: 'General Surgery', description: 'Surgical treatment of abdominal organs, thyroid gland, and soft tissues.' },
  { name: 'Oncology (Coming Soon)', description: 'Specialized diagnosis, treatment, and research of cancer. Clinical operations starting next quarter.' },
  { name: 'Urology (Coming Soon)', description: 'Specialized care for the urinary tract system. Clinical operations starting next quarter.' }
];

const DOCTORS_DATA = [
  // Cardiology
  {
    firstName: 'Robert',
    lastName: 'Chen',
    email: 'doc.cardio1@hospital.com',
    specialization: 'Cardiology',
    qualifications: ['MD', 'FACC'],
    experienceYears: 15,
    consultationFee: 150,
    averageRating: 4.9,
    bio: 'Senior Cardiologist specializing in interventional cardiology and preventive cardiovascular medicine.'
  },
  {
    firstName: 'Sarah',
    lastName: 'Jenkins',
    email: 'doc.cardio2@hospital.com',
    specialization: 'Cardiology',
    qualifications: ['MD'],
    experienceYears: 10,
    consultationFee: 120,
    averageRating: 4.7,
    bio: 'Dedicated cardiologist specializing in heart failure management and echocardiography.'
  },
  {
    firstName: 'Amir',
    lastName: 'Rostami',
    email: 'doc.cardio3@hospital.com',
    specialization: 'Cardiology',
    qualifications: ['MD', 'PhD'],
    experienceYears: 8,
    consultationFee: 110,
    averageRating: 4.6,
    bio: 'Cardiologist focused on non-invasive cardiac imaging and sports cardiology.'
  },
  // Neurology
  {
    firstName: 'Alice',
    lastName: 'Vance',
    email: 'doc.neuro1@hospital.com',
    specialization: 'Neurology',
    qualifications: ['MD', 'PhD'],
    experienceYears: 18,
    consultationFee: 200,
    averageRating: 4.9,
    bio: 'Neurologist specializing in stroke management, epilepsy, and neurodegenerative disorders.'
  },
  {
    firstName: 'David',
    lastName: 'Kim',
    email: 'doc.neuro2@hospital.com',
    specialization: 'Neurology',
    qualifications: ['MD'],
    experienceYears: 12,
    consultationFee: 160,
    averageRating: 4.5,
    bio: 'Specialist in migraine disorders, neuromuscular disease, and clinical neurophysiology.'
  },
  // Pediatrics
  {
    firstName: 'Emily',
    lastName: 'Ross',
    email: 'doc.pedia1@hospital.com',
    specialization: 'Pediatrics',
    qualifications: ['MD', 'FAAP'],
    experienceYears: 14,
    consultationFee: 100,
    averageRating: 4.8,
    bio: 'Compassionate pediatrician focusing on childhood development, immunization, and asthma care.'
  },
  {
    firstName: 'James',
    lastName: 'Miller',
    email: 'doc.pedia2@hospital.com',
    specialization: 'Pediatrics',
    qualifications: ['MD'],
    experienceYears: 9,
    consultationFee: 80,
    averageRating: 4.6,
    bio: 'General pediatrician dedicated to comprehensive wellness care for children of all ages.'
  },
  // Dermatology
  {
    firstName: 'Liam',
    lastName: 'Smith',
    email: 'doc.derm1@hospital.com',
    specialization: 'Dermatology',
    qualifications: ['MD'],
    experienceYears: 11,
    consultationFee: 110,
    averageRating: 4.7,
    bio: 'Board-certified dermatologist specializing in medical dermatology, acne treatment, and skin cancer screenings.'
  },
  {
    firstName: 'Chloe',
    lastName: 'Dubois',
    email: 'doc.derm2@hospital.com',
    specialization: 'Dermatology',
    qualifications: ['MD'],
    experienceYears: 7,
    consultationFee: 95,
    averageRating: 4.4,
    bio: 'Dermatologist focused on pediatric dermatology and eczema management.'
  },
  // Orthopedics
  {
    firstName: 'Marcus',
    lastName: 'Miller',
    email: 'doc.ortho1@hospital.com',
    specialization: 'Orthopedics',
    qualifications: ['MD'],
    experienceYears: 16,
    consultationFee: 170,
    averageRating: 4.8,
    bio: 'Orthopedic surgeon specializing in sports medicine, joint replacement, and arthroscopy.'
  },
  {
    firstName: 'Elena',
    lastName: 'Petrova',
    email: 'doc.ortho2@hospital.com',
    specialization: 'Orthopedics',
    qualifications: ['MD'],
    experienceYears: 10,
    consultationFee: 140,
    averageRating: 4.6,
    bio: 'Orthopedic specialist focusing on hand and upper extremity surgery.'
  },
  // Ophthalmology
  {
    firstName: 'Sophia',
    lastName: 'Martinez',
    email: 'doc.opht1@hospital.com',
    specialization: 'Ophthalmology',
    qualifications: ['MD'],
    experienceYears: 13,
    consultationFee: 120,
    averageRating: 4.7,
    bio: 'Ophthalmologist specializing in cataract surgery and glaucoma management.'
  },
  {
    firstName: 'Ryan',
    lastName: 'Patel',
    email: 'doc.opht2@hospital.com',
    specialization: 'Ophthalmology',
    qualifications: ['MD'],
    experienceYears: 8,
    consultationFee: 100,
    averageRating: 4.5,
    bio: 'Ophthalmic physician focused on refractive surgery and pediatric eye care.'
  },
  // Psychiatry
  {
    firstName: 'David',
    lastName: 'Foster',
    email: 'doc.psych1@hospital.com',
    specialization: 'Psychiatry',
    qualifications: ['MD'],
    experienceYears: 20,
    consultationFee: 180,
    averageRating: 4.9,
    bio: 'Consultant psychiatrist specializing in anxiety, depression, and cognitive behavioral therapy.'
  },
  {
    firstName: 'Hana',
    lastName: 'Tanaka',
    email: 'doc.psych2@hospital.com',
    specialization: 'Psychiatry',
    qualifications: ['MD'],
    experienceYears: 11,
    consultationFee: 140,
    averageRating: 4.6,
    bio: 'Psychiatrist focused on adolescent mental health and mood disorders.'
  },
  // Internal Medicine
  {
    firstName: 'Helen',
    lastName: 'Cho',
    email: 'doc.internal1@hospital.com',
    specialization: 'Internal Medicine',
    qualifications: ['MD'],
    experienceYears: 17,
    consultationFee: 130,
    averageRating: 4.8,
    bio: 'Internal medicine specialist dedicated to chronic disease management and preventative adult healthcare.'
  },
  {
    firstName: 'George',
    lastName: 'Brady',
    email: 'doc.internal2@hospital.com',
    specialization: 'Internal Medicine',
    qualifications: ['MD'],
    experienceYears: 10,
    consultationFee: 110,
    averageRating: 4.5,
    bio: 'General internist focusing on geriatric care and metabolic syndromes.'
  },
  // General Surgery
  {
    firstName: 'James',
    lastName: 'Wilson',
    email: 'doc.surgery1@hospital.com',
    specialization: 'General Surgery',
    qualifications: ['MD', 'FACS'],
    experienceYears: 19,
    consultationFee: 190,
    averageRating: 4.9,
    bio: 'General surgeon specializing in minimally invasive laparoscopic surgery and oncology resections.'
  },
  {
    firstName: 'Linda',
    lastName: 'Green',
    email: 'doc.surgery2@hospital.com',
    specialization: 'General Surgery',
    qualifications: ['MD'],
    experienceYears: 12,
    consultationFee: 160,
    averageRating: 4.6,
    bio: 'Surgeon focused on endocrine surgery and hernia repairs.'
  }
];

const WEEKLY_SCHEDULE_TEMPLATE = [
  { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', isAvailable: true },
  { dayOfWeek: 1, startTime: '13:00', endTime: '17:00', isAvailable: true },
  { dayOfWeek: 2, startTime: '09:00', endTime: '12:00', isAvailable: true },
  { dayOfWeek: 2, startTime: '13:00', endTime: '17:00', isAvailable: true },
  { dayOfWeek: 3, startTime: '09:00', endTime: '12:00', isAvailable: true },
  { dayOfWeek: 3, startTime: '13:00', endTime: '17:00', isAvailable: true },
  { dayOfWeek: 4, startTime: '09:00', endTime: '12:00', isAvailable: true },
  { dayOfWeek: 4, startTime: '13:00', endTime: '17:00', isAvailable: true }
];

async function seed() {
  try {
    console.log('Connecting to PostgreSQL via Prisma...');
    await prisma.$connect();
    console.log('Connected. Clearing doctor profiles and departments...');

    await prisma.doctorProfile.deleteMany({});
    await prisma.user.deleteMany({ where: { role: 'doctor' } });
    await prisma.department.deleteMany({});

    console.log('Database cleared of existing doctors and departments.');

    const passwordHash = await bcrypt.hash('password123', 12);
    console.log('Password hash generated.');

    const createdDepts = [];
    for (const dept of DEPARTMENTS_DATA) {
      const created = await prisma.department.create({
        data: {
          name: dept.name,
          description: dept.description,
          isActive: true
        }
      });
      createdDepts.push(created);
    }
    console.log(`Created ${createdDepts.length} departments.`);

    let docsCreated = 0;
    for (const doc of DOCTORS_DATA) {
      const dept = createdDepts.find(d => d.name === doc.specialization);

      await prisma.user.create({
        data: {
          email: doc.email.toLowerCase(),
          passwordHash,
          role: 'doctor',
          firstName: doc.firstName,
          lastName: doc.lastName,
          isActive: true,
          isEmailVerified: true,
          doctorProfile: {
            create: {
              specialization: doc.specialization,
              qualifications: doc.qualifications,
              experienceYears: doc.experienceYears,
              consultationFee: doc.consultationFee,
              departmentId: dept ? dept.id : null,
              weeklySchedule: WEEKLY_SCHEDULE_TEMPLATE,
              averageRating: doc.averageRating,
              ratingsCount: 15,
              isAvailable: true,
              bio: doc.bio
            }
          }
        }
      });
      docsCreated++;
    }

    console.log('Updating department heads...');
    for (const dept of createdDepts) {
      const docProfile = await prisma.doctorProfile.findFirst({
        where: { departmentId: dept.id }
      });
      if (docProfile) {
        await prisma.department.update({
          where: { id: dept.id },
          data: { headDoctorId: docProfile.userId }
        });
      }
    }

    // 6. Create demo patient accounts for immediate testing
    console.log('Creating demo patient accounts...');
    const demoPatients = [
      { email: 'mohamed12@gmail.com', firstName: 'Mohamed', lastName: 'Ahmed' },
      { email: 'patient@hospital.com', firstName: 'John', lastName: 'Doe' },
    ];

    for (const pat of demoPatients) {
      await prisma.user.upsert({
        where: { email: pat.email },
        update: { passwordHash, isActive: true, isEmailVerified: true },
        create: {
          email: pat.email,
          passwordHash,
          role: 'patient',
          firstName: pat.firstName,
          lastName: pat.lastName,
          isActive: true,
          isEmailVerified: true,
          patientProfile: {
            create: {
              gender: 'male',
              bloodGroup: 'A+',
            },
          },
        },
      });
    }

    console.log(`Database Seeded Successfully!`);
    console.log(`- Created Departments: ${createdDepts.length}`);
    console.log(`- Created Doctors: ${docsCreated}`);
    console.log(`- Created Demo Patients: ${demoPatients.length} (mohamed12@gmail.com)`);
    console.log(`- Password for all accounts: password123`);

  } catch (error) {
    console.error('Seeding error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('Disconnected from PostgreSQL.');
  }
}

seed();
