(() => {
                const $ = (id) => document.getElementById(id);
                const items = [
                    "ความสะอาดพื้นห้องเรียน",
                    "ความสะอาดโต๊ะและเก้าอี้",
                    "กระดานและอุปกรณ์การเรียน",
                    "ถังขยะและการจัดการขยะ",
                    "ประตูและหน้าต่าง",
                    "ไฟฟ้าและระบบแสงสว่าง",
                    "พัดลมและเครื่องปรับอากาศ",
                    "ความเรียบร้อยของอุปกรณ์ภายในห้อง",
                    "ความปลอดภัยภายในห้องเรียน",
                    "ความเรียบร้อยโดยรวม",
                ];
                const labels = {
                    5: "ดีมาก",
                    4: "ดี",
                    3: "ปานกลาง",
                    2: "ควรปรับปรุง",
                    1: "แย่",
                };
                const schemaKeys = [
                    "record_type",
                    "building",
                    "floor",
                    "room",
                    "teacher",
                    "inspection_date",
                    "period",
                    "scores",
                    "score_percent",
                    "issue_type",
                    "issue_detail",
                    "urgency",
                    "issue_status",
                    "assignee",
                    "created_at",
                ];
                let backendRecords = [],
                    ready = false,
                    firstRead = false,
                    chart = null,
                    loadTimer = null,
                    writeQueue = Promise.resolve(),
                    lastWrite = 0;
                const pending = new Map(),
                    rows = (type) =>
                        backendRecords.filter((r) => r.record_type === type);
                const today = () => {
                    let d = new Date();
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                };
                const esc = (s) =>
                    String(s ?? "").replace(
                        /[&<>"']/g,
                        (c) =>
                            ({
                                "&": "&amp;",
                                "<": "&lt;",
                                ">": "&gt;",
                                '"': "&quot;",
                                "'": "&#39;",
                            })[c],
                    );
                const quality = (n) =>
                    n >= 90
                        ? "ดีเยี่ยม"
                        : n >= 80
                          ? "ดีมาก"
                          : n >= 70
                            ? "ดี"
                            : n >= 60
                              ? "ปานกลาง"
                              : "ควรปรับปรุง";
                const location = (r) =>
                    `${r.building} · ชั้น ${r.floor} · ห้อง ${r.room}`;
                const dateText = (s) => {
                    let d = new Date(s);
                    return Number.isNaN(d.getTime())
                        ? "—"
                        : d.toLocaleString("th-TH", {
                              dateStyle: "medium",
                              timeStyle: "short",
                          });
                };
                const avg = (a) =>
                    a.length
                        ? Math.round(
                              a.reduce(
                                  (s, r) => s + Number(r.score_percent || 0),
                                  0,
                              ) / a.length,
                          )
                        : null;
                const sorted = (a) =>
                    [...a].sort((x, y) =>
                        String(y.created_at || "").localeCompare(
                            String(x.created_at || ""),
                        ),
                    );
                function notice(s, error = false) {
                    let el = $("global-message");
                    el.textContent = s;
                    el.className = "message show" + (error ? " error" : "");
                    clearTimeout(notice.timer);
                    notice.timer = setTimeout(
                        () => (el.className = "message"),
                        6500,
                    );
                }
                const titles = {
                    dashboard: [
                        "ภาพรวมการตรวจเวร",
                        "ติดตามความเรียบร้อยของห้องเรียนในที่เดียว",
                    ],
                    inspection: ["ตรวจห้องเรียน", "ประเมินและบันทึกผลอย่างรวดเร็ว"],
                    issues: ["แจ้งและติดตามปัญหา", "จัดการสิ่งที่ต้องปรับปรุง"],
                    history: ["ประวัติการตรวจ", "ดูผลการตรวจย้อนหลัง"],
                    report: ["รายงานประจำเดือน", "เปรียบเทียบคุณภาพห้องเรียน"],
                    settings: ["จัดการอาคารและห้อง", "เพิ่มสถานที่โดยไม่ต้องแก้ไขระบบ"],
                };
                function switchView(v) {
                    document
                        .querySelectorAll(".view")
                        .forEach((el) =>
                            el.classList.toggle(
                                "active",
                                el.id === v + "-view",
                            ),
                        );
                    document
                        .querySelectorAll("[data-view]")
                        .forEach((el) =>
                            el.classList.toggle(
                                "active",
                                el.dataset.view === v,
                            ),
                        );
                    $("page-title").textContent = titles[v][0];
                    $("page-subtitle").textContent = titles[v][1];
                    if (v === "report") renderReport();
                    window.scrollTo(0, 0);
                }
                document
                    .querySelectorAll("[data-view]")
                    .forEach((el) =>
                        el.addEventListener("click", () =>
                            switchView(el.dataset.view),
                        ),
                    );
                $("today-text").textContent = new Date().toLocaleDateString(
                    "th-TH",
                    {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                    },
                );
                $("inspect-date").value = today();
                $("report-month").value = today().slice(0, 7);
                items.forEach((name, i) => {
                    let row = document.createElement("div");
                    row.className = "check-item";
                    let label = document.createElement("label");
                    label.htmlFor = "score-" + i;
                    label.textContent = `${i + 1}. ${name}`;
                    let sel = document.createElement("select");
                    sel.id = "score-" + i;
                    sel.className = "score-select";
                    sel.required = true;
                    [
                        ["", "เลือกระดับ"],
                        ...[5, 4, 3, 2, 1].map((n) => [
                            String(n),
                            `${labels[n]} (${n})`,
                        ]),
                        ["na", "ไม่เกี่ยวข้อง"],
                    ].forEach(([value, title]) =>
                        sel.add(new Option(title, value)),
                    );
                    row.append(label, sel);
                    $("checklist").append(row);
                    sel.addEventListener("change", renderLiveScore);
                });
                const scores = () =>
                    [...document.querySelectorAll(".score-select")].map(
                        (s) => s.value,
                    );
                function calculate(v) {
                    let valid = v.filter((x) => /^[1-5]$/.test(x));
                    return valid.length
                        ? Math.round(
                              (valid.reduce((s, x) => s + Number(x), 0) /
                                  (valid.length * 5)) *
                                  100,
                          )
                        : null;
                }
                function renderLiveScore() {
                    let n = calculate(scores());
                    $("live-score").textContent =
                        n === null
                            ? "เลือกคะแนนอย่างน้อยหนึ่งหัวข้อที่เกี่ยวข้อง"
                            : `คะแนนความเรียบร้อย ${n}% · ระดับ${quality(n)} (ไม่รวมหัวข้อที่ไม่เกี่ยวข้อง)`;
                }
                function setOptions(id, values, placeholder) {
                    let el = $(id),
                        old = el.value;
                    el.replaceChildren(new Option(placeholder, ""));
                    [...new Set(values)]
                        .sort((a, b) =>
                            String(a).localeCompare(String(b), "th", {
                                numeric: true,
                            }),
                        )
                        .forEach((x) => el.add(new Option(x, x)));
                    if ([...el.options].some((o) => o.value === old))
                        el.value = old;
                }
                function updateRoom(prefix) {
                    let b = $(prefix + "-building").value,
                        f = $(prefix + "-floor").value;
                    setOptions(
                        prefix + "-room",
                        rows("room")
                            .filter((x) => x.building === b && x.floor === f)
                            .map((x) => x.room),
                        "เลือกห้อง",
                    );
                }
                function updateFloor(prefix) {
                    let b = $(prefix + "-building").value;
                    setOptions(
                        prefix + "-floor",
                        rows("room")
                            .filter((x) => x.building === b)
                            .map((x) => x.floor),
                        "เลือกชั้น",
                    );
                    updateRoom(prefix);
                }
                function updateLocations() {
                    let buildings = [
                        ...rows("building").map((r) => r.building),
                        ...rows("room").map((r) => r.building),
                    ];
                    [
                        "inspect-building",
                        "issue-building",
                        "room-building",
                    ].forEach((id) => setOptions(id, buildings, "เลือกอาคาร"));
                    ["inspect", "issue"].forEach(updateFloor);
                    let names = [...new Set(buildings)].sort((a, b) =>
                        a.localeCompare(b, "th"),
                    );
                    $("location-list").innerHTML = names.length
                        ? names
                              .map(
                                  (b) =>
                                      `<div class="list-row"><div><strong>${esc(b)}</strong><small>${esc(
                                          rows("room")
                                              .filter((r) => r.building === b)
                                              .map(
                                                  (r) =>
                                                      `ชั้น ${r.floor} ห้อง ${r.room}`,
                                              )
                                              .join(" · ") || "ยังไม่มีห้อง",
                                      )}</small></div></div>`,
                              )
                              .join("")
                        : '<div class="empty">ยังไม่มีอาคาร เริ่มเพิ่มอาคารและห้องเรียนได้ที่นี่</div>';
                }
                ["inspect", "issue"].forEach((p) => {
                    $(p + "-building").addEventListener("change", () =>
                        updateFloor(p),
                    );
                    $(p + "-floor").addEventListener("change", () =>
                        updateRoom(p),
                    );
                });
                function base(type) {
                    return Object.fromEntries(
                        schemaKeys.map((k) => [
                            k,
                            k === "score_percent"
                                ? 0
                                : k === "record_type"
                                  ? type
                                  : k === "created_at"
                                    ? new Date().toISOString()
                                    : "",
                        ]),
                    );
                }
                async function create(record, button, success) {
                    if (!ready || !firstRead) {
                        notice("ยังเชื่อมต่อข้อมูลไม่ได้ กรุณาลองใหม่", true);
                        return false;
                    }
                    if (backendRecords.length >= 999) {
                        notice(
                            "ข้อมูลครบ 999 รายการแล้ว ไม่สามารถเพิ่มรายการใหม่ได้",
                            true,
                        );
                        return false;
                    }
                    button.disabled = true;
                    button.setAttribute("aria-busy", "true");
                    try {
                        let result = await window.dataSdk.create(record);
                        if (!result.isOk) {
                            notice(
                                "ไม่สามารถยืนยันการบันทึกได้ กรุณาตรวจสอบรายการก่อนลองอีกครั้ง",
                                true,
                            );
                            return false;
                        }
                        notice(success);
                        return true;
                    } catch {
                        notice(
                            "ไม่สามารถยืนยันการบันทึกได้ กรุณาตรวจสอบรายการก่อนลองอีกครั้ง",
                            true,
                        );
                        return false;
                    } finally {
                        button.disabled = false;
                        button.removeAttribute("aria-busy");
                    }
                }
                $("building-form").addEventListener("submit", async (e) => {
                    e.preventDefault();
                    let name = $("new-building").value.trim();
                    if (!name) return notice("กรุณาระบุชื่ออาคาร", true);
                    if (
                        rows("building").some(
                            (r) =>
                                r.building.toLowerCase() === name.toLowerCase(),
                        )
                    )
                        return notice("มีชื่ออาคารนี้แล้ว", true);
                    if (
                        await create(
                            { ...base("building"), building: name },
                            e.submitter || $("save-building"),
                            "เพิ่มอาคารแล้ว",
                        )
                    )
                        $("new-building").value = "";
                });
                $("room-form").addEventListener("submit", async (e) => {
                    e.preventDefault();
                    let b = $("room-building").value,
                        f = $("new-floor").value.trim(),
                        r = $("new-room").value.trim();
                    if (!b || !f || !r)
                        return notice("กรุณากรอกข้อมูลห้องให้ครบ", true);
                    if (
                        rows("room").some(
                            (x) =>
                                x.building === b &&
                                x.floor === f &&
                                x.room === r,
                        )
                    )
                        return notice("มีห้องนี้แล้ว", true);
                    if (
                        await create(
                            { ...base("room"), building: b, floor: f, room: r },
                            e.submitter || $("save-room"),
                            "เพิ่มห้องเรียนแล้ว",
                        )
                    ) {
                        $("new-floor").value = "";
                        $("new-room").value = "";
                    }
                });
                $("inspection-form").addEventListener("submit", async (e) => {
                    e.preventDefault();
                    let v = scores(),
                        n = calculate(v),
                        b = $("inspect-building").value,
                        f = $("inspect-floor").value,
                        r = $("inspect-room").value,
                        d = $("inspect-date").value,
                        p = $("inspect-period").value,
                        teacher = $("inspect-teacher").value.trim();
                    if (!teacher) return notice("กรุณาระบุชื่อครูผู้ตรวจสอบ", true);
                    if (n === null)
                        return notice(
                            "ต้องประเมินหัวข้อที่เกี่ยวข้องอย่างน้อยหนึ่งหัวข้อ",
                            true,
                        );
                    if (
                        rows("inspection").some(
                            (x) =>
                                x.building === b &&
                                x.floor === f &&
                                x.room === r &&
                                x.inspection_date === d &&
                                x.period === p,
                        )
                    )
                        return notice(
                            "ห้องนี้มีผลตรวจในวันที่และช่วงเวลาที่เลือกแล้ว เพื่อป้องกันการบันทึกซ้ำ",
                            true,
                        );
                    let record = {
                        ...base("inspection"),
                        building: b,
                        floor: f,
                        room: r,
                        teacher,
                        inspection_date: d,
                        period: p,
                        scores: JSON.stringify(v),
                        score_percent: n,
                    };
                    if (
                        await create(
                            record,
                            e.submitter || $("save-inspection"),
                            "บันทึกผลตรวจเรียบร้อยแล้ว",
                        )
                    ) {
                        e.target.reset();
                        $("inspect-date").value = today();
                        clearPreview("inspect-preview");
                        $("live-score").textContent = "เลือกคะแนนเพื่อดูผลประเมิน";
                    }
                });
                $("issue-form").addEventListener("submit", async (e) => {
                    e.preventDefault();
                    let record = {
                        ...base("issue"),
                        building: $("issue-building").value,
                        floor: $("issue-floor").value,
                        room: $("issue-room").value,
                        teacher: $("issue-teacher").value.trim(),
                        inspection_date: today(),
                        issue_type: $("issue-type").value,
                        issue_detail: $("issue-detail").value.trim(),
                        urgency: $("issue-urgency").value,
                        issue_status: "รอตรวจสอบ",
                    };
                    if (!record.teacher || !record.issue_detail)
                        return notice("กรุณากรอกชื่อผู้แจ้งและรายละเอียดปัญหา", true);
                    if (
                        await create(
                            record,
                            e.submitter || $("save-issue"),
                            "บันทึกปัญหาแล้ว",
                        )
                    ) {
                        e.target.reset();
                        clearPreview("issue-preview");
                    }
                });
                const previewUrls = {};
                function clearPreview(id) {
                    (previewUrls[id] || []).forEach(URL.revokeObjectURL);
                    previewUrls[id] = [];
                    $(id).replaceChildren();
                }
                [
                    ["inspect-photos", "inspect-preview"],
                    ["issue-photos", "issue-preview"],
                ].forEach(([input, target]) =>
                    $(input).addEventListener("change", (e) => {
                        clearPreview(target);
                        [...e.target.files]
                            .filter((f) => f.type.startsWith("image/"))
                            .forEach((f, i) => {
                                let img = document.createElement("img"),
                                    url = URL.createObjectURL(f);
                                previewUrls[target].push(url);
                                img.src = url;
                                img.alt = "ตัวอย่างภาพ " + (i + 1);
                                $(target).append(img);
                            });
                    }),
                );
                function waitForWrite() {
                    let ms = Math.max(0, 500 - (Date.now() - lastWrite));
                    return new Promise((resolve) => setTimeout(resolve, ms));
                }
                function queueIssue(id, fields) {
                    let previous = pending.get(id) || {};
                    pending.set(id, { ...previous, ...fields });
                    renderIssues();
                    let task = async () => {
                        let current = pending.get(id);
                        if (!current) return;
                        let record = backendRecords.find(
                            (r) => r.__backendId === id,
                        );
                        if (!record) {
                            pending.delete(id);
                            renderIssues();
                            notice("ไม่พบรายการปัญหานี้แล้ว", true);
                            return;
                        }
                        let sent = { ...current };
                        await waitForWrite();
                        lastWrite = Date.now();
                        try {
                            let result = await window.dataSdk.update({
                                ...record,
                                ...sent,
                            });
                            if (!result.isOk) throw Error("unconfirmed");
                            let latest = pending.get(id);
                            if (
                                latest &&
                                Object.keys(sent).every(
                                    (k) => latest[k] === sent[k],
                                )
                            )
                                pending.delete(id);
                            notice("อัปเดตปัญหาแล้ว");
                        } catch {
                            pending.delete(id);
                            notice(
                                "ไม่สามารถยืนยันการอัปเดตได้ กรุณาตรวจสอบข้อมูลก่อนลองอีกครั้ง",
                                true,
                            );
                        } finally {
                            renderIssues();
                        }
                    };
                    writeQueue = writeQueue.then(task, task);
                }
                function renderIssues() {
                    let list = $("issue-list"),
                        issues = sorted(rows("issue")),
                        ids = new Set(issues.map((x) => x.__backendId));
                    [...list.children].forEach((el) => {
                        if (el.dataset.id && !ids.has(el.dataset.id))
                            el.remove();
                    });
                    if (!issues.length) {
                        list.innerHTML =
                            '<div class="empty">ยังไม่มีปัญหาที่แจ้ง</div>';
                        return;
                    }
                    list.querySelector(".empty")?.remove();
                    issues.forEach((x) => {
                        let id = x.__backendId,
                            shown = { ...x, ...pending.get(id) },
                            el = [...list.children].find(
                                (n) => n.dataset.id === id,
                            );
                        if (!el) {
                            el = document.createElement("div");
                            el.className = "list-row";
                            el.dataset.id = id;
                            el.innerHTML =
                                '<div class="issue-info"><strong></strong><small></small><div class="issue-controls"><label>ผู้รับผิดชอบ <input class="assignee-input" placeholder="ระบุชื่อ"></label><button type="button" class="mini-btn assign-btn">บันทึกชื่อ</button></div></div><div class="issue-controls"><label>สถานะ <select class="status-select"><option>รอตรวจสอบ</option><option>รับเรื่องแล้ว</option><option>กำลังดำเนินการ</option><option>แก้ไขแล้ว</option><option>ปิดงาน</option></select></label></div>';
                            list.append(el);
                            el.querySelector(".assign-btn").addEventListener(
                                "click",
                                () =>
                                    queueIssue(id, {
                                        assignee: el
                                            .querySelector(".assignee-input")
                                            .value.trim(),
                                    }),
                            );
                            el.querySelector(".status-select").addEventListener(
                                "change",
                                (ev) =>
                                    queueIssue(id, {
                                        issue_status: ev.target.value,
                                    }),
                            );
                        }
                        el.querySelector("strong").textContent =
                            `${shown.issue_type} · ${shown.room}`;
                        el.querySelector("small").textContent =
                            `${shown.building} · ${shown.issue_detail} · ${dateText(shown.created_at)} · ${shown.urgency} · ผู้แจ้ง ${shown.teacher}`;
                        let inp = el.querySelector(".assignee-input");
                        if (document.activeElement !== inp)
                            inp.value = shown.assignee || "";
                        el.querySelector(".status-select").value =
                            shown.issue_status || "รอตรวจสอบ";
                    });
                }
                function renderDashboard() {
                    let rooms = rows("room"),
                        ins = rows("inspection"),
                        issues = rows("issue"),
                        buildings = [
                            ...new Set([
                                ...rows("building").map((r) => r.building),
                                ...rooms.map((r) => r.building),
                            ]),
                        ],
                        checked = new Set(
                            ins
                                .filter((r) => r.inspection_date === today())
                                .map(
                                    (r) => `${r.building}|${r.floor}|${r.room}`,
                                ),
                        ),
                        open = sorted(
                            issues.filter(
                                (r) =>
                                    !["แก้ไขแล้ว", "ปิดงาน"].includes(
                                        (pending.get(r.__backendId) || {})
                                            .issue_status || r.issue_status,
                                    ),
                            ),
                        );
                    $("stat-buildings").textContent = buildings.length;
                    $("stat-rooms").textContent = rooms.length;
                    $("stat-checked").textContent = checked.size;
                    $("unchecked-text").textContent =
                        `ยังไม่ตรวจ ${Math.max(0, rooms.length - checked.size)} ห้อง`;
                    $("stat-average").textContent =
                        avg(ins) === null ? "—" : avg(ins) + "%";
                    $("issue-counter").textContent = open.length + " รายการ";
                    $("recent-issues").innerHTML = open.length
                        ? open
                              .slice(0, 4)
                              .map(
                                  (r) =>
                                      `<div class="list-row"><div><strong>${esc(r.issue_type)}</strong><small>${esc(location(r))}</small></div><span class="badge warn">${esc(r.issue_status)}</span></div>`,
                              )
                              .join("")
                        : '<div class="empty">ไม่มีปัญหาค้างอยู่</div>';
                    $("recent-inspections").innerHTML = ins.length
                        ? sorted(ins)
                              .slice(0, 5)
                              .map(
                                  (r) =>
                                      `<div class="list-row"><div><strong>${esc(location(r))}</strong><small>${esc(r.teacher)} · ${dateText(r.created_at)}</small></div><span class="badge ${r.score_percent < 60 ? "bad" : r.score_percent < 80 ? "warn" : ""}">${Math.round(r.score_percent)}%</span></div>`,
                              )
                              .join("")
                        : '<div class="empty">ยังไม่มีผลตรวจ เริ่มต้นด้วยการเพิ่มอาคารและห้องเรียน</div>';
                    if (chart) chart.destroy();
                    if (window.Chart)
                        chart = new Chart($("building-chart"), {
                            type: "bar",
                            data: {
                                labels: buildings.length
                                    ? buildings
                                    : ["ยังไม่มีข้อมูล"],
                                datasets: [
                                    {
                                        data: buildings.length
                                            ? buildings.map(
                                                  (b) =>
                                                      avg(
                                                          ins.filter(
                                                              (r) =>
                                                                  r.building ===
                                                                  b,
                                                          ),
                                                      ) || 0,
                                              )
                                            : [0],
                                        backgroundColor: "#3685e3",
                                        borderRadius: 7,
                                        barThickness: 30,
                                    },
                                ],
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: false } },
                                scales: {
                                    y: {
                                        min: 0,
                                        max: 100,
                                        ticks: { callback: (v) => v + "%" },
                                    },
                                    x: { grid: { display: false } },
                                },
                            },
                        });
                }
                function renderHistory() {
                    let query = $("history-search").value.trim().toLowerCase(),
                        day = $("history-date").value,
                        arr = sorted(
                            rows("inspection").filter(
                                (r) =>
                                    (!day || r.inspection_date === day) &&
                                    (!query ||
                                        [r.building, r.room, r.teacher].some(
                                            (v) =>
                                                String(v)
                                                    .toLowerCase()
                                                    .includes(query),
                                        )),
                            ),
                        );
                    $("history-body").innerHTML = arr.length
                        ? arr
                              .map(
                                  (r) =>
                                      `<tr><td>${dateText(r.created_at)}</td><td>${esc(location(r))}</td><td>${esc(r.teacher)}</td><td>${esc(r.period)}</td><td><span class="badge ${r.score_percent < 60 ? "bad" : r.score_percent < 80 ? "warn" : ""}">${Math.round(r.score_percent)}%</span></td><td><button type="button" class="detail-btn" data-id="${esc(r.__backendId)}">ดูคะแนน</button></td></tr>`,
                              )
                              .join("")
                        : '<tr><td colspan="6" class="empty">ไม่พบผลตรวจ</td></tr>';
                }
                $("history-body").addEventListener("click", (e) => {
                    let btn = e.target.closest(".detail-btn");
                    if (!btn) return;
                    let r = backendRecords.find(
                        (x) => x.__backendId === btn.dataset.id,
                    );
                    if (!r) return;
                    let v = [];
                    try {
                        v = JSON.parse(r.scores || "[]");
                    } catch {}
                    $("history-detail").textContent = items
                        .map(
                            (name, i) =>
                                `${name}: ${v[i] === "na" ? "ไม่เกี่ยวข้อง" : labels[v[i]] || "—"}`,
                        )
                        .join(" · ");
                    $("history-detail").classList.remove("hidden");
                });
                ["history-search", "history-date"].forEach((id) =>
                    $(id).addEventListener("input", renderHistory),
                );
                function renderReport() {
                    let month = $("report-month").value || today().slice(0, 7),
                        ins = rows("inspection").filter((r) =>
                            r.inspection_date.startsWith(month),
                        ),
                        issues = rows("issue").filter((r) =>
                            (r.created_at || "").startsWith(month),
                        ),
                        d = new Date(
                            Number(month.slice(0, 4)),
                            Number(month.slice(5, 7)) - 2,
                            1,
                        ),
                        priorMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
                        previous = rows("inspection").filter((r) =>
                            r.inspection_date.startsWith(priorMonth),
                        ),
                        map = new Map();
                    ins.forEach((r) => {
                        let key = JSON.stringify([r.building, r.floor, r.room]);
                        if (!map.has(key)) map.set(key, []);
                        map.get(key).push(r);
                    });
                    let ranking = [...map]
                            .map(([key, list]) => ({
                                parts: JSON.parse(key),
                                list,
                                score: avg(list),
                            }))
                            .sort((a, b) => b.score - a.score),
                        fixed = issues.filter((r) =>
                            ["แก้ไขแล้ว", "ปิดงาน"].includes(
                                (pending.get(r.__backendId) || {})
                                    .issue_status || r.issue_status,
                            ),
                        ).length;
                    $("report-title").textContent =
                        `รายงานประจำเดือน ${month} · ${$("school-name").value.trim() || "โรงเรียน"}`;
                    $("report-meta").textContent =
                        `วันที่จัดทำ ${new Date().toLocaleDateString("th-TH", { dateStyle: "long" })}`;
                    $("report-summary").textContent =
                        `ตรวจ ${ins.length} ครั้ง · ${ranking.length} ห้อง · คะแนนเฉลี่ย ${avg(ins) === null ? "—" : avg(ins) + "%"} · พบปัญหา ${issues.length} รายการ · แก้ไขแล้ว ${fixed} · ค้างอยู่ ${issues.length - fixed}`;
                    $("report-body").innerHTML = ranking.length
                        ? ranking
                              .map((x, i) => {
                                  let prior = previous.filter(
                                          (r) =>
                                              r.building === x.parts[0] &&
                                              r.floor === x.parts[1] &&
                                              r.room === x.parts[2],
                                      ),
                                      diff = prior.length
                                          ? x.score - avg(prior)
                                          : null;
                                  return `<tr><td>${i + 1}</td><td>${esc(x.parts[0])} ชั้น ${esc(x.parts[1])} ห้อง ${esc(x.parts[2])}</td><td>${x.list.length}</td><td>${x.score}%</td><td>${quality(x.score)}</td><td>${diff === null ? "—" : diff > 0 ? "ดีขึ้น " + diff + " จุด" : diff < 0 ? "ลดลง " + Math.abs(diff) + " จุด" : "คงที่"}</td></tr>`;
                              })
                              .join("")
                        : '<tr><td colspan="6" class="empty">ไม่มีผลตรวจในเดือนนี้</td></tr>';
                    let counts = {};
                    issues.forEach(
                        (r) =>
                            (counts[r.issue_type] =
                                (counts[r.issue_type] || 0) + 1),
                    );
                    let common = Object.entries(counts).sort(
                        (a, b) => b[1] - a[1],
                    )[0];
                    $("report-issues").innerHTML =
                        `<strong>ปัญหาที่พบบ่อยที่สุด:</strong> ${common ? esc(common[0]) + " (" + common[1] + " ครั้ง)" : "ไม่มีข้อมูล"}<br><span class="small-muted">รายงานนี้ไม่มีรูปหลักฐาน เนื่องจากระบบไม่สามารถจัดเก็บภาพที่อัปโหลดได้</span>`;
                }
                ["school-name", "report-month"].forEach((id) =>
                    $(id).addEventListener("input", renderReport),
                );
                $("print-report").addEventListener("click", () => {
                    renderReport();
                    window.print();
                });
                function renderAll() {
                    updateLocations();
                    renderDashboard();
                    renderIssues();
                    renderHistory();
                    renderReport();
                }
                const handler = {
                    onDataChanged(data) {
                        clearTimeout(loadTimer);
                        backendRecords = data;
                        firstRead = true;
                        ready = true;
                        $("load-state").classList.add("hidden");
                        $("retry-load").classList.add("hidden");
                        renderAll();
                    },
                };
                async function initialize() {
                    clearTimeout(loadTimer);
                    firstRead = false;
                    ready = false;
                    $("load-state").classList.remove("hidden");
                    $("load-state").textContent =
                        "กำลังโหลดข้อมูลจาก local…";
                    $("retry-load").classList.add("hidden");
                    loadTimer = setTimeout(() => {
                        if (!firstRead) {
                            $("load-state").textContent =
                                "โหลดข้อมูลไม่สำเร็จ กรุณาลองเชื่อมต่ออีกครั้ง";
                            $("retry-load").classList.remove("hidden");
                        }
                    }, 8000);
                    try {
                        let result = await window.dataSdk.init(handler);
                        if (!result.isOk) throw Error("init");
                    } catch {
                        clearTimeout(loadTimer);
                        $("load-state").textContent =
                            "ไม่สามารถเชื่อมต่อ local ได้";
                        $("retry-load").classList.remove("hidden");
                        notice(
                            "ไม่สามารถเชื่อมต่อ local ได้ กรุณาลองใหม่",
                            true,
                        );
                    }
                }
                $("retry-load").addEventListener("click", initialize);
                
                initialize();
            })();
        