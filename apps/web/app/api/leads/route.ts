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
    const { email, phone, quoteId, fingerprint, files = [], quoteSummary } = body;

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

    // Store in admin leads storage for recovery
    try {
      const { addLead } = await import('../admin/leads/route');
      addLead({
        email,
        phone,
        quoteId,
        fingerprint,
        files,
        quoteSummary,
        submittedAt: new Date().toISOString()
      });
      console.log(`Stored lead for admin recovery: ${quoteId}`, {
        email,
        phone,
        files: files?.length || 0
      });
    } catch (error) {
      console.error('Error storing lead for admin:', error);
      // Continue with lead creation
    }

    // Generate lead ID
    const leadId = `lead-${Date.now()}`;
    
    // TODO: Send welcome email (currently disabled due to URL issues)
    console.log(`Lead created for ${email} with quote ${quoteId}`);

    // Return lead response
    const leadResponse = {
      id: leadId,
      email,
      phone,
      quoteId,
      fingerprint,
      userId: `user-${Date.now()}`,
      organizationId: 'prospects',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      abandonedQuoteStored: true
    };

    // Set a simple session cookie
    const response = NextResponse.json(leadResponse);
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
