import dashboard from "./sections/dashboard.html?raw";
import inspection from "./sections/inspection.html?raw";
import issues from "./sections/issues.html?raw";
import history from "./sections/history.html?raw";
import report from "./sections/report.html?raw";
import settings from "./sections/settings.html?raw";

document.querySelector("#view-container").innerHTML = [
  dashboard, inspection, issues, history, report, settings,
].join("\n");

const storageKey = "ctc-clean-tracker-records";
let changeHandler;
const readRecords = () => JSON.parse(localStorage.getItem(storageKey) || "[]");
const publish = () => changeHandler?.onDataChanged(readRecords());

window.dataSdk = {
  async init(handler) {
    changeHandler = handler;
    publish();
    return { isOk: true };
  },
  async create(record) {
    const records = readRecords();
    records.push({ ...record, __backendId: crypto.randomUUID() });
    localStorage.setItem(storageKey, JSON.stringify(records));
    publish();
    return { isOk: true };
  },
  async update(record) {
    const records = readRecords();
    const index = records.findIndex((item) => item.__backendId === record.__backendId);
    if (index < 0) return { isOk: false };
    records[index] = record;
    localStorage.setItem(storageKey, JSON.stringify(records));
    publish();
    return { isOk: true };
  },
};

import("./app.js");
