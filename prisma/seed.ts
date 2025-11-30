import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  // Create default categories with Arabic-friendly names
  const incomeCategories = [
    { name: 'Sales', type: 'INCOME' as const, description: 'Product sales revenue' },
    { name: 'Processing', type: 'INCOME' as const, description: 'Processing fees' },
    { name: 'Packaging', type: 'INCOME' as const, description: 'Packaging revenue' },
    { name: 'Consulting', type: 'INCOME' as const, description: 'Consulting services' },
    { name: 'Rental', type: 'INCOME' as const, description: 'Rental income' },
    { name: 'Other', type: 'INCOME' as const, description: 'Other income sources' },
  ];

  const expenseCategories = [
    { name: 'Seeds', type: 'EXPENSE' as const, description: 'Seed purchases' },
    { name: 'Transport', type: 'EXPENSE' as const, description: 'Transportation costs' },
    { name: 'Labor', type: 'EXPENSE' as const, description: 'Labor and wages' },
    { name: 'Utilities', type: 'EXPENSE' as const, description: 'Utility bills' },
    { name: 'Equipment', type: 'EXPENSE' as const, description: 'Equipment purchases and maintenance' },
    { name: 'Fertilizer', type: 'EXPENSE' as const, description: 'Fertilizer and pesticides' },
    { name: 'Marketing', type: 'EXPENSE' as const, description: 'Marketing and advertising' },
    { name: 'Insurance', type: 'EXPENSE' as const, description: 'Insurance payments' },
    { name: 'Other', type: 'EXPENSE' as const, description: 'Other expenses' },
  ];

  // Create sample users
  console.log('👥 Creating sample users...');
  
  const users = [];
  for (let i = 1; i <= 3; i++) {
    const user = await prisma.user.upsert({
      where: { email: `user${i}@example.com` },
      update: {},
      create: {
        email: `user${i}@example.com`,
        name: `Sample User ${i}`,
        phone: `+1234567890${i}`,
      },
    });
    users.push(user);

    // Create settings for each user
    const defaultPin = '1234';
    const pinHash = await bcrypt.hash(defaultPin, 10);
    
    await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        language: i === 2 ? 'ar' : 'en', // Second user gets Arabic
        darkMode: false,
        autoBackup: true,
        offlineMode: true,
        autoSync: true,
        pushNotifications: true,
        emailNotifications: false,
        expenseThresholdAlert: true,
        expenseThreshold: 1000,
        pinEnabled: i === 1, // First user has PIN enabled
        pinHash: i === 1 ? pinHash : null,
        fingerprintEnabled: false,
      },
    });
  }

  console.log(`✅ Created ${users.length} sample users`);

  // Create categories for each user
  console.log('📁 Creating categories for each user...');
  const createdCategories: { [key: string]: string } = {};

  for (const user of users) {
    for (const category of [...incomeCategories, ...expenseCategories]) {
      const created = await prisma.category.upsert({
        where: {
          userId_name_type: {
            userId: user.id,
            name: category.name,
            type: category.type,
          },
        },
        update: {},
        create: {
          ...category,
          userId: user.id,
        },
      });
      // Store category ID for the first user (used for transactions)
      if (user.id === users[0].id) {
        createdCategories[`${category.name}_${category.type}`] = created.id;
      }
    }
  }

  console.log(`✅ Created ${(incomeCategories.length + expenseCategories.length) * users.length} categories (${incomeCategories.length + expenseCategories.length} per user)`);

  // Create sample transactions for the first user
  console.log('💰 Creating sample transactions...');
  
  const firstUser = users[0];
  const transactions = [];
  
  // Get categories for transactions
  const salesCategoryId = createdCategories['Sales_INCOME'];
  const processingCategoryId = createdCategories['Processing_INCOME'];
  const seedsCategoryId = createdCategories['Seeds_EXPENSE'];
  const transportCategoryId = createdCategories['Transport_EXPENSE'];
  const laborCategoryId = createdCategories['Labor_EXPENSE'];

  // Create transactions for the last 3 months
  const now = new Date();
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const month = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    
    // Income transactions
    for (let day = 1; day <= 5; day++) {
      const date = new Date(month.getFullYear(), month.getMonth(), day * 5);
      
      // Sales
      const salesTransaction = await prisma.transaction.create({
        data: {
          userId: firstUser.id,
          type: 'INCOME',
          amount: 500 + Math.random() * 500,
          categoryId: salesCategoryId,
          description: `Product sales - ${date.toLocaleDateString()}`,
          createdAt: date,
        },
      });
      transactions.push(salesTransaction);

      // Processing
      const processingTransaction = await prisma.transaction.create({
        data: {
          userId: firstUser.id,
          type: 'INCOME',
          amount: 200 + Math.random() * 200,
          categoryId: processingCategoryId,
          description: `Processing fee - ${date.toLocaleDateString()}`,
          createdAt: new Date(date.getTime() + 86400000), // Next day
        },
      });
      transactions.push(processingTransaction);
    }

    // Expense transactions
    for (let day = 1; day <= 5; day++) {
      const date = new Date(month.getFullYear(), month.getMonth(), day * 4 + 1);
      
      // Seeds
      const seedsTransaction = await prisma.transaction.create({
        data: {
          userId: firstUser.id,
          type: 'EXPENSE',
          amount: 100 + Math.random() * 200,
          categoryId: seedsCategoryId,
          description: `Seed purchase - ${date.toLocaleDateString()}`,
          createdAt: date,
        },
      });
      transactions.push(seedsTransaction);

      // Transport
      const transportTransaction = await prisma.transaction.create({
        data: {
          userId: firstUser.id,
          type: 'EXPENSE',
          amount: 50 + Math.random() * 100,
          categoryId: transportCategoryId,
          description: `Transportation - ${date.toLocaleDateString()}`,
          createdAt: new Date(date.getTime() + 86400000),
        },
      });
      transactions.push(transportTransaction);

      // Labor
      const laborTransaction = await prisma.transaction.create({
        data: {
          userId: firstUser.id,
          type: 'EXPENSE',
          amount: 300 + Math.random() * 200,
          categoryId: laborCategoryId,
          description: `Labor payment - ${date.toLocaleDateString()}`,
          createdAt: new Date(date.getTime() + 172800000), // 2 days later
        },
      });
      transactions.push(laborTransaction);
    }
  }

  console.log(`✅ Created ${transactions.length} sample transactions`);

  // Create sample alerts for the first user
  console.log('🔔 Creating sample alerts...');
  
  const alerts = [];
  const alertMessages = [
    { type: 'INFO' as const, message: 'Welcome to AgriBooks! Start tracking your agricultural finances.' },
    { type: 'SUCCESS' as const, message: 'Great job! Your monthly income target has been reached.' },
    { type: 'WARNING' as const, message: 'Your expenses are approaching the monthly threshold.' },
    { type: 'INFO' as const, message: 'New category added: Equipment' },
  ];

  for (let i = 0; i < alertMessages.length; i++) {
    const alert = await prisma.alert.create({
      data: {
        userId: firstUser.id,
        type: alertMessages[i].type,
        message: alertMessages[i].message,
        isRead: i > 1, // First two are unread
        createdAt: new Date(now.getTime() - i * 86400000), // Different dates
      },
    });
    alerts.push(alert);
  }

  console.log(`✅ Created ${alerts.length} sample alerts`);

  // Create sample reminders for the first user
  console.log('📋 Creating sample reminders...');
  
  const reminders = [];
  const reminderTitles = [
    'Pay monthly utility bill',
    'Order new seeds for next season',
    'Schedule equipment maintenance',
    'Review monthly financial report',
  ];

  for (let i = 0; i < reminderTitles.length; i++) {
    const dueDate = new Date(now.getTime() + (i + 1) * 7 * 86400000); // Different due dates
    
    const reminder = await prisma.reminder.create({
      data: {
        userId: firstUser.id,
        title: reminderTitles[i],
        description: `Reminder for: ${reminderTitles[i]}`,
        dueDate: dueDate,
        completed: i === 0, // First one is completed
      },
    });
    reminders.push(reminder);
  }

  console.log(`✅ Created ${reminders.length} sample reminders`);

  console.log('\n✅ Database seeding completed successfully!');
  console.log(`\n📊 Summary:`);
  console.log(`   - Categories: ${(incomeCategories.length + expenseCategories.length) * users.length} (${incomeCategories.length + expenseCategories.length} per user)`);
  console.log(`   - Users: ${users.length}`);
  console.log(`   - Transactions: ${transactions.length}`);
  console.log(`   - Alerts: ${alerts.length}`);
  console.log(`   - Reminders: ${reminders.length}`);
  console.log(`\n💡 Test User Credentials:`);
  console.log(`   - User 1: user1@example.com (PIN: 1234, Language: English)`);
  console.log(`   - User 2: user2@example.com (Language: Arabic)`);
  console.log(`   - User 3: user3@example.com (Language: English)`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
