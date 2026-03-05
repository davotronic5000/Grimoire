import { notFound } from 'next/navigation';
import { promises as fs } from 'fs';
import path from 'path';
import { getDb } from '@/lib/mongodb';
import type { RoleDefinition, RoleTeam } from '@/lib/types';
import { TEAM_LABELS, TEAM_COLORS } from '@/lib/roles';

const TEAM_ORDER: RoleTeam[] = ['townsfolk', 'outsider', 'minion', 'demon', 'traveler', 'fabled', 'loric'];

export default async function ScriptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Fetch script document from MongoDB
  const db = await getDb();
  const doc = await db.collection('shared_scripts').findOne({ slug });
  if (!doc) notFound();

  // Load role definitions from filesystem
  const rolesPath = path.join(process.cwd(), 'public/data/roles.json');
  const rolesRaw = await fs.readFile(rolesPath, 'utf-8');
  const allRoles: RoleDefinition[] = JSON.parse(rolesRaw);
  const rolesDb: Record<string, RoleDefinition> = {};
  for (const r of allRoles) {
    if (r.id) rolesDb[r.id] = r;
  }

  // Merge in any homebrew role definitions
  if (doc.homebrewRoles) {
    Object.assign(rolesDb, doc.homebrewRoles);
  }

  // Build and sort role list by team
  const rolesList: RoleDefinition[] = (doc.roleIds as string[])
    .map((id: string) => rolesDb[id])
    .filter((r): r is RoleDefinition => !!r);
  rolesList.sort((a, b) => {
    const ai = TEAM_ORDER.indexOf(a.team as RoleTeam);
    const bi = TEAM_ORDER.indexOf(b.team as RoleTeam);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Group by team
  const groups = TEAM_ORDER
    .map(team => ({ team, roles: rolesList.filter(r => r.team === team) }))
    .filter(g => g.roles.length > 0);

  return (
    <div style={{
      maxWidth: 520,
      margin: '0 auto',
      padding: '20px 16px 48px',
      background: '#0e0b18',
      minHeight: '100vh',
      color: '#e8e0d0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px', lineHeight: 1.2 }}>
          {doc.scriptName as string}
        </h1>
        {doc.scriptAuthor && (
          <p style={{ margin: 0, fontSize: 13, color: '#8a7fa0' }}>
            by {doc.scriptAuthor as string}
          </p>
        )}
      </div>

      {/* Team sections */}
      {groups.map(({ team, roles }) => (
        <section key={team} style={{ marginBottom: 28 }}>
          <h2 style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: TEAM_COLORS[team],
            margin: '0 0 8px',
          }}>
            {TEAM_LABELS[team]}
          </h2>
          <div>
            {roles.map(role => (
              <div key={role.id} style={{
                display: 'flex',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                alignItems: 'flex-start',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={role.image ?? `/icons/${role.id}.png`}
                  alt={role.name}
                  width={44}
                  height={44}
                  style={{ objectFit: 'contain', flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 3px', fontWeight: 600, fontSize: 15, color: '#e8e0d0' }}>
                    {role.name}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: '#8a7fa0', lineHeight: 1.45 }}>
                    {role.ability}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Footer */}
      <p style={{ marginTop: 32, fontSize: 11, color: '#4a4060', textAlign: 'center' }}>
        Blood on the Clocktower · Grimoire
      </p>
    </div>
  );
}
