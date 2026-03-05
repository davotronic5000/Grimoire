import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { generateWordSlug } from '@/lib/slugWords';

export async function POST(req: NextRequest) {
  const body = await req.json();

  const db = await getDb();
  const col = db.collection('shared_scripts');

  // Ensure TTL index exists (idempotent — no-op if already present)
  await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 43200 }); // 12 hours

  // Generate a unique slug, retrying on collision
  let slug = '';
  for (let i = 0; i < 5; i++) {
    const candidate = generateWordSlug();
    const existing = await col.findOne({ slug: candidate }, { projection: { _id: 1 } });
    if (!existing) {
      slug = candidate;
      break;
    }
  }
  if (!slug) {
    return NextResponse.json({ error: 'Could not generate unique slug' }, { status: 500 });
  }

  await col.insertOne({
    slug,
    scriptName: body.scriptName,
    scriptAuthor: body.scriptAuthor ?? null,
    scriptId: body.scriptId ?? null,
    roleIds: body.roleIds,
    homebrewRoles: body.homebrewRoles ?? null,
    createdAt: new Date(),
  });

  const url = `${req.nextUrl.origin}/script/${slug}`;
  return NextResponse.json({ slug, url });
}
