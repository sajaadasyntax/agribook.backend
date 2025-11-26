import { PrismaClient } from '@prisma/client';
import { logInfo, logError } from '../utils/logger';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? [{ emit: 'event', level: 'query' }]
    : [{ emit: 'event', level: 'error' }],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: { query: string; params: string; duration: number }) => {
    logInfo('Database Query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

prisma.$on('error' as never, (e: { message: string; target?: string }) => {
  logError('Database Error', e, { target: e.target });
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  logInfo('Disconnecting Prisma Client');
  await prisma.$disconnect();
});

export default prisma;

