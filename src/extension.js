const _domain = 'git-monitor';
const GETTEXT_DOMAIN = _domain;

const { GObject, St, Gio, GLib, Pango, Clutter } = imports.gi;

const Gettext = imports.gettext.domain(GETTEXT_DOMAIN);
const _ = Gettext.gettext;

const ExtensionUtils = imports.misc.extensionUtils;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Me = ExtensionUtils.getCurrentExtension();
const ByteArray = imports.byteArray;
const Util = imports.misc.util;

function lg(s) { log("===" + _domain + "===>" + s); }

let gitDirs = [];
const configname = _domain + ".json";  //没有界面时，还不能改成schmes方式。
const configfile = GLib.get_user_config_dir() + "/" + configname;
const configorig = Me.path + "/" + configname;

const Indicator = GObject.registerClass(
	class Indicator extends PanelMenu.Button {
		_init() {
			super._init(0.0, _domain);

			this.stock_icon = Gio.icon_new_for_string(Me.path + "/org.gnome.gitg-symbolic.svg");

			this.add_child(new St.Icon({
				gicon : this.stock_icon,
				style_class : 'system-status-icon'
			}));

			this.connect("button-press-event", (actor, event) => {
				if (event.get_button() == 2) {	// refresh
					this.menu._getMenuItems().forEach((j) => { j.destroy(); });
					this.refresh();
				}
				if (event.get_button() == 3) {	// open configfile
					Gio.app_info_launch_default_for_uri(`file://${configfile}`, global.create_app_launch_context(0, -1));
				}
			});

			if (!GLib.file_test(configfile, GLib.FileTest.IS_REGULAR)) {
				const [ok, content] = GLib.file_get_contents(configorig);
				if (ok) {
					GLib.file_set_contents(configfile, content);
				}
			}

			this.refresh();
		}

		refresh() {	 // re-read json file, check all dirs, refresh menu.
			try {
				if (GLib.file_test(configfile, GLib.FileTest.IS_REGULAR)) {
					const [ok, content] = GLib.file_get_contents(configfile);
					if (ok) {
						const obj = JSON.parse(ByteArray.toString(content));
						if (obj.dirs) {
							gitDirs = [];
							for (let i of obj.dirs) {
								i = i.replace(/^~/, GLib.get_home_dir());
								gitDirs.push(i);
							}
						}
					}
				}
			} catch (e) { throw e; }

			for (let i of gitDirs) {
				const r = this.lsDir(i);
				if (!r) continue;
				for (let j of r) {
					this.async_cmd_git_st(i, j);
				}
			}
		}

		async_cmd_git_st(root, path) {
			if (GLib.chdir(root) != 0) return null;	 // need improve
			if (GLib.chdir(path) != 0) return null;	 // need improve
			try {
				let proc = Gio.Subprocess.new(
					[ 'git', 'status' ],
					Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

				proc.communicate_utf8_async(null, null, (proc, res) => {
					try {
						let [, stdout, stderr] = proc.communicate_utf8_finish(res);
						if (proc.get_successful()) {
							const l = stdout.split("\n").filter(item => item.match(/[:：](?=\ )/));
							if (l.length > 0) {
								this.add_menu(root, path, true);
								for (let i of l) {
									this.add_menu(root + "/" + path, i, false);
								}
							}
						} else {
							log("err: " + stderr);
						}
					} catch (e) { logError(e); }
				});
			} catch (e) { logError(e); }
		};

		add_menu(path, text, isDir) {
			let item;
			if (isDir) {
				item = new PopupMenu.PopupImageMenuItem(text, this.stock_icon);
				item.label.clutter_text.set_line_alignment(Pango.Alignment.RIGHT);
				const pango = text.bold().italics().fontcolor("#F29F9C").replace(/font/g, "span");
				item.label.clutter_text.set_markup(pango);
				item.connect('activate', (actor, event) => {
					if (event.get_button() == 3) {
						GLib.spawn_command_line_async(`gnome-terminal --working-directory='${path}/${text}' -- bash -c 'git status; bash'`);
						//~ Util.spawn(['gnome-terminal', `--working-directory='${path}/${text}' -- bash -c 'git status; bash'`]); //no work correctly.
						return Clutter.EVENT_STOP;
					}
					Gio.app_info_launch_default_for_uri(`file://${path}/${text}`, global.create_app_launch_context(0, -1));
				});
			} else {
				item = new PopupMenu.PopupMenuItem(text);
				item.connect('activate', (actor, event) => {
					let f = text;
					f = f.replace(/^.*[:：]\ */, '').trim();
					if (event.get_button() == 3) {
						Gio.app_info_launch_default_for_uri(`file://${path}/${f}`, global.create_app_launch_context(0, -1));
						return Clutter.EVENT_STOP;
					}
					if (GLib.chdir(path) != 0) return;
					Util.spawn(['git', 'difftool', f]);
				});
			}
			this.menu.addMenuItem(item);
		};

		lsDir(path) {  // return an array of git dirs in path.
			if (!this.isDir(path)) return null;
			const dir = Gio.File.new_for_path(path);
			let fileEnum;
			let r = [];
			try {
				fileEnum = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NOFOLLOW_SYMLINKS, null);
			} catch (e) { fileEnum = null; }
			if (fileEnum != null) {
				let info;
				while (info = fileEnum.next_file(null)) {
					const f = info.get_name();
					if (this.isDir(path + "/" + f + "/.git")) {
						r.push(f);
					}
				}
			}
			return r;
		}

		isDir(path) {
			return GLib.file_test(path, GLib.FileTest.IS_DIR);
		}
	});

class Extension {
	constructor(uuid) {
		this._uuid = uuid;

		ExtensionUtils.initTranslations(GETTEXT_DOMAIN);
	}

	enable() {
		this._indicator = new Indicator();
		Main.panel.addToStatusArea(this._uuid, this._indicator);
	}

	disable() {
		this._indicator.destroy();
		this._indicator = null;
	}
}

function init(meta) {
	return new Extension(meta.uuid);
}
