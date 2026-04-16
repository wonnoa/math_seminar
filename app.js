import { subscribeAuthState } from "./supabase-auth.js?v=20260416-001";
import { fetchSectionProgressMap, saveSectionProgress } from "./supabase-data.js?v=20260416-001";

const stages = [
  {
    id: "chapter-1",
    label: "1",
    title: "행렬과 가우스 소거",
    page: "1",
    side: "left",
    sections: [
      ["1.1", "소개", "1"],
      ["1.2", "선형방정식의 기하학", "4"],
      ["1.3", "가우스 소거 예제", "13"],
      ["1.4", "행렬 표기법과 행렬 곱", "21"],
      ["1.5", "삼각 인수분해와 행 교환", "36"],
      ["1.6", "역행렬과 전치행렬", "50"],
      ["1.7", "특수 행렬과 응용", "66"],
    ],
    type: "chapter",
    status: "complete",
    vibe: "기초 구간 완료",
  },
  {
    id: "chapter-2",
    label: "2",
    title: "벡터공간",
    page: "77",
    side: "right",
    sections: [
      ["2.1", "벡터공간과 부분공간", "77"],
      ["2.2", "Ax = 0과 Ax = b 풀기", "86"],
      ["2.3", "선형독립, 기저, 차원", "103"],
      ["2.4", "네 가지 기본 부분공간", "115"],
      ["2.5", "그래프와 네트워크", "129"],
      ["2.6", "선형변환", "140"],
    ],
    type: "chapter",
    status: "current",
    vibe: "현재 구간: 구조와 기저",
  },
  {
    id: "chapter-3",
    label: "3",
    title: "직교성",
    page: "159",
    side: "left",
    sections: [
      ["3.1", "직교 벡터와 부분공간", "159"],
      ["3.2", "코사인과 직선 위로의 사영", "171"],
      ["3.3", "사영과 최소제곱", "180"],
      ["3.4", "직교기저와 그람-슈미트", "195"],
      ["3.5", "빠른 푸리에 변환", "211"],
    ],
    type: "chapter",
    status: "queued",
    vibe: "다음 구간: 기하와 사영",
  },
  {
    id: "chapter-4",
    label: "4",
    title: "행렬식",
    page: "225",
    side: "right",
    sections: [
      ["4.1", "소개", "225"],
      ["4.2", "행렬식의 성질", "227"],
      ["4.3", "행렬식 공식", "236"],
      ["4.4", "행렬식의 응용", "247"],
    ],
    type: "chapter",
    status: "locked",
    vibe: "앞선 구간을 마치면 열림",
  },
  {
    id: "chapter-5",
    label: "5",
    title: "고유값과 고유벡터",
    page: "260",
    side: "left",
    sections: [
      ["5.1", "소개", "260"],
      ["5.2", "행렬의 대각화", "273"],
      ["5.3", "차분방정식과 A^k", "283"],
      ["5.4", "미분방정식과 e^At", "296"],
      ["5.5", "복소 행렬", "312"],
      ["5.6", "닮음변환", "325"],
    ],
    type: "chapter",
    status: "locked",
    vibe: "큰 핵심 구간",
  },
  {
    id: "chapter-6",
    label: "6",
    title: "양의 정부호 행렬",
    page: "345",
    side: "right",
    sections: [
      ["6.1", "극소, 극대, 안장점", "345"],
      ["6.2", "양의 정부호 판정", "352"],
      ["6.3", "특잇값 분해", "367"],
      ["6.4", "최소 원리", "376"],
      ["6.5", "유한요소법", "384"],
    ],
    type: "chapter",
    status: "locked",
    vibe: "최적화 구간은 아직 잠김",
  },
  {
    id: "chapter-7",
    label: "7",
    title: "행렬 계산",
    page: "390",
    side: "left",
    sections: [
      ["7.1", "소개", "390"],
      ["7.2", "행렬 노름과 조건수", "391"],
      ["7.3", "고유값 계산", "399"],
      ["7.4", "Ax = b의 반복법", "407"],
    ],
    type: "chapter",
    status: "locked",
    vibe: "계산 구간은 뒤에서 열림",
  },
  {
    id: "chapter-8",
    label: "8",
    title: "선형계획법과 게임이론",
    page: "417",
    side: "right",
    sections: [
      ["8.1", "선형부등식", "417"],
      ["8.2", "심플렉스 방법", "422"],
      ["8.3", "쌍대 문제", "434"],
      ["8.4", "네트워크 모형", "444"],
      ["8.5", "게임이론", "451"],
    ],
    type: "chapter",
    status: "locked",
    vibe: "후반 전략 구간",
  },
];

