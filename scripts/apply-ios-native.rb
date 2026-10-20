require 'fileutils'
require 'xcodeproj'

root = File.expand_path('..', __dir__)
mobile = File.join(root, 'apps/mobile')
project_dir = File.join(mobile, 'ios/App')
project_path = File.join(project_dir, 'App.xcodeproj')
native = File.join(mobile, 'native/ios')
app_group_id = 'group.datamerge.xyz.lexbrain.app'

unless File.directory?(project_path)
  abort "iOS project not found at #{project_path}; run `npx cap add ios` first."
end

project = Xcodeproj::Project.open(project_path)
app_target = project.targets.find { |target| target.name == 'App' }
abort 'Could not find the Capacitor App target.' unless app_target

def add_group(project, name)
  project.main_group.children.find { |child| child.respond_to?(:name) && child.name == name } ||
    project.main_group.new_group(name, name)
end

def configure_extension(target, bundle_id, info_path, entitlements_path)
  target.build_configurations.each do |configuration|
    settings = configuration.build_settings
    settings['PRODUCT_BUNDLE_IDENTIFIER'] = bundle_id
    settings['PRODUCT_NAME'] = '$(TARGET_NAME)'
    settings['INFOPLIST_FILE'] = info_path
    settings['CODE_SIGN_ENTITLEMENTS'] = entitlements_path
    settings['GENERATE_INFOPLIST_FILE'] = 'NO'
    settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES'
    settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
    settings['SWIFT_VERSION'] = '5.0'
    settings['TARGETED_DEVICE_FAMILY'] = '1,2'
    settings['SKIP_INSTALL'] = 'YES'
  end
end

def add_extension(project, app_target, name, bundle_id, files, resources, info_file, entitlements_file)
  target = project.targets.find { |candidate| candidate.name == name }
  target ||= project.new_target(:app_extension, name, :ios, '15.0')
  group = add_group(project, name)

  [*files, *resources, info_file, entitlements_file].each do |file|
    destination = File.join(File.dirname(project.path), name, File.basename(file))
    FileUtils.mkdir_p(File.dirname(destination))
    FileUtils.cp(file, destination)
  end

  files.each do |file|
    destination = File.join(File.dirname(project.path), name, File.basename(file))
    relative_path = File.basename(destination)
    reference = group.files.find { |entry| entry.path == relative_path } || group.new_file(relative_path)
    target.source_build_phase.add_file_reference(reference) unless target.source_build_phase.files_references.include?(reference)
  end

  resources.each do |file|
    destination = File.join(File.dirname(project.path), name, File.basename(file))
    relative_path = File.basename(destination)
    reference = group.files.find { |entry| entry.path == relative_path } || group.new_file(relative_path)
    target.resources_build_phase.add_file_reference(reference) unless target.resources_build_phase.files_references.include?(reference)
  end

  info_path = "#{name}/#{File.basename(info_file)}"
  entitlements_path = "#{name}/#{File.basename(entitlements_file)}"
  configure_extension(target, bundle_id, info_path, entitlements_path)

  embed_phase = app_target.copy_files_build_phases.find { |phase| phase.name == 'Embed App Extensions' }
  unless embed_phase
    embed_phase = app_target.new_copy_files_build_phase('Embed App Extensions')
    embed_phase.dst_subfolder_spec = '13'
  end
  unless embed_phase.files_references.include?(target.product_reference)
    embed_phase.add_file_reference(target.product_reference, true)
  end
  app_target.add_dependency(target) unless app_target.dependencies.any? { |dependency| dependency.target == target }
  target
end

def write_entitlements(path, app_group_id)
  Xcodeproj::Plist.write_to_path(
    { 'com.apple.security.application-groups' => [app_group_id] },
    path
  )
end

def add_url_scheme(info_path, app_id)
  info = Xcodeproj::Plist.read_from_path(info_path)
  url_types = info['CFBundleURLTypes'] ||= []
  unless url_types.any? { |entry| Array(entry['CFBundleURLSchemes']).include?('lexbrain') }
    url_types << {
      'CFBundleURLName' => app_id,
      'CFBundleURLSchemes' => ['lexbrain']
    }
  end
  Xcodeproj::Plist.write_to_path(info, info_path)
end

app_id = app_target.build_configurations
  .map { |configuration| configuration.build_settings['PRODUCT_BUNDLE_IDENTIFIER'] }
  .find { |value| value && !value.start_with?('$(') }
abort 'Could not determine the app bundle identifier.' unless app_id

share_info = File.join(native, 'ShareExtension/Info.plist')
share_entitlements = File.join(native, 'ShareExtension/LexBrainShareExtension.entitlements')
safari_info = File.join(native, 'SafariWebExtension/Info.plist')
safari_entitlements = File.join(native, 'SafariWebExtension/LexBrainSafariExtension.entitlements')
share_files = [File.join(native, 'ShareExtension/ShareViewController.swift')]
share_resources = []
safari_files = [File.join(native, 'SafariWebExtension/SafariWebExtensionHandler.swift')]
safari_resources = %w[manifest.json content.js].map { |file| File.join(native, 'SafariWebExtension', file) }

add_extension(project, app_target, 'LexBrainShareExtension', "#{app_id}.share", share_files, share_resources, share_info, share_entitlements)
add_extension(project, app_target, 'LexBrainSafariExtension', "#{app_id}.safari", safari_files, safari_resources, safari_info, safari_entitlements)

app_source = File.join(project_dir, 'App')
app_entitlements_path = File.join(app_source, 'LexBrain.entitlements')
write_entitlements(app_entitlements_path, app_group_id)
app_target.build_configurations.each do |configuration|
  configuration.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/LexBrain.entitlements'
end

add_url_scheme(File.join(app_source, 'Info.plist'), app_id)

project.save
puts 'Configured iOS Share Sheet and Safari Web Extension targets.'