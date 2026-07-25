import { getDisplayUser } from '../lib/userDisplay'

function SettingsView({ user }) {
  const { name, email, picture } = getDisplayUser(user)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Account Info</h1>
        <p className="mt-1.5 text-[14.5px] text-soft">
          Manage your account details.
        </p>

        <div className="mt-8 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            {picture ? (
              <img
                src={picture}
                alt=""
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-full border border-line object-cover"
              />
            ) : (
              <span className="gradient-bg flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white">
                {name[0]?.toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-ink">{name}</p>
              <p className="truncate text-[13.5px] text-soft">{email}</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-[13.5px] text-soft">
          More settings are on the way.
        </p>
      </div>
    </div>
  )
}

export default SettingsView