const STATUS_ORDER = ["not_started", "in_progress", "done"];
let sectionState = {};
let isAdmin = false;
const collapsedStages = {};
const previousStageStatuses = {};

const journeyGrid = document.querySelector("#journeyGrid");
const stageRuler = document.querySelector("#stageRuler");
const gridSummary = document.querySelector("#gridSummary");
const overallPercent = document.querySelector("#overallPercent");
const overallPercentCaption = document.querySelector("#overallPercentCaption");
const overallSummary = document.querySelector("#overallSummary");
const overallDone = document.querySelector("#overallDone");
const overallDoing = document.querySelector("#overallDoing");
const overallStageSummary = document.querySelector("#overallStageSummary");
const miniJourney = document.querySelector("#miniJourney");
const heroMascotImage = document.querySelector("#heroMascotImage");
const heroMascotCard = document.querySelector(".hero-mascot-card");
const heroMascotPlaceholder = document.querySelector(".hero-mascot-placeholder");

setupHeroMascot();
renderJourney();
initializeJourney();

function calculateRows(stageEntries) {
  let cursor = 2;
  const result = [];

  for (const entry of stageEntries) {
    const { stage, summary, collapsed } = entry;
    const headerUnits = 3;
    const footerUnits = 1;
    const perSectionUnits = 2;
    const sectionUnits = collapsed ? 1 : Math.max(2, stage.sections.length * perSectionUnits);
    const totalUnits = headerUnits + sectionUnits + footerUnits;
    const startRow = cursor;
    const endRow = startRow + totalUnits;
    const nodeRow = startRow + 1;
    const connectorOffset = (nodeRow - startRow + 0.65) * 56;

    result.push({
      ...stage,
      summary,
      collapsed,
      headerUnits,
      footerUnits,
      perSectionUnits,
      sectionUnits,
      totalUnits,
      startRow,
      endRow,
      nodeRow,
      connectorOffset,
    });

    cursor = endRow + 2;
  }

  return {
    stages: result,
    totalRows: cursor + 2,
  };
}

function renderJourney() {
  journeyGrid.replaceChildren();

  const stageEntries = stages.map((stage) => ({
    stage,
    summary: summarizeStage(stage),
  }));
  syncCollapsedState(stageEntries);

  const layout = calculateRows(
    stageEntries.map((entry) => ({
      ...entry,
      collapsed: isStageCollapsed(entry.stage.id),
    })),
  );
  journeyGrid.style.gridTemplateRows = `repeat(${layout.totalRows}, var(--row-unit))`;

  const totalTracked = layout.stages.reduce((sum, entry) => sum + entry.summary.total, 0);
  const totalDone = layout.stages.reduce((sum, entry) => sum + entry.summary.doneCount, 0);
  const totalDoing = layout.stages.reduce((sum, entry) => sum + entry.summary.inProgressCount, 0);
  gridSummary.textContent = `${stages.length}개 단계 · ${totalDone}/${totalTracked}개 섹션 완료`;
  renderOverview(layout.stages, {
    totalTracked,
    totalDone,
    totalDoing,
  });
  renderStageRuler(layout.stages);

  for (const entry of layout.stages) {
    journeyGrid.append(createCard(entry, entry.summary));
    journeyGrid.append(createNode(entry, entry.summary));
  }
}

