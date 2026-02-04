import { PrismaClient, Role, SurveyType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {},
        create: {
            email: 'admin@example.com',
            password: adminPassword,
            name: 'Admin User',
            role: Role.ADMIN,
        },
    });
    console.log('Created admin:', admin.email);

    // Create regular users
    const userPassword = await bcrypt.hash('user123', 10);
    const users = [];

    for (let i = 1; i <= 3; i++) {
        const user = await prisma.user.upsert({
            where: { email: `user${i}@example.com` },
            update: {},
            create: {
                email: `user${i}@example.com`,
                password: userPassword,
                name: `User ${i}`,
                role: Role.USER,
            },
        });
        users.push(user);
        console.log('Created user:', user.email);
    }

    // Create groups
    const group1 = await prisma.group.upsert({
        where: { name: 'First Year Students' },
        update: {},
        create: {
            name: 'First Year Students',
            description: 'All first year students',
        },
    });

    const group2 = await prisma.group.upsert({
        where: { name: 'Second Year Students' },
        update: {},
        create: {
            name: 'Second Year Students',
            description: 'All second year students',
        },
    });
    console.log('Created groups');

    // Add users to groups
    for (const user of users) {
        await prisma.groupMember.upsert({
            where: {
                userId_groupId: {
                    userId: user.id,
                    groupId: group1.id,
                },
            },
            update: {},
            create: {
                userId: user.id,
                groupId: group1.id,
            },
        });
    }
    console.log('Added users to groups');

    // Create Survey 1: Hostel Selection
    const hostelSurvey = await prisma.survey.upsert({
        where: { id: 'hostel-survey-seed' },
        update: {},
        create: {
            id: 'hostel-survey-seed',
            name: 'Hostel Selection',
            description: 'Select your preferred hostel',
            surveyType: SurveyType.PICK_N,
        },
    });

    // Create hostel options
    const hostelOptions = [];
    for (const hostelName of ['North Hostel', 'South Hostel', 'East Hostel', 'West Hostel']) {
        const option = await prisma.surveyOption.create({
            data: {
                surveyId: hostelSurvey.id,
                optionName: hostelName,
                optionData: {
                    facilities: ['WiFi', 'Gym', 'Cafeteria'],
                    distance: '500m',
                },
            },
        });
        hostelOptions.push(option);
    }
    console.log('Created hostel survey with options');

    // Create Survey 2: Room Selection
    const roomSurvey = await prisma.survey.upsert({
        where: { id: 'room-survey-seed' },
        update: {},
        create: {
            id: 'room-survey-seed',
            name: 'Room Selection',
            description: 'Select your preferred room type',
            surveyType: SurveyType.PICK_N,
        },
    });

    // Create room options
    const roomOptions = [];
    for (const roomType of ['Single Room', 'Double Room', 'Triple Room']) {
        const option = await prisma.surveyOption.create({
            data: {
                surveyId: roomSurvey.id,
                optionName: roomType,
                optionData: {
                    price: roomType === 'Single Room' ? 5000 : roomType === 'Double Room' ? 3000 : 2000,
                },
            },
        });
        roomOptions.push(option);
    }
    console.log('Created room survey with options');

    // Create release for hostel survey (order 1)
    const hostelRelease = await prisma.surveyRelease.create({
        data: {
            surveyId: hostelSurvey.id,
            groupId: group1.id,
            releaseOrder: 1,
            isActive: true,
        },
    });

    // Create capacity for hostel options
    for (const option of hostelOptions) {
        await prisma.optionCapacity.create({
            data: {
                optionId: option.id,
                surveyReleaseId: hostelRelease.id,
                maxCapacity: 5,
                currentUtilization: 0,
            },
        });
    }
    console.log('Created hostel release with capacity');

    // Create release for room survey (order 2 - requires hostel approval)
    const roomRelease = await prisma.surveyRelease.create({
        data: {
            surveyId: roomSurvey.id,
            groupId: group1.id,
            releaseOrder: 2,
            isActive: true,
        },
    });

    // Create capacity for room options
    for (const option of roomOptions) {
        await prisma.optionCapacity.create({
            data: {
                optionId: option.id,
                surveyReleaseId: roomRelease.id,
                maxCapacity: 3,
                currentUtilization: 0,
            },
        });
    }
    console.log('Created room release with capacity');

    console.log('Seed completed successfully!');
    console.log('\nTest credentials:');
    console.log('Admin: admin@example.com / admin123');
    console.log('User 1: user1@example.com / user123');
    console.log('User 2: user2@example.com / user123');
    console.log('User 3: user3@example.com / user123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
