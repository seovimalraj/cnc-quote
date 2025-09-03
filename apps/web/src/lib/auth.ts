import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'customer';
  company?: string;
  avatar?: string;
}

export class AuthService {
  static async signToken(payload: User): Promise<string> {
    return await new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);
  }

  static async verifyToken(token: string): Promise<User | null> {
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload as User;
    } catch {
      return null;
    }
  }

  static async login(email: string, password: string): Promise<{ user: User; token: string } | null> {
    // Mock user database - in production, this would be a real database query
    const users: Record<string, { password: string; user: User }> = {
      'admin@cncquote.com': {
        password: 'admin123',
        user: {
          id: '1',
          email: 'admin@cncquote.com',
          name: 'Admin User',
          role: 'admin',
          avatar: '/images/avatars/admin.jpg'
        }
      },
      'john@aerospace.com': {
        password: 'customer123',
        user: {
          id: '2',
          email: 'john@aerospace.com',
          name: 'John Smith',
          role: 'customer',
          company: 'Aerospace Dynamics',
          avatar: '/images/avatars/john.jpg'
        }
      },
      'sarah@medtech.com': {
        password: 'customer123',
        user: {
          id: '3',
          email: 'sarah@medtech.com',
          name: 'Sarah Johnson',
          role: 'customer',
          company: 'MedTech Solutions',
          avatar: '/images/avatars/sarah.jpg'
        }
      }
    };

    const userData = users[email];
    if (!userData || userData.password !== password) {
      return null;
    }

    const token = await this.signToken(userData.user);
    return { user: userData.user, token };
  }

  static async register(data: {
    email: string;
    password: string;
    name: string;
    company?: string;
  }): Promise<{ user: User; token: string }> {
    // Mock registration - in production, this would create a new user in the database
    const user: User = {
      id: Math.random().toString(36),
      email: data.email,
      name: data.name,
      role: 'customer',
      company: data.company,
    };

    const token = await this.signToken(user);
    return { user, token };
  }
}

export async function getUser(request: NextRequest): Promise<User | null> {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  
  return await AuthService.verifyToken(token);
}

export function createAuthResponse(user: User, token: string): NextResponse {
  const response = NextResponse.json({ user });
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  return response;
}