function syncCollapsedState(stageEntries) {
  for (const entry of stageEntries) {
    const stageId = entry.stage.id;
    const currentStatus = entry.summary.status;
    const previousStatus = previousStageStatuses[stageId];

    if (!(stageId in collapsedStages)) {
      collapsedStages[stageId] = currentStatus === "done";
    } else if (currentStatus === "done" && previousStatus !== "done") {
      collapsedStages[stageId] = true;
    } else if (currentStatus !== "done" && previousStatus === "done") {
      collapsedStages[stageId] = false;
    }

    previousStageStatuses[stageId] = currentStatus;
  }
}

function isStageCollapsed(stageId) {
  return Boolean(collapsedStages[stageId]);
}

function toggleStageCollapsed(stageId) {
  collapsedStages[stageId] = !collapsedStages[stageId];
  renderJourney();
}

function createCard(stage, summary) {
  const article = document.createElement("article");
  article.className = `stage-card ${stage.side} ${summary.status}`;
  if (stage.collapsed) {
    article.classList.add("is-collapsed");
  }
  article.style.gridColumn = stage.side === "left" ? "1 / 6" : "8 / 13";
  article.style.gridRow = `${stage.startRow} / ${stage.endRow}`;
  article.style.setProperty("--connector-offset", `${stage.connectorOffset}px`);

  const head = document.createElement("div");
  head.className = "stage-head";

  const meta = document.createElement("div");
  meta.className = "stage-meta";
  meta.textContent = `${stageTypeLabel(stage.type)} · ${stage.page}쪽 시작`;

  const status = document.createElement("span");
  status.className = "status-pill";
  status.textContent = statusLabel(summary.status);

  const headActions = document.createElement("div");
  headActions.className = "stage-head-actions";
  headActions.append(status);

  head.append(meta, headActions);

  const title = document.createElement("h2");
  title.className = "stage-title";
  title.textContent = `${stage.label} · ${stage.title}`;

  const legend = document.createElement("p");
  legend.className = "stage-legend";
  legend.textContent = stage.collapsed
    ? `${summary.total}개 섹션을 모두 완료했습니다!`
    : legendLabel(summary);

  let list = null;
  if (!stage.collapsed) {
    list = document.createElement("ol");
    list.className = "section-list";

    for (const section of stage.sections) {
      list.append(createSectionItem(stage, section));
    }
  }

  const footer = document.createElement("div");
  footer.className = "stage-footer";

  const count = document.createElement("span");
  count.className = "metric-pill topic-count";
  count.textContent =
    summary.status === "done" ? `${summary.doneCount}/${summary.total}` : `${summary.doneCount}/${summary.total} 완료`;

  footer.append(count);

  if (!stage.collapsed) {
    const height = document.createElement("span");
    height.className = "metric-pill";
    height.textContent = `${stage.sections.length}개 항목`;

    const calc = document.createElement("div");
    calc.className = "calc-note";
    calc.textContent = isAdmin ? "섹션 행을 눌러 상태를 바꿉니다" : "읽기 전용으로 표시 중입니다";

    footer.append(height, calc);
  }

  article.append(head, title, legend);
  if (list) {
    article.append(list);
  }
  article.append(footer);

  if (summary.status === "done") {
    const accordionToggle = document.createElement("button");
    accordionToggle.className = "stage-accordion-toggle";
    accordionToggle.type = "button";
    accordionToggle.textContent = stage.collapsed ? "펼쳐서 보기" : "접기";
    accordionToggle.setAttribute(
      "aria-label",
      `${stage.title} ${stage.collapsed ? "펼치기" : "접기"}`,
    );
    accordionToggle.addEventListener("click", () => {
      toggleStageCollapsed(stage.id);
    });
    article.append(accordionToggle);
  }

  return article;
}

