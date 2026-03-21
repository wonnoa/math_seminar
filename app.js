const stages = [
  {
    id: "preface",
    label: "P",
    title: "Preface",
    page: "iv",
    side: "left",
    sections: ["Opening material and book overview"],
    type: "front",
    status: "complete",
    vibe: "Entry gate and orientation",
  },
  {
    id: "chapter-1",
    label: "1",
    title: "Matrices and Gaussian Elimination",
    page: "1",
    side: "left",
    sections: [
      ["1.1", "Introduction", "1"],
      ["1.2", "The Geometry of Linear Equations", "4"],
      ["1.3", "An Example of Gaussian Elimination", "13"],
      ["1.4", "Matrix Notation and Matrix Multiplication", "21"],
      ["1.5", "Triangular Factors and Row Exchanges", "36"],
      ["1.6", "Inverses and Transposes", "50"],
      ["1.7", "Special Matrices and Applications", "66"],
    ],
    type: "chapter",
    status: "complete",
    vibe: "Foundation arc cleared",
  },
  {
    id: "chapter-2",
    label: "2",
    title: "Vector Spaces",
    page: "77",
    side: "right",
    sections: [
      ["2.1", "Vector Spaces and Subspaces", "77"],
      ["2.2", "Solving Ax = 0 and Ax = b", "86"],
      ["2.3", "Linear Independence, Basis, and Dimension", "103"],
      ["2.4", "The Four Fundamental Subspaces", "115"],
      ["2.5", "Graphs and Networks", "129"],
      ["2.6", "Linear Transformations", "140"],
    ],
    type: "chapter",
    status: "current",
    vibe: "Current world: structure and basis",
  },
  {
    id: "chapter-3",
    label: "3",
    title: "Orthogonality",
    page: "159",
    side: "left",
    sections: [
      ["3.1", "Orthogonal Vectors and Subspaces", "159"],
      ["3.2", "Cosines and Projections onto Lines", "171"],
      ["3.3", "Projections and Least Squares", "180"],
      ["3.4", "Orthogonal Bases and Gram-Schmidt", "195"],
      ["3.5", "The Fast Fourier Transform", "211"],
    ],
    type: "chapter",
    status: "queued",
    vibe: "Next unlock: geometry and projection",
  },
  {
    id: "chapter-4",
    label: "4",
    title: "Determinants",
    page: "225",
    side: "right",
    sections: [
      ["4.1", "Introduction", "225"],
      ["4.2", "Properties of the Determinant", "227"],
      ["4.3", "Formulas for the Determinant", "236"],
      ["4.4", "Applications of Determinants", "247"],
    ],
    type: "chapter",
    status: "locked",
    vibe: "Locked until earlier worlds are done",
  },
  {
    id: "chapter-5",
    label: "5",
    title: "Eigenvalues and Eigenvectors",
    page: "260",
    side: "left",
    sections: [
      ["5.1", "Introduction", "260"],
      ["5.2", "Diagonalization of a Matrix", "273"],
      ["5.3", "Difference Equations and Powers A^k", "283"],
      ["5.4", "Differential Equations and e^At", "296"],
      ["5.5", "Complex Matrices", "312"],
      ["5.6", "Similarity Transformations", "325"],
    ],
    type: "chapter",
    status: "locked",
    vibe: "Major boss area ahead",
  },
  {
    id: "chapter-6",
    label: "6",
    title: "Positive Definite Matrices",
    page: "345",
    side: "right",
    sections: [
      ["6.1", "Minima, Maxima, and Saddle Points", "345"],
      ["6.2", "Tests for Positive Definiteness", "352"],
      ["6.3", "Singular Value Decomposition", "367"],
      ["6.4", "Minimum Principles", "376"],
      ["6.5", "The Finite Element Method", "384"],
    ],
    type: "chapter",
    status: "locked",
    vibe: "Optimization route remains locked",
  },
  {
    id: "chapter-7",
    label: "7",
    title: "Computations with Matrices",
    page: "390",
    side: "left",
    sections: [
      ["7.1", "Introduction", "390"],
      ["7.2", "Matrix Norm and Condition Number", "391"],
      ["7.3", "Computation of Eigenvalues", "399"],
      ["7.4", "Iterative Methods for Ax = b", "407"],
    ],
    type: "chapter",
    status: "locked",
    vibe: "Computation path opens later",
  },
  {
    id: "chapter-8",
    label: "8",
    title: "Linear Programming and Game Theory",
    page: "417",
    side: "right",
    sections: [
      ["8.1", "Linear Inequalities", "417"],
      ["8.2", "The Simplex Method", "422"],
      ["8.3", "The Dual Problem", "434"],
      ["8.4", "Network Models", "444"],
      ["8.5", "Game Theory", "451"],
    ],
    type: "chapter",
    status: "locked",
    vibe: "Late-game strategy zone",
  },
];

