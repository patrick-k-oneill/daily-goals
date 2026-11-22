Pod::Spec.new do |s|
  s.name           = 'BackTab'
  s.version        = '1.0.0'
  s.summary        = 'Shift+Tab from a hardware keyboard for Daily Goals'
  s.description    = 'Reports Shift+Tab as a key command while the app listens for it, since a text view types a tab for it otherwise.'
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
