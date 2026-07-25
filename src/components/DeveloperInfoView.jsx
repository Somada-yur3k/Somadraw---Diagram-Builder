function DeveloperInfoView() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Developer</h1>
        <p className="mt-1.5 text-[14.5px] text-soft">
          About the person who built Somadraw.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <p className="text-[15px] font-medium text-ink">Eurika Adamos</p>
          <p className="mt-1 text-[13.5px] text-soft">BSIT-MI, 3rd Year</p>
          <p className="text-[13.5px] text-soft">National University Fairview</p>
        </div>
      </div>
    </div>
  )
}

export default DeveloperInfoView
