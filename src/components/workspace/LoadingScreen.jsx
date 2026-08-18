import somadrawLogo from '../../assets/SomadrawLogo.png'

function OrbitArrow() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 drop-shadow-sm"
    >
      <path d="M12 2 17 11 12 8.5 7 11Z" className="fill-ink" />
    </svg>
  )
}

function LoadingScreen({ message = 'Loading your workspace…' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-white">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <div className="absolute inset-4 rounded-full border border-line" />
        <div className="absolute inset-4 animate-orbit">
          <OrbitArrow />
        </div>
        <img
          src={somadrawLogo}
          alt="Somadraw"
          className="relative h-14 w-14 object-contain"
        />
      </div>
      <p className="text-[14px] font-medium text-soft">{message}</p>
    </div>
  )
}

export default LoadingScreen