function createSectionItem(stage, section) {
  const item = document.createElement("li");
  const code = Array.isArray(section) ? section[0] : "P";
  const title = Array.isArray(section) ? section[1] : section;
  const page = Array.isArray(section) ? section[2] : "iv";
  const reviewOptional = code === "Review";

  item.className = `section-item${code === "Review" ? " review optional" : ""}`;

  if (!reviewOptional) {
    const key = getSectionKey(stage.id, code);
    const status = getSectionStatus(key);
    item.classList.add("trackable", status);
    if (isAdmin) {
      item.tabIndex = 0;
      item.setAttribute("role", "button");
      item.setAttribute("aria-label", `${code} ${title} ${nextStatusLabel(status)} 상태로 변경`);
      item.addEventListener("click", () => {
        cycleSectionState(key);
      });
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          cycleSectionState(key);
        }
      });
    } else {
      item.classList.add("readonly");
      item.setAttribute("aria-label", `${code} ${title} ${stateLabel(status) || "미진행"}`);
    }
  }

  const codeEl = document.createElement("span");
  codeEl.className = "section-code";
  codeEl.textContent = code;

  const titleEl = document.createElement("span");
  titleEl.className = "section-title";
  titleEl.textContent = title;

  const pageEl = document.createElement("span");
  pageEl.className = "section-page";
  pageEl.textContent = `${page}쪽`;

  const statusEl = document.createElement("span");
  statusEl.className = `section-state${reviewOptional ? " optional" : ` ${getSectionStatus(getSectionKey(stage.id, code))}`}`;
  statusEl.textContent = reviewOptional ? "선택" : stateLabel(getSectionStatus(getSectionKey(stage.id, code)));

  item.append(codeEl, titleEl, pageEl, statusEl);
  return item;
}

function createNode(stage, summary) {
  const node = document.createElement("div");
  node.className = `stage-node ${summary.status}`;
  node.style.gridColumn = "6 / 8";
  node.style.gridRow = `${stage.nodeRow} / span 1`;
  node.setAttribute("aria-label", `${stage.title} 노드`);

  const tag = document.createElement("span");
  tag.className = "node-tag";
  tag.textContent = nodeTag(summary.status);

  const core = document.createElement("span");
  core.className = `node-core${stage.label.length > 2 ? " wide" : ""}`;
  core.textContent = stage.label;

  node.append(tag, core);
  return node;
}

function renderStageRuler(stageEntries) {
  if (!stageRuler) {
    return;
  }

  stageRuler.replaceChildren();

  stageEntries.forEach((entry) => {
    const button = document.createElement("button");
    button.className = `ruler-node ${entry.summary.status}`;
    if (entry.collapsed) {
      button.classList.add("collapsed");
    }
    button.type = "button";
    button.textContent = entry.label;
    button.setAttribute(
      "aria-label",
      `${entry.title} ${statusLabel(entry.summary.status)}${entry.collapsed ? ", 접힘 상태" : ""}`,
    );

    if (entry.summary.status === "done") {
      button.addEventListener("click", () => {
        toggleStageCollapsed(entry.id);
      });
    } else {
      button.disabled = true;
    }

    stageRuler.append(button);
  });
}

function statusLabel(status) {
  switch (status) {
    case "done":
      return "완료";
    case "in_progress":
      return "진행 중";
    default:
      return "미진행";
  }
}

function nodeTag(status) {
  switch (status) {
    case "done":
      return "완료";
    case "in_progress":
      return "진행";
    default:
      return "준비";
  }
}

function legendLabel(summary) {
  if (summary.total === 0) {
    return "이 단계에서 추적 중인 섹션이 없습니다.";
  }

  if (summary.doneCount === summary.total) {
    return `추적 중인 ${summary.total}개 섹션을 모두 마쳤습니다.`;
  }

  if (summary.inProgressCount > 0) {
    return `${summary.total}개 중 ${summary.doneCount}개 완료, ${summary.inProgressCount}개 진행 중입니다.`;
  }

  if (summary.doneCount > 0) {
    return `${summary.total}개 중 ${summary.doneCount}개 완료, 나머지는 아직 시작 전입니다.`;
  }

  return `추적 중인 ${summary.total}개 섹션이 아직 시작 전입니다.`;
}

