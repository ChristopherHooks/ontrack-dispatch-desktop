interface Props {
  icon:        React.ReactNode
  title:       string
  description: string
  badge?:      string
}

export function PagePlaceholder({ icon, title, description, badge }: Props) {
  return (
    <div className='flex items-center justify-center h-full min-h-[60vh]'>
      <div className='text-center max-w-sm animate-fade-in'>
        {/* Icon */}
        <div className='w-16 h-16 rounded-2xl bg-surface-700 border border-surface-400 flex items-center justify-center mx-auto mb-5 text-orange-500 shadow-card'>
          {icon}
        </div>

        {/* Title + badge */}
        <div className='flex items-center justify-center gap-2 mb-3'>
          <h2 className='text-lg font-semibold text-gray-100'>{title}</h2>
          {badge && (
            <span className='px-2 py-0.5 text-2xs font-medium bg-orange-600/20 text-orange-400 rounded-full border border-orange-600/30'>
              {badge}
            </span>
          )}
        </div>

        <p className='text-sm text-gray-500 leading-relaxed'>{description}</p>

        <div className='mt-6 w-12 h-0.5 bg-surface-400 mx-auto rounded-full opacity-50' />
        <p className='text-2xs text-gray-600 mt-3'>Module coming in next build phase</p>
      </div>
    </div>
  )
}
