import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };
const SEV: Record<string, string> = { critical: '#FF6B5E', high: '#F2A33A', medium: '#D9C84A', info: '#8EA2FF' };

/** Branded share card used by LinkedIn, X, WhatsApp, Slack… */
export function ogCard({ kicker, title, severity = 'info', footer }: { kicker: string; title: string; severity?: string; footer?: string }) {
  const size = title.length > 90 ? 52 : title.length > 60 ? 62 : 72;
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: '#0D1314', color: '#E2E8E5', padding: 64, borderTop: `18px solid ${SEV[severity] ?? SEV.info}` }}>
        <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, letterSpacing: 1 }}>VELKRYPT<span style={{ color: '#8EA2FF', marginLeft: 14 }}>WIRE</span></div>
        <div style={{ display: 'flex', marginTop: 46, fontSize: 26, color: SEV[severity] ?? SEV.info, textTransform: 'uppercase', letterSpacing: 3 }}>{kicker}</div>
        <div style={{ display: 'flex', marginTop: 18, fontSize: size, fontWeight: 800, lineHeight: 1.08 }}>{title}</div>
        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 26, color: '#93A19C' }}>{footer ?? 'velkrypt.online · Cybersecurity news & threat intel'}</div>
      </div>
    ),
    OG_SIZE,
  );
}
