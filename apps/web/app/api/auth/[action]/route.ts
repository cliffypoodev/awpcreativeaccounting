import { NextResponse } from 'next/server';
import { db, eq, users, organizations } from '@invoiceforge/db';
import { signupInput, loginInput, type Role } from '@invoiceforge/shared';
import {
  hashPassword,
  verifyPassword,
  signSession,
  makeSessionUser,
  SESSION_COOKIE,
} from '@/lib/auth';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 90) || 'org';
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;

  if (action === 'logout') {
    const res = NextResponse.redirect(new URL('/login', req.url), { status: 303 });
    res.cookies.set(SESSION_COOKIE, '', { maxAge: 0, path: '/' });
    return res;
  }

  const body = await req.json().catch(() => ({}));

  if (action === 'signup') {
    const parsed = signupInput.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { name, email, password, organizationName } = parsed.data;

    const [existing] = await db.select().from(users).where(eq(users.email, email));
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 });

    const [org] = await db
      .insert(organizations)
      .values({ name: organizationName, slug: `${slugify(organizationName)}-${Date.now().toString(36)}` })
      .returning();
    if (!org) return NextResponse.json({ error: 'Org create failed' }, { status: 500 });

    const [user] = await db
      .insert(users)
      .values({ orgId: org.id, email, name, role: 'owner', passwordHash: hashPassword(password), emailVerified: false })
      .returning();
    if (!user) return NextResponse.json({ error: 'User create failed' }, { status: 500 });

    return setSession(user.id, email, name, 'owner', org.id);
  }

  if (action === 'login') {
    const parsed = loginInput.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    const { email, password } = parsed.data;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    return setSession(user.id, user.email, user.name, (user.role ?? 'member') as Role, user.orgId!);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 404 });
}

function setSession(id: string, email: string, name: string | null, role: Role, orgId: string) {
  const token = signSession(makeSessionUser({ id, email, name, role, orgId }));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
