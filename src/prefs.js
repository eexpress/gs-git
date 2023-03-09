/*********************************************************************
 * Highlight Focus is Copyright (C) 2021-2023 Pim Snel
 *
 * Highlight Focus is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3 as
 * published by the Free Software Foundation
 *
 * Highlight Focus is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Highlight Focus.  If not, see <http://www.gnu.org/licenses/>.
 **********************************************************************/

const GObject = imports.gi.GObject;
const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Gdk = imports.gi.Gdk;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const UI = Me.imports.ui;

/**
 * prefs initiation
 *
 * @returns {void}
 */
function init() {
}

function cssHexString(css) {
    let rrggbb = '#';
    let start;
    for (let loop = 0; loop < 3; loop++) {
        let end = 0;
        let xx = '';
        for (let loop = 0; loop < 2; loop++) {
            while (true) {
                let x = css.slice(end, end + 1);
                if ((x == '(') || (x == ',') || (x == ')'))
                    break;
                end++;
            }
            if (loop == 0) {
                end++;
                start = end;
            }
        }
        xx = parseInt(css.slice(start, end)).toString(16);
        if (xx.length == 1)
            xx = '0' + xx;
        rrggbb += xx;
        css = css.slice(end);
    }
    return rrggbb;
}

/**
 * Builds the preferences widget
 */
/* exported buildPrefsWidget */
function buildPrefsWidget() {
  let widget = new GsGitPrefsWidget();
  return widget;
}


/**
 * Describes the widget that is shown in the extension settings section of
 * GNOME tweek.
 */
const GsGitPrefsWidget = new GObject.Class({
  Name: 'Shortcuts.Prefs.Widget',
  GTypeName: 'GsGitPrefsWidget',
  Extends: Gtk.ScrolledWindow,

  /**
   * Initalises the widget
   */
  _init: function() {
    this.parent(
      {
        valign: Gtk.Align.FILL,
        vexpand: true
      }
    );

    this._settings = ExtensionUtils.getSettings();

    this.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);

    this._grid = new UI.ListGrid();

    this.set_child(new UI.Frame(this._grid));

    let mainSettingsLabel = new UI.LargeLabel("Main Settings");
    this._grid._add(mainSettingsLabel)

    this._openInCmdEntry = new Gtk.Entry();
    let label_open_in_cmd = new UI.Label('Open dir in terminal command')
    this._grid._add(label_open_in_cmd, this._openInCmdEntry);
    this._settings.bind("open-in-terminal-command", this._openInCmdEntry, "text", Gio.SettingsBindFlags.DEFAULT);

    let alertDirtyRepos = new UI.Check("Alert dirty repos");
    this._settings.bind('alert-dirty-repos', alertDirtyRepos, 'active', Gio.SettingsBindFlags.DEFAULT);
    this._grid._add(alertDirtyRepos);

    let showChangedFiles = new UI.Check("Show changed files");
    this._settings.bind('show-changed-files', showChangedFiles, 'active', Gio.SettingsBindFlags.DEFAULT);
    this._grid._add(showChangedFiles);
  }
});