function summarizeStage(stage) {
  const trackable = stage.sections.filter((section) => getSectionCode(section) !== "Review");
  const statuses = trackable.map((section) => getSectionStatus(getSectionKey(stage.id, getSectionCode(section))));
  const doneCount = statuses.filter((status) => status === "done").length;
  const inProgressCount = statuses.filter((status) => status === "in_progress").length;
  const total = statuses.length;

  if (total > 0 && doneCount === total) {
    return { status: "done", total, doneCount, inProgressCount };
  }

  if (doneCount > 0 || inProgressCount > 0) {
    return { status: "in_progress", total, doneCount, inProgressCount };
  }

  return { status: "not_started", total, doneCount, inProgressCount };
}

function getSectionCode(section) {
  return Array.isArray(section) ? section[0] : "P";
}

function getSectionKey(stageId, code) {
  return `${stageId}:${code}`;
}

function getSectionStatus(key) {
  return sectionState[key] || "not_started";
}

async function cycleSectionState(key) {
  if (!isAdmin) {
    return;
  }

  const current = getSectionStatus(key);
  const currentIndex = STATUS_ORDER.indexOf(current);
  const next = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
  const previousState = {
    ...sectionState,
  };

  sectionState = {
    ...sectionState,
    [key]: next,
  };
  renderJourney();

  try {
    await saveSectionProgress(key, next);
  } catch (error) {
    sectionState = previousState;
    renderJourney();
    window.alert(error?.message ?? "진행 상태를 저장하지 못했습니다.");
  }
}

function stateLabel(status) {
  switch (status) {
    case "done":
      return "완료";
    case "in_progress":
      return "진행 중";
    default:
      return "";
  }
}

function nextStatusLabel(status) {
  switch (status) {
    case "not_started":
      return "진행 중";
    case "in_progress":
      return "완료";
    default:
      return "미진행";
  }
}

function setupHeroMascot() {
  if (!heroMascotImage || !heroMascotPlaceholder || !heroMascotCard) {
    return;
  }

  const showMascot = () => {
    heroMascotImage.classList.remove("is-hidden");
    heroMascotPlaceholder.classList.add("is-hidden");
    heroMascotCard.classList.add("has-image");
  };

  const showPlaceholder = () => {
    heroMascotImage.classList.add("is-hidden");
    heroMascotPlaceholder.classList.remove("is-hidden");
    heroMascotCard.classList.remove("has-image");
  };

  heroMascotImage.addEventListener("load", () => {
    showMascot();
  });

  heroMascotImage.addEventListener("error", () => {
    showPlaceholder();
  });

  if (heroMascotImage.complete) {
    if (heroMascotImage.naturalWidth > 0) {
      showMascot();
    } else {
      showPlaceholder();
    }
  }
}

function renderOverview(stageEntries, totals) {
  const completionRatio = totals.totalTracked === 0 ? 0 : totals.totalDone / totals.totalTracked;
  const travelRatio =
    totals.totalTracked === 0
      ? 0
      : (totals.totalDone + totals.totalDoing * 0.45) / totals.totalTracked;
  const percent = Math.round(completionRatio * 100);
  const doneStages = stageEntries.filter((entry) => entry.summary.status === "done").length;
  const activeStages = stageEntries.filter((entry) => entry.summary.status === "in_progress").length;

  overallPercent.textContent = `${percent}%`;
  overallPercentCaption.textContent = "완료";
  overallSummary.textContent = `전체 ${totals.totalTracked}개 섹션 중 ${totals.totalDone}개 완료`;
  overallDone.textContent = `${totals.totalDone} 완료`;
  overallDoing.textContent = `${totals.totalDoing} 진행 중`;
  overallStageSummary.textContent = `${doneStages}/${stageEntries.length}개 단계 완료 · ${activeStages}개 진행 중`;

  renderMiniJourney(stageEntries, travelRatio);
}