const STORAGE_KEY = "linear-algebra-journey.section-status.v1";
const STATUS_ORDER = ["not_started", "in_progress", "done"];
let sectionState = loadSectionState();

const journeyGrid = document.querySelector("#journeyGrid");
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

const rows = calculateRows(stages);
journeyGrid.style.gridTemplateRows = `repeat(${rows.totalRows}, var(--row-unit))`;
setupHeroMascot();
renderJourney();

function calculateRows(input) {
  let cursor = 2;
  const result = [];

  for (const stage of input) {
    const headerUnits = stage.type === "front" ? 2 : 3;
    const footerUnits = 1;
    const perSectionUnits = 2;
    const sectionUnits = Math.max(2, stage.sections.length * perSectionUnits);
    const totalUnits = headerUnits + sectionUnits + footerUnits;
    const startRow = cursor;
    const endRow = startRow + totalUnits;
    const nodeRow = startRow + 1;
    const connectorOffset = (nodeRow - startRow + 0.65) * 56;

    result.push({
      ...stage,
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

  const stageEntries = rows.stages.map((stage) => ({
    stage,
    summary: summarizeStage(stage),
  }));
  const totalTracked = stageEntries.reduce((sum, entry) => sum + entry.summary.total, 0);
  const totalDone = stageEntries.reduce((sum, entry) => sum + entry.summary.doneCount, 0);
  const totalDoing = stageEntries.reduce((sum, entry) => sum + entry.summary.inProgressCount, 0);
  gridSummary.textContent = `${stages.length} stages · ${totalDone}/${totalTracked} sections done`;
  renderOverview(stageEntries, {
    totalTracked,
    totalDone,
    totalDoing,
  });

  for (const entry of stageEntries) {
    journeyGrid.append(createCard(entry.stage, entry.summary));
    journeyGrid.append(createNode(entry.stage, entry.summary));
  }
}

function createCard(stage, summary) {
  const article = document.createElement("article");
  article.className = `stage-card ${stage.side} ${summary.status}`;
  article.style.gridColumn = stage.side === "left" ? "1 / 6" : "8 / 13";
  article.style.gridRow = `${stage.startRow} / ${stage.endRow}`;
  article.style.setProperty("--connector-offset", `${stage.connectorOffset}px`);

  const head = document.createElement("div");
  head.className = "stage-head";

  const meta = document.createElement("div");
  meta.className = "stage-meta";
  meta.textContent = `${stage.type} · start p.${stage.page}`;

  const status = document.createElement("span");
  status.className = "status-pill";
  status.textContent = statusLabel(summary.status);

  head.append(meta, status);

  const title = document.createElement("h2");
  title.className = "stage-title";
  title.textContent = `${stage.label} · ${stage.title}`;

  const legend = document.createElement("p");
  legend.className = "stage-legend";
  legend.textContent = legendLabel(summary);

  const list = document.createElement("ol");
  list.className = "section-list";

  for (const section of stage.sections) {
    list.append(createSectionItem(stage, section));
  }

  const footer = document.createElement("div");
  footer.className = "stage-footer";

  const count = document.createElement("span");
  count.className = "metric-pill topic-count";
  count.textContent = `${summary.doneCount}/${summary.total} tracked`;

  const height = document.createElement("span");
  height.className = "metric-pill";
  height.textContent = `${stage.sections.length} items`;

  const calc = document.createElement("div");
  calc.className = "calc-note";
  calc.textContent = "click a section row to cycle state";

  footer.append(count, height, calc);
  article.append(head, title, legend, list, footer);
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
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `${code} ${title} mark as ${nextStatusLabel(status)}`);
    item.addEventListener("click", () => {
      cycleSectionState(key);
    });
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        cycleSectionState(key);
      }
    });
  }

  const codeEl = document.createElement("span");
  codeEl.className = "section-code";
  codeEl.textContent = code;

  const titleEl = document.createElement("span");
  titleEl.className = "section-title";
  titleEl.textContent = title;

  const pageEl = document.createElement("span");
  pageEl.className = "section-page";
  pageEl.textContent = `p.${page}`;

  const statusEl = document.createElement("span");
  statusEl.className = `section-state${reviewOptional ? " optional" : ` ${getSectionStatus(getSectionKey(stage.id, code))}`}`;
  statusEl.textContent = reviewOptional ? "Optional" : stateLabel(getSectionStatus(getSectionKey(stage.id, code)));

  item.append(codeEl, titleEl, pageEl, statusEl);
  return item;
}

