import { Button, Signal } from '@/components/ui'

export function NotFound() {
  return (
    <div className="notfound">
      <div className="shell notfound__inner">
        <p className="eyebrow">404</p>
        <h1 className="display display--page">Nothing playing here.</h1>
        <p className="lede">
          That page does not exist. The catalogue, your library and Muse are all still where you left them.
        </p>
        <div className="notfound__actions">
          <Button to="/" size="lg">
            Back to the start
          </Button>
          <Button to="/create" variant="ghost" size="lg" iconRight="arrow-right">
            Build a playlist
          </Button>
        </div>
      </div>
      <Signal amplitude={0.18} complexity={0.2} speed={0.35} height={120} />
    </div>
  )
}
