interface EmptyStateProps {
  icon:        React.ReactNode
  title:       string
  description?: string
  action?:     React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className='flex flex-col items-center justify-center py-16 text-center'>
      <div className='text-gray-700 mb-4'>{icon}</div>
      <h3 className='text-sm font-semibold text-gray-500 mb-1'>{title}</h3>
      {description && (
        <p className='text-xs text-gray-600 max-w-xs leading-relaxed'>{description}</p>
      )}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  )
}