function renderMiniJourney(stageEntries, progressRatio) {
  miniJourney.replaceChildren();

  const svgWidth = 860;
  const svgHeight = 190;
  const points = buildSnakePoints(stageEntries.length, svgWidth, svgHeight);
  const pathD = createPathD(points);

  const defs = createSvgElement("defs", {});
  const gradient = createSvgElement("linearGradient", {
    id: "miniJourneyGradient",
    x1: "0%",
    y1: "0%",
    x2: "100%",
    y2: "0%",
  });

  gradient.append(
    createSvgElement("stop", { offset: "0%", "stop-color": "#f3ca4d" }),
    createSvgElement("stop", { offset: "55%", "stop-color": "#b4e27a" }),
    createSvgElement("stop", { offset: "100%", "stop-color": "#8ede56" }),
  );
  defs.append(gradient);
  miniJourney.append(defs);

  const basePath = createSvgElement("path", {
    d: pathD,
    class: "mini-track",
  });

  const progressPath = createSvgElement("path", {
    d: pathD,
    class: "mini-progress",
  });

  miniJourney.append(basePath, progressPath);

  const totalLength = progressPath.getTotalLength();
  const drawnLength = Math.max(0, Math.min(totalLength, totalLength * progressRatio));
  progressPath.style.strokeDasharray = `${drawnLength} ${totalLength}`;

  stageEntries.forEach((entry, index) => {
    const point = points[index];
    const group = createSvgElement("g", {
      class: `mini-node ${entry.summary.status}`,
      transform: `translate(${point.x} ${point.y})`,
    });

    const outer = createSvgElement("circle", {
      r: "16",
      class: "mini-node-outer",
    });

    const inner = createSvgElement("circle", {
      r: "11",
      class: "mini-node-inner",
    });

    const text = createSvgElement("text", {
      class: `mini-node-label${entry.label.length > 2 ? " wide" : ""}`,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      y: "1",
    });
    text.textContent = entry.label;

    const title = createSvgElement("title", {});
    title.textContent = `${entry.title} · ${statusLabel(entry.summary.status)}`;

    group.append(outer, inner, text, title);
    miniJourney.append(group);
  });
}

function stageTypeLabel(type) {
  return "챕터";
}

function buildSnakePoints(count, width, height) {
  const maxPerRow = 4;
  const rowsNeeded = Math.ceil(count / maxPerRow);
  const topPadding = 36;
  const bottomPadding = 34;
  const leftPadding = 46;
  const rightPadding = 46;
  const rowGap = rowsNeeded === 1 ? 0 : (height - topPadding - bottomPadding) / (rowsNeeded - 1);
  const points = [];
  let consumed = 0;

  for (let rowIndex = 0; rowIndex < rowsNeeded; rowIndex += 1) {
    const remaining = count - consumed;
    const rowCount = Math.min(maxPerRow, remaining);
    const y = topPadding + rowGap * rowIndex;
    const fullRowX = distributeX(maxPerRow, leftPadding, width - rightPadding);
    const visibleX =
      rowCount === maxPerRow
        ? fullRowX
        : rowIndex % 2 === 0
          ? fullRowX.slice(0, rowCount)
          : fullRowX.slice(maxPerRow - rowCount);
    const orderedX = rowIndex % 2 === 0 ? visibleX : [...visibleX].reverse();

    for (const x of orderedX) {
      points.push({ x, y });
    }

    consumed += rowCount;
  }

  return points;
}

function distributeX(count, start, end) {
  if (count === 1) {
    return [(start + end) / 2];
  }

  const gap = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, index) => start + gap * index);
}

function createPathD(points) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function createSvgElement(name, attributes) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  return element;
}

async function initializeJourney() {
  subscribeAuthState((authState) => {
    isAdmin = authState.isAdmin;
    renderJourney();
  });

  try {
    sectionState = await fetchSectionProgressMap();
    renderJourney();
  } catch (error) {
    console.error(error);
  }
}
