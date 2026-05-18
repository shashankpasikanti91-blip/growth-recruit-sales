// Patch placeholder personal details for all 6 internal staff (test data, can be updated later)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PATCHES = [
  {
    email: 'admin@tekgen.com',
    data: {
      nricPassport:    'P1234567A',
      nationality:     'India',
      dob:             new Date('1982-03-15'),
      gender:          'Male',
      phone:           '+60-11-2345-6789',
      personalEmail:   'admin.personal@gmail.com',
      address:         'Unit 5-12, Menara Sentral Vista, Brickfields, 50470 Kuala Lumpur',
      workLocation:    'Kuala Lumpur HQ',
      workState:       'Kuala Lumpur',
      emergencyName:   'Priya Tekgen',
      emergencyPhone:  '+91-98765-43210',
      emergencyRelation:'Spouse',
      bankName:        'Maybank',
      bankAccountNo:   '1122334455',
      taxNumber:       'TRF-2025-ADM001',
    }
  },
  {
    email: 'payroll@tekgen.com',
    data: {
      nricPassport:    'P2345678B',
      nationality:     'India',
      dob:             new Date('1990-07-22'),
      gender:          'Female',
      phone:           '+60-11-3456-7890',
      personalEmail:   'payroll.personal@gmail.com',
      address:         'D-08-03, Residensi 22, Mont Kiara, 50480 Kuala Lumpur',
      workLocation:    'Kuala Lumpur HQ',
      workState:       'Kuala Lumpur',
      emergencyName:   'Ramesh Nair',
      emergencyPhone:  '+91-87654-32109',
      emergencyRelation:'Father',
      bankName:        'CIMB Bank',
      bankAccountNo:   '2233445566',
      taxNumber:       'TRF-2025-PAY001',
    }
  },
  {
    email: 'shashank@tekgen.com',
    data: {
      nricPassport:    'P3456789C',
      nationality:     'India',
      dob:             new Date('1993-11-08'),
      gender:          'Male',
      phone:           '+60-11-4567-8901',
      personalEmail:   'shashank.personal@gmail.com',
      address:         'A-12-05, Platinum Park, KLCC, 50088 Kuala Lumpur',
      workLocation:    'Kuala Lumpur HQ',
      workState:       'Kuala Lumpur',
      emergencyName:   'Sunita Pasikanti',
      emergencyPhone:  '+91-76543-21098',
      emergencyRelation:'Mother',
      bankName:        'Public Bank',
      bankAccountNo:   '3344556677',
      taxNumber:       'TRF-2025-SHA001',
    }
  },
  {
    email: 'savitha@tekgen.com',
    data: {
      nricPassport:    'P4567890D',
      nationality:     'India',
      dob:             new Date('1992-05-14'),
      gender:          'Female',
      phone:           '+60-11-5678-9012',
      personalEmail:   'savitha.personal@gmail.com',
      address:         'Block B-06-11, The Sentral Residences, KL Sentral, 50470 Kuala Lumpur',
      workLocation:    'Kuala Lumpur HQ',
      workState:       'Kuala Lumpur',
      emergencyName:   'Kavitha Ramasamy',
      emergencyPhone:  '+91-65432-10987',
      emergencyRelation:'Sister',
      bankName:        'Hong Leong Bank',
      bankAccountNo:   '4455667788',
      taxNumber:       'TRF-2025-SAV001',
    }
  },
  {
    email: 'jerry@tekgen.com',
    data: {
      nricPassport:    '980101-14-5678',  // Malaysian NRIC format
      nationality:     'Malaysia',
      dob:             new Date('1998-01-01'),
      gender:          'Male',
      phone:           '+60-12-345-6789',
      personalEmail:   'jerry.personal@gmail.com',
      address:         '22, Jalan Kepong Baru 4, Kepong, 52100 Kuala Lumpur',
      workLocation:    'Kuala Lumpur HQ',
      workState:       'Kuala Lumpur',
      emergencyName:   'Mary Recruiter',
      emergencyPhone:  '+60-12-876-5432',
      emergencyRelation:'Mother',
      bankName:        'Maybank',
      bankAccountNo:   '5566778899',
      taxNumber:       'TRF-2025-JER001',
      epfNumber:       'EPF-2025-00123',
      socsoNumber:     'SCS-2025-00123',
      eisNumber:       'EIS-2025-00123',
    }
  },
  {
    email: 'demo@tekgen.com',
    data: {
      nricPassport:    '950606-10-1234',  // Malaysian NRIC
      nationality:     'Malaysia',
      dob:             new Date('1995-06-06'),
      gender:          'Male',
      phone:           '+60-12-456-7890',
      personalEmail:   'demo.personal@gmail.com',
      address:         '15, Jalan PJU 5/20, Dataran Sunway, 47810 Petaling Jaya',
      workLocation:    'Kuala Lumpur HQ',
      workState:       'Selangor',
      emergencyName:   'Linda Recruiter',
      emergencyPhone:  '+60-12-765-4321',
      emergencyRelation:'Spouse',
      bankName:        'RHB Bank',
      bankAccountNo:   '6677889900',
      taxNumber:       'TRF-2025-DEM001',
      epfNumber:       'EPF-2025-00456',
      socsoNumber:     'SCS-2025-00456',
      eisNumber:       'EIS-2025-00456',
    }
  },
];

async function main() {
  console.log('🔧 Patching employee personal details...\n');

  for (const patch of PATCHES) {
    const profile = await prisma.employeeProfile.findFirst({
      where: { user: { email: patch.email } },
      select: { id: true, employeeId: true }
    });

    if (!profile) {
      console.log(`  ⚠  No profile found for ${patch.email}`);
      continue;
    }

    await prisma.employeeProfile.update({
      where: { id: profile.id },
      data: patch.data,
    });

    console.log(`  ✓ ${patch.email} (${profile.employeeId}) — patched`);
  }

  console.log('\n✅ Done — all 6 employees have placeholder details.');
  await prisma.$disconnect();
}

main().catch(async e => {
  console.error('❌', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
