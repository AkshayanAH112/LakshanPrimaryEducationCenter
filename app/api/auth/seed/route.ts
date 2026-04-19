import connectToDatabase from '@/lib/mongodb';
import { User } from '@/models';
import { hashPassword } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  
  try {
    await connectToDatabase();
    const existing = await User.findOne({ email: 'admin@lakshan.edu' });
    
    if (!existing) {
      const passwordHash = await hashPassword('password123');
      await User.create({ email: 'admin@lakshan.edu', passwordHash, role: 'admin' });
      return NextResponse.json({ message: 'Seeded admin successfully.' });
    }
    
    return NextResponse.json({ message: 'Admin already seeded.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
