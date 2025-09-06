import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 attempts per hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, phone, quoteId, fingerprint } = body;

    // Validate required fields
    if (!email || !phone || !quoteId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Additional validation
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Business email validation
    const blocklistDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com', 'proton.me', 'yopmail.com', 'gmx.com', 'mailinator.com'];
    const allowedTlds = ['com', 'net', 'org', 'io', 'co', 'ai', 'edu', 'gov'];
    const domain = email.split('@')[1].toLowerCase();
    const tld = domain.split('.').pop();

    if (blocklistDomains.includes(domain) || !allowedTlds.includes(tld || '')) {
      return NextResponse.json(
        { error: 'Please use a business email address' },
        { status: 400 }
      );
    }

    // Phone validation (E.164 format)
    const e164Regex = /^\+[1-9]\d{6,14}$/;
    if (!e164Regex.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use E.164 format (+1234567890)' },
        { status: 400 }
      );
    }

    // In a real implementation, this would:
    // 1. Check if user exists in database
    // 2. Create new user in 'prospects' org if not exists
    // 3. Create lead record
    // 4. Send welcome email
    // 5. Implement honeypot and captcha validation

    // Send welcome email
    try {
      await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Welcome to CNC Quote - Your Instant Manufacturing Quote',
          template: 'lead-welcome',
          data: {
            email,
            quoteId,
            leadId: mockLead.id
          }
        })
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the lead creation if email fails
    }

    // For now, we'll simulate the response
    const mockLead = {
      id: `lead-${Date.now()}`,
      email,
      phone,
      quoteId,
      fingerprint,
      userId: `user-${Date.now()}`, // Would be created/assigned
      organizationId: 'prospects', // Special org for leads
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Set a simple session cookie (in production, use proper JWT/session management)
    const response = NextResponse.json(mockLead);
    response.cookies.set('quote-session', `session-${quoteId}-${Date.now()}`, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}
