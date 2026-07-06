import {
  JewelFrame, JewelDivider, JewelPip, JewelDangle,
  JewelStatementOval, JewelRoomOval, WeekRing,
} from './index.js'

// Dev gallery for the Jewelry & Joy kit — visit /?kit=1. Renders every piece on
// the live default (navy bokeh) background so the jewelry is judged in context.

const H = ({ children }) => (
  <h2 style={{ fontFamily: 'var(--font-title)', fontWeight: 400, fontSize: 26, color: '#e9c24c',
    margin: '46px 0 6px', letterSpacing: '0.04em' }}>{children}</h2>
)
const Tag = ({ children }) => (
  <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11, letterSpacing: '0.28em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>{children}</div>
)
const Cell = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 40 }}>{children}</div>
    <Tag>{label}</Tag>
  </div>
)
const Row = ({ children, gap = 40 }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap, alignItems: 'flex-end', justifyContent: 'flex-start' }}>{children}</div>
)

export default function JewelKitGallery() {
  return (
    <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto',
      padding: '48px 40px 120px', color: '#f2f0e6' }}>
      <div style={{ fontFamily: 'var(--font-tagline)', fontSize: 24, letterSpacing: '0.22em',
        textTransform: 'lowercase', color: 'var(--color-text-secondary)',
        textShadow: '0 0 18px rgba(166,115,228,0.45)' }}>· jewelry &amp; joy — kit ·</div>
      <div style={{ fontFamily: 'var(--font-body)', fontWeight: 300, color: 'var(--color-text-dim)', marginTop: 8 }}>
        every piece on the default navy background · dev gallery
      </div>

      <H>Frames</H>
      <Row>
        <Cell label="quiet"><JewelFrame tier="quiet" width={220} /></Cell>
        <Cell label="medium · 2 corners"><JewelFrame tier="medium" corners={2} width={220} /></Cell>
        <Cell label="medium · 4 corners"><JewelFrame tier="medium" corners={4} width={220} /></Cell>
      </Row>
      <Row>
        <Cell label="statement"><JewelFrame tier="statement" width={300} /></Cell>
        <Cell label="statement · one gem"><JewelFrame tier="statement" gem width={300} /></Cell>
      </Row>

      <H>Dividers</H>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 560 }}>
        <Cell label="quiet"><JewelDivider kind="quiet" width={520} /></Cell>
        <Cell label="medium"><JewelDivider kind="medium" width={520} /></Cell>
        <Cell label="diamonds (statement A)"><JewelDivider kind="diamonds" width={520} /></Cell>
        <Cell label="curves (statement B)"><JewelDivider kind="curves" width={520} /></Cell>
        <Cell label="curves · gem-set (ultra)"><JewelDivider kind="curves" gem width={520} /></Cell>
      </div>

      <H>Pips</H>
      <Row gap={28}>
        {['jade', 'gold', 'amber', 'garnet', 'amethyst'].map(c => (
          <Cell key={c} label={c}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <JewelPip color={c} size={4} /><JewelPip color={c} size={6} />
              <JewelPip color={c} size={8} /><JewelPip color={c} size={12} />
            </div>
          </Cell>
        ))}
      </Row>
      <div style={{ marginTop: 20, fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: 16, color: '#ddd5e8' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><JewelPip color="jade" size={6} /> Water the jasmine on the sill</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><JewelPip color="amethyst" size={6} /> Write three quiet lines</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><JewelPip color="gold" size={6} /> One page of the good book</div>
      </div>

      <H>Dangles <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>· one per page, max</span></H>
      <Row gap={70}>
        <Cell label="whisper"><JewelDangle length="whisper" width={26} /></Cell>
        <Cell label="classic"><JewelDangle length="classic" width={26} /></Cell>
        <Cell label="celestial"><JewelDangle length="celestial" width={26} /></Cell>
      </Row>

      <H>Statement oval</H>
      <Row gap={50}>
        <Cell label="plain"><JewelStatementOval variant="plain" width={200} /></Cell>
        <Cell label="one gem (north)"><JewelStatementOval variant="gem" width={200} /></Cell>
        <Cell label="small · centre diamond"><JewelStatementOval variant="small" width={200} /></Cell>
      </Row>

      <H>Room ovals <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>· wings directory (Step 6)</span></H>
      <Row gap={50}>
        <Cell label="quiet"><JewelRoomOval variant="quiet" width={120} /></Cell>
        <Cell label="medium · north diamond"><JewelRoomOval variant="medium" width={120} /></Cell>
        <Cell label="active · glow + sparkle"><JewelRoomOval variant="medium" active width={130} /></Cell>
      </Row>

      <H>WeekStrip rings <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>· (Step 5)</span></H>
      <Row gap={18}>
        <Cell label="jade"><WeekRing band="jade" num={29} numColor="#bfe9d8" size={80} /></Cell>
        <Cell label="amethyst"><WeekRing band="amethyst" num={2} numColor="#ddc9f5" size={80} /></Cell>
        <Cell label="gold"><WeekRing band="gold" num={4} numColor="#f2e3b2" size={80} /></Cell>
        <Cell label="today"><WeekRing band="gold" today num={5} size={92} /></Cell>
      </Row>
    </div>
  )
}
