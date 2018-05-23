/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
/*
Register the time editor -- stopwatch
  - set the file extension, icon, react component,
    and how to init and remove the actions/store
*/

let { register_file_editor } = require("../project_file");
import { redux_name } from "../smc-react-ts";
let { webapp_client } = require("../webapp_client");
let { alert_message } = require("../alerts");

let { EditorTime } = require("./editor");
import { TimeActions } from "./actions";

register_file_editor({
  ext: ["time"],

  is_public: false,

  icon: "clock-o",

  component: EditorTime,

  init(path, redux, project_id) {
    const name = redux_name(project_id, path, this.is_public);
    if (redux.getActions(name) != null) {
      return name; // already initialized
    }

    const actions = redux.createActions(name, TimeActions);
    const store = redux.createStore(name);

    actions._init(project_id, path);

    const syncdb = webapp_client.sync_db({
      project_id,
      path,
      primary_keys: ["id"],
      string_cols: ["label"]
    });
    actions.syncdb = syncdb;
    actions.store = store;
    syncdb.once("init", err => {
      if (err) {
        const mesg = `Error opening '${path}' -- ${err}`;
        console.warn(mesg);
        alert_message({ type: "error", message: mesg });
        return;
      }
      actions._syncdb_change();
      return syncdb.on("change", actions._syncdb_change);
    });
    return name;
  },

  remove(path, redux, project_id) {
    const name = redux_name(project_id, path, this.is_public);
    const actions = redux.getActions(name);
    __guard__(actions != null ? actions.syncdb : undefined, x => x.close());
    const store = redux.getStore(name);
    if (store == null) {
      return;
    }
    delete store.state;
    // It is *critical* to first unmount the store, then the actions,
    // or there will be a huge memory leak.
    redux.removeStore(name);
    redux.removeActions(name);
    return name;
  }
});

function __guard__(value, transform) {
  return typeof value !== "undefined" && value !== null
    ? transform(value)
    : undefined;
}