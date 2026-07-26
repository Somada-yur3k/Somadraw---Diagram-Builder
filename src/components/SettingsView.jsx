import { getDisplayUser } from '../lib/userDisplay'

function SettingsView({ user }) {
  const { name, email, picture } = getDisplayUser(user)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <h1 className="text-lg font-semibold tracking-tight text-ink">Account Info</h1>
        <p className="mt-1 text-[12.5px] text-soft">
          Manage your account details.
        </p>

        <div className="mt-6">
          <div className="flex items-center gap-3">
            {picture ? (
              <img
                src={picture}
                alt=""
                referrerPolicy="no-referrer"
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="gradient-bg flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-semibold text-white">
                {name[0]?.toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-ink">{name}</p>
              <p className="truncate text-[12px] text-soft">{email}</p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-[12px] text-soft">
          More settings are on the way.
        </p>
      </div>
    </div>
  )
}

export default SettingsView
