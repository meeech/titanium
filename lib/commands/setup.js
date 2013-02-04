/*
 * setup.js: Titanium CLI setup command
 *
 * Copyright (c) 2012, Appcelerator, Inc.  All Rights Reserved.
 * See the LICENSE file for more information.
 */

var appc = require('node-appc'),
	afs = appc.fs,
	mix = appc.util.mix,
	fields = require('fields'),
	async = require('async'),
	exec = require('child_process').exec,
	i18n = appc.i18n(__dirname),
	__ = i18n.__,
	__n = i18n.__n;












var prompt = require('prompt');











exports.desc = __('run the setup wizard');

exports.config = function (logger, config, cli) {
	return {
		noAuth: true,
		flags: {
			advanced: {
				abbr: 'a',
				desc: __('prompts for all configuration options')
			}
		}
	};
};

exports.run = function (logger, config, cli) {
	logger.log(__('Enter %s at any time to quit', 'ctrl-c'.cyan) + '\n');
	
	appc.ios.detect(function (env) {
		var distNames = env && env.certs.distNames.map(function (name) {
				var m = name.match(/^([^(]+?)*/);
				return m && m[0].trim();
			}),
			sdk = cli.env.getSDK(config.app.sdk) || cli.env.getSDK('latest');
		
		async.series({
			'user': function (next) {
				logger.log(__('User Settings').magenta + '\n');
				
				fields.set({
					'name': fields.text({
						default: config.user.name,
						label: __('What is your name?'),
						desc: __('This is used as the default for the "author" field in the tiapp.xml or module manifest file when creating new projects)'),
						validate: function (value) {
							if (!value) {
								throw new Error(__('Invalid name'));
							}
							return true;
						}
					}),
					'email': fields.text({
						default: config.user.email,
						label: __('What is your email address used for logging into the Appcelerator Network?'),
						validate: function (value) {
							if (!value) {
								throw new Error(__('Invalid e-mail address'));
							}
							return true;
						}
					}),
					'locale': fields.text({
						default: config.user.locale,
						label: __('What would you like as your default locale?'),
						desc: __('(examples: "en", "de", "fr")'),
						validate: function (value) {
							if (!value || !/^[A-Za-z]{2}[A-Za-z]?(([-_][A-Za-z0-9]{4})?[-_][A-Za-z0-9]{2}[A-Za-z0-9]?)?$/.test(value)) {
								throw new Error(__('Invalid locale'));
							}
							return true;
						}
					})
				}).prompt(next);
			},
			
			'app': function (next) {
				logger.log(__('App Settings').magenta + '\n');
				
				fields.set({
					'idprefix': fields.text({
						default: config.app.idprefix,
						label: __('What is your prefix for application IDs?'),
						desc: __('(example: com.mycompany)')
					}),
					'publisher': fields.text({
						default: config.app.publisher,
						label: __('Used for populating the "publisher" field in new projects:')
					}),
					'url': fields.text({
						default: config.app.url,
						label: __('Used for populating the "url" field in new projects:')
					}),
					'sdk': fields.select({
						default: sdk && sdk.name,
						label: __('What Titanium SDK would you like to use by default?'),
						complete: true,
						suggest: true,
						suggestThreshold: 2,
						numbered: true,
						formatters: {
							option: function (opt, idx, num) {
								return '  ' + num + opt.label.cyan + '  ' + opt.path;
							}
						},
						promptLabel: __('Enter # or SDK name'),
						options: Object.keys(cli.env.sdks).map(function (sdk) {
							return { label: cli.env.sdks[sdk].name, path: cli.env.sdks[sdk].path, value: sdk };
						}),
						validate: function (value) {
							if (!cli.env.sdks[value]) {
								throw new Error(__('Invalid Titanium SDK'));
							}
							return true;
						}
					}),
					'workspace': fields.file({
						default: config.app.workspace,
						label: __('Path to your workspace where your projects should be created:'),
						complete: true,
						validate: function (value) {
							if (!afs.exists(afs.resolvePath(value))) {
								throw new Error(__('Invalid workspace directory'));
							}
							return true;
						}
					})
				}).prompt(next);
			},
			
			'cli': function (next) {
				logger.log(__('CLI Settings').magenta + '\n');
				
				var logLevels = logger.getLevels();
				
				fields.set({
					'colors': fields.select({
						promptLabel: 'Enable colors in the CLI?',
						display: 'prompt',
						default: config.cli.colors === false ? 'no' : 'yes',
						options: [ 'yes', 'no' ],
						validate: function (value, callback) {
							callback(null, value === 'yes');
						}
					}),
					'logLevel': fields.select({
						default: config.cli.logLevel || 'info',
						label: __('Default logging output level'),
						complete: true,
						suggest: true,
						suggestThreshold: 2,
						options: logLevels,
						style: {
							option: 'cyan'
						}
					}),
					'prompt': fields.select({
						promptLabel: __('Would you like to be prompted for missing options and arguments?'),
						display: 'prompt',
						default: (config.cli.hasOwnProperty('prompt') ? !!config.cli.prompt : true) ? 'yes' : 'no',
						options: [ 'yes', 'no' ],
						validate: function (value, callback) {
							callback(null, value === 'yes');
						}
					}),
					'failOnWrongSDK': fields.select({
						promptLabel: __('Fail if trying to compile an app on different version in the tiapp.xml?').bold,
						display: 'prompt',
						default: !!config.cli.failOnWrongSDK || false ? 'yes' : 'no',
						options: [ 'yes', 'no' ],
						validate: function (value, callback) {
							callback(null, value === 'yes');
						}
					}),
					'hasProxy': fields.select({
						promptLabel: __('Are you behind a proxy server?').bold,
						display: 'prompt',
						default: config.httpProxyServer ? 'yes' : 'no',
						options: [ 'yes', 'no' ],
						validate: function (value, callback) {
							callback(null, value === 'yes');
						},
						next: function (value) {
							return value ? 'httpProxyServer' : null;
						}
					}),
					'httpProxyServer': fields.text({
						default: config.httpProxyServer || '',
						label: __('HTTP proxy server'),
						desc: __('Only required if you are behind a proxy, otherwise leave blank.')
					})
				}).prompt(next);
			},
			
			'android': function (next) {
				logger.log(__('Android Settings').magenta + '\n');
				
				fields.set({
					'sdkPath': fields.file({
						default: config.android && config.android.sdkPath,
						label: __('Path to the Android SDK'),
						desc: __("Leave blank if you don't want to build for Android"),
						validate: function (value) {
							if (value && !afs.exists(afs.resolvePath(value))) {
								logger.error(__('Invalid Android SDK path'));
								return false;
							}
							return true;
						}
					}),
					'ndkPath': fields.file({
						default: config.android && config.android.ndkPath,
						label: __('Path to the Android NDK'),
						desc: __('Only required for building native Titainum Modules'),
						validate: function (value) {
							if (value && !afs.exists(afs.resolvePath(value))) {
								throw new appc.exception(__('Invalid Android NDK path'));
							}
							return true;
						}
					})
				}).prompt(next);
			},
			
			// TODO: only do iOS if on a Mac
			'ios': function (next) {
				logger.log(__('iOS Settings').magenta + '\n');
				
				fields.set({
					'ios.developerName': fields.select({
						default: config.ios && config.ios.developerName,
						label: __('What is the name of the iOS developer certificate you want to use by default?'),
						desc: __("Leave blank if you don't want to build for iOS"),
						complete: true,
						suggest: true,
						options: env.certs.devNames,
						validateblah: function (name) {
							var devNames;
							
							if (env && name) {
								var lowerCasedDevname = name.trim().toLowerCase();
								
								if (/\([0-9A-Za-z]*\)$/.test(lowerCasedDevname)) {
									devNames = env.certs.devNames.map(function (name) {
										return name.trim().toLowerCase();
									});
								} else {
									devNames = env.certs.devNames.map(function (name) {
										var m = name.match(/^([^(]+?)*/);
										return (m ? m[0] : name).trim().toLowerCase();
									});
								}
								
								if (devNames.indexOf(lowerCasedDevname) == -1) {
									var width = 0,
										i = 0,
										l = env.certs.devNames.length,
										h = Math.ceil(l / 2),
										output = [__('Available names:')];
									
									for (; i < h; i++) {
										if (env.certs.devNames[i].length > width) {
											width = env.certs.devNames[i].length;
										}
										output.push('    ' + env.certs.devNames[i]);
									}
									
									width += 12; // 4 spaces left padding, 8 spaces between columns
									for (h = 1; i < l; h++, i++) {
										output[h] = appc.string.rpad(output[h], width) + env.certs.devNames[i];
									}
									
									logger.error(__('Unable to find an iOS Developer Certificate for "%s"', name));
									return false;
								}
							}
							return true;
						}
					}) /*,
					'ios.distributionName': {
						default: config.ios && config.ios.distributionName,
						description: __('What is the name of the iOS distribution certificate you want to use by default?').bold
							+ ' ' + __('(this is used if you want to distribute the app either through the App Store or Ad Hoc)').grey,
						conform: function (name) {
							if (distNames.indexOf(name) == -1) {
								throw new appc.exception(__('Unable to find an iOS Distribution Certificate for "%s"', name), [
									__('Available names:')
								].concat(distNames.map(function (d) { return '    ' + d.cyan; })));
							}
							return true;
						}
					}*/
				}).prompt(next);
			} /*,
			
			'paths': function (next) {
				logger.log(__('Paths Settings').magenta + '\n');
				
				paths.commands
				paths.hooks
				paths.plugins
				paths.sdks
				paths.modules
				paths.xcode // new!
			}*/
		}, function (err, values) {
			if (err) {
				logger.log('\n');
				process.exit(1);
			}
			
			dump(values);
			/*
			Object.keys(results).forEach(function (key) {
				config.set(key, (results[key] || '').trim());
			});
			
			config.save();
			*/
			logger.log('\n' + __('Configuration saved') + '\n');
		});
	});
};