function createNode(stage, summary) {
  const node = document.createElement("div");
  node.className = `stage-node ${summary.status}`;
  node.style.gridColumn = "6 / 8";
  node.style.gridRow = `${stage.nodeRow} / span 1`;
  node.setAttribute("aria-label", `${stage.title} node`);

  const tag = document.createElement("span");
  tag.className = "node-tag";
  tag.textContent = nodeTag(summary.status);

  const core = document.createElement("span");
  core.className = `node-core${stage.label.length > 2 ? " wide" : ""}`;
  core.textContent = stage.label;

  node.append(tag, core);
  return node;
}

function statusLabel(status) {
  switch (status) {
    case "done":
      return "Done";
    case "in_progress":
      return "In Progress";
    default:
      return "Not Started";
  }
}

function nodeTag(status) {
  switch (status) {
    case "done":
      return "clear";
    case "in_progress":
      return "doing";
    default:
      return "ready";
  }
}

function legendLabel(summary) {
  if (summary.total === 0) {
    return "No tracked sections in this stage.";
  }

  if (summary.doneCount === summary.total) {
    return `All ${summary.total} tracked sections are complete.`;
  }

  if (summary.inProgressCount > 0) {
    return `${summary.doneCount}/${summary.total} complete, ${summary.inProgressCount} in progress.`;
  }

  if (summary.doneCount > 0) {
    return `${summary.doneCount}/${summary.total} complete, the rest not started yet.`;
  }

  return `${summary.total} tracked sections are not started yet.`;
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

function cycleSectionState(key) {
  const current = getSectionStatus(key);
  const currentIndex = STATUS_ORDER.indexOf(current);
  const next = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
  sectionState = {
    ...sectionState,
    [key]: next,
  };
  saveSectionState();
  renderJourney();
}

function stateLabel(status) {
  switch (status) {
    case "done":
      return "Done";
    case "in_progress":
      return "Doing";
    default:
      return "";
  }
}

function nextStatusLabel(status) {
  switch (status) {
    case "not_started":
      return "in progress";
    case "in_progress":
      return "done";
    default:
      return "not started";
  }
}

function loadSectionState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter((entry) => STATUS_ORDER.includes(entry[1])),
    );
  } catch {
    return {};
  }
}

function saveSectionState() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sectionState));
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
  overallPercentCaption.textContent = "complete";
  overallSummary.textContent = `${totals.totalDone} of ${totals.totalTracked} tracked sections are complete`;
  overallDone.textContent = `${totals.totalDone} done`;
  overallDoing.textContent = `${totals.totalDoing} doing`;
  overallStageSummary.textContent = `${doneStages}/${stageEntries.length} stages clear · ${activeStages} active`;

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
      class: `mini-node-label${entry.stage.label.length > 2 ? " wide" : ""}`,
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      y: "1",
    });
    text.textContent = entry.stage.label;

    const title = createSvgElement("title", {});
    title.textContent = `${entry.stage.title} · ${statusLabel(entry.summary.status)}`;

    group.append(outer, inner, text, title);
    miniJourney.append(group);
  });
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
