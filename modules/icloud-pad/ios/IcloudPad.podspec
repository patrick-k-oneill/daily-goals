Pod::Spec.new do |s|
  s.name           = 'IcloudPad'
  s.version        = '1.0.0'
  s.summary        = 'The Daily Goals pad directory in the iCloud container'
  s.description    = 'Metadata query, on-demand download and coordinated reads and writes for the pad files in iCloud Drive.'
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
