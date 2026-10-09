// A template (unlike a layout) re-mounts on every navigation, so this gives
// each new screen a short fade-in instead of an abrupt swap.
//
// Opacity only - no transform. Any transform on this wrapper would become the
// containing block for position:fixed descendants (sticky CTA bars, modals,
// bottom sheets) and pin them to the wrapper instead of the screen.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="flex-grow flex flex-col animate-screen-in motion-reduce:animate-none">{children}</div>;
}
