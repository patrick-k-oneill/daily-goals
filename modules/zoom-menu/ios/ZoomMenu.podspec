Pod::Spec.new do |s|
  s.name           = 'ZoomMenu'
  s.version        = '1.0.0'
  s.summary        = 'Zoom In and Zoom Out in the Mac menu bar for Daily Goals'
  s.description    = 'Adds Zoom In and Zoom Out with their keyboard shortcuts to the View menu when the app runs on a Mac.'
  s.author         = ''
  s.homepage       = 'https://github.com/patrick-k-oneill/daily-goals'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
