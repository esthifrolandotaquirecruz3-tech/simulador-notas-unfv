const STORAGE_KEY = "simulador_unfv_pasos_claros_v2";

const defaultData = {
  minPass: 10.5,
  roundingMode: "round",
  activeCourseId: null,
  courses: []
};

const PHRASES = {
  raspando: [
    "¡La hiciste linda! Pasaste pidiendo la hora.",
    "Raspando la olla, pero adentro es adentro, causa.",
    "Con el último suspiro, ni el VAR te la quita.",
    "Suerte de campeón: aprobaste con lo justo."
  ],
  bueno: [
    "Estás en modo crack, ya puedes dormir tranquilo.",
    "¡Qué abuso! Vas sobrado y sin despeinarte.",
    "Nivel tigre: dominando el ciclo como se debe.",
    "Tranquilo nomás, ya tienes tu colchón asegurado."
  ],
  marciano: [
    "¿De qué planeta viniste, causa? ¡Eres un marciano!",
    "Ya pues, deja algo de nota para el resto del salón.",
    "Nivel leyenda: hasta el profe te va a pedir apuntes.",
    "¡Qué máquina! Eso ya no es nota, es exhibición."
  ],
  remontada: [
    "Toca prender velita y meterle turbo al estudio, causa.",
    "Está picante, pero en la Villarreal nada es imposible.",
    "Modo remontada épica activado: a darle con todo."
  ],
  coronaste: [
    "Ya coronaste, causa: vas al Final solo a firmar.",
    "Invicto: aunque saques cero ya estás adentro."
  ],
  susti: [
    "F en el chat, causa… toca ir mentalizando el susti.",
    "Ni con ayuda divina alcanza aquí, a preparar la revancha."
  ]
};

function pickPhrase(category, seedText = "") {
  const list = PHRASES[category] || [];
  if (list.length === 0) return "";
  let hash = 0;
  for (let i = 0; i < seedText.length; i++) {
    hash = (hash * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  return list[hash % list.length];
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.courses)) {
        return {
          minPass: typeof parsed.minPass === "number" ? parsed.minPass : 10.5,
          roundingMode: parsed.roundingMode === "none" ? "none" : "round",
          activeCourseId: parsed.activeCourseId ?? null,
          courses: parsed.courses
        };
      }
    }
  } catch (_) {}
  return structuredClone(defaultData);
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatFinalGrade(value) {
  if (state.roundingMode === "round") {
    return Math.round(value).toString();
  }
  return value.toFixed(2);
}

function hasValidGrade(val) {
  return val !== "" && val !== null && !Number.isNaN(Number(val));
}

function isExamRubric(rubric) {
  return /(parcial|final)/i.test(rubric.name || "") && (rubric.notes || []).length === 1;
}

function calculateRubricStep(rubric) {
  const weight = Number(rubric.weight) || 0;
  const validNotes = (rubric.notes || []).filter((n) => hasValidGrade(n.grade));

  if (validNotes.length === 0) {
    return {
      weight,
      hasGrades: false,
      simpleAvg: 0,
      points: 0
    };
  }

  const sum = validNotes.reduce((acc, n) => acc + Number(n.grade), 0);
  const simpleAvg = sum / validNotes.length;
  const points = simpleAvg * (weight / 100);

  return {
    weight,
    hasGrades: true,
    simpleAvg,
    points
  };
}

function calculateCourseStep(course) {
  const rubrics = course.rubrics || [];
  let totalWeight = 0;
  let gradedWeight = 0;
  let totalPoints = 0;
  let pendingWeight = 0;
  const pendingNames = [];

  for (const r of rubrics) {
    const step = calculateRubricStep(r);
    totalWeight += step.weight;

    if (step.hasGrades) {
      gradedWeight += step.weight;
      totalPoints += step.points;
    } else {
      pendingWeight += step.weight;
      if (step.weight > 0) {
        pendingNames.push(r.name || "Pendiente");
      }
    }
  }

  const missingPoints = state.minPass - totalPoints;
  let neededGrade = null;
  let neededText = "—";
  let targetLabel = "";

  if (pendingNames.length === 1) {
    targetLabel = `en ${pendingNames[0]}`;
  } else if (pendingNames.length > 1) {
    targetLabel = `de promedio en ${pendingNames.join(" y ")}`;
  }

  if (rubrics.length > 0 && totalWeight === 100 && pendingWeight > 0) {
    neededGrade = missingPoints / (pendingWeight / 100);
    if (neededGrade <= 0) {
      neededText = "0.00 (Ya aprobado)";
    } else if (neededGrade > 20) {
      neededText = `${neededGrade.toFixed(2)} (No alcanza)`;
    } else {
      neededText = `${neededGrade.toFixed(2)} aprox.`;
    }
  } else if (rubrics.length > 0 && totalWeight === 100 && pendingWeight === 0) {
    neededText = "Completo";
  }

  return {
    totalWeight,
    gradedWeight,
    pendingWeight,
    totalPoints,
    missingPoints,
    neededGrade,
    neededText,
    targetLabel
  };
}

function getFunnySubtext(exactScore, seed) {
  if (exactScore >= 17) return pickPhrase("marciano", seed);
  if (exactScore >= 13) return pickPhrase("bueno", seed);
  if (exactScore >= state.minPass) return pickPhrase("raspando", seed);
  return pickPhrase("susti", seed);
}

function renderTabs() {
  const tabsEl = document.getElementById("courseTabs");
  tabsEl.innerHTML = "";

  state.courses.forEach((course) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `tab-btn ${course.id === state.activeCourseId ? "active" : ""}`;
    btn.textContent = course.name;
    btn.addEventListener("click", () => {
      state.activeCourseId = course.id;
      saveState();
      renderAll();
    });
    tabsEl.appendChild(btn);
  });
}

function renderActiveCourse() {
  const titleEl = document.getElementById("currentCourseTitle");
  const badgeEl = document.getElementById("courseWeightBadge");
  const container = document.getElementById("rubricsContainer");
  const addRubricBtn = document.getElementById("addRubricBtn");
  const autoWeightBtn = document.getElementById("autoWeightBtn");
  const deleteCourseBtn = document.getElementById("deleteCourseBtn");

  container.innerHTML = "";

  if (state.courses.length === 0) {
    state.activeCourseId = null;
    titleEl.textContent = "Ningún curso seleccionado";
    badgeEl.textContent = "";
    addRubricBtn.disabled = true;
    autoWeightBtn.disabled = true;
    deleteCourseBtn.disabled = true;
    container.innerHTML = `<div class="empty-box">Crea un curso arriba o haz clic en <strong>"Cargar ejemplo de Física"</strong>.</div>`;
    updateCalculations();
    return;
  }

  const course = state.courses.find((c) => c.id === state.activeCourseId) || state.courses[0];
  state.activeCourseId = course.id;
  titleEl.textContent = course.name;
  addRubricBtn.disabled = false;
  autoWeightBtn.disabled = false;
  deleteCourseBtn.disabled = false;

  course.rubrics.forEach((rubric, rIdx) => {
    const box = document.createElement("div");
    box.className = "rubric-box";

    const top = document.createElement("div");
    top.className = "rubric-top";

    const meta = document.createElement("div");
    meta.className = "rubric-meta";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "rubric-name-input";
    nameInput.value = rubric.name;
    nameInput.placeholder = "Nombre del bloque";
    nameInput.addEventListener("input", (e) => {
      rubric.name = e.target.value;
      saveState();
      updateCalculations();
    });

    const weightLabel = document.createElement("label");
    weightLabel.className = "inline-label";
    weightLabel.textContent = "Peso (%):";
    const weightInput = document.createElement("input");
    weightInput.type = "number";
    weightInput.min = "0";
    weightInput.max = "100";
    weightInput.value = rubric.weight;
    weightInput.addEventListener("input", (e) => {
      rubric.weight = e.target.value === "" ? 0 : parseFloat(e.target.value);
      saveState();
      updateCalculations();
    });
    weightLabel.appendChild(weightInput);

    meta.append(nameInput, weightLabel);

    const controls = document.createElement("div");
    controls.className = "rubric-controls";

    const addNoteBtn = document.createElement("button");
    addNoteBtn.type = "button";
    addNoteBtn.className = "btn-small";
    addNoteBtn.textContent = "+ Nota";
    addNoteBtn.addEventListener("click", () => {
      rubric.notes.push({ label: `Nota ${rubric.notes.length + 1}`, grade: "" });
      saveState();
      renderActiveCourse();
    });

    const delRubricBtn = document.createElement("button");
    delRubricBtn.type = "button";
    delRubricBtn.className = "btn-remove btn-small";
    delRubricBtn.textContent = "✕";
    delRubricBtn.title = "Eliminar bloque";
    delRubricBtn.addEventListener("click", () => {
      course.rubrics.splice(rIdx, 1);
      saveState();
      renderAll();
    });

    controls.append(addNoteBtn, delRubricBtn);
    top.append(meta, controls);

    const notesGrid = document.createElement("div");
    notesGrid.className = "notes-grid";

    (rubric.notes || []).forEach((note, nIdx) => {
      const chip = document.createElement("div");
      chip.className = "note-chip";

      const labelInput = document.createElement("input");
      labelInput.type = "text";
      labelInput.className = "note-label-input";
      labelInput.value = note.label;
      labelInput.placeholder = "Evaluación";
      labelInput.addEventListener("input", (e) => {
        note.label = e.target.value;
        saveState();
      });

      const gradeInput = document.createElement("input");
      gradeInput.type = "number";
      gradeInput.className = "note-grade-input";
      gradeInput.min = "0";
      gradeInput.max = "20";
      gradeInput.step = "0.1";
      gradeInput.placeholder = "Pendiente";
      gradeInput.value = note.grade === "" ? "" : note.grade;
      if (note.grade !== "" && (note.grade < 0 || note.grade > 20)) {
        gradeInput.classList.add("input-error");
      }
      gradeInput.addEventListener("input", (e) => {
        const val = e.target.value;
        note.grade = val === "" ? "" : parseFloat(val);
        gradeInput.classList.toggle("input-error", note.grade !== "" && (note.grade < 0 || note.grade > 20));
        saveState();
        updateCalculations();
      });

      chip.append(labelInput, gradeInput);

      if (rubric.notes.length > 1) {
        const delNoteBtn = document.createElement("button");
        delNoteBtn.type = "button";
        delNoteBtn.className = "btn-remove btn-small";
        delNoteBtn.textContent = "✕";
        delNoteBtn.title = "Quitar nota";
        delNoteBtn.addEventListener("click", () => {
          rubric.notes.splice(nIdx, 1);
          saveState();
          renderActiveCourse();
        });
        chip.appendChild(delNoteBtn);
      }

      notesGrid.appendChild(chip);
    });

    box.append(top, notesGrid);

    if (isExamRubric(rubric)) {
      const simBar = document.createElement("div");
      simBar.className = "sim-slider-bar";
      simBar.innerHTML = `<span>Simular ${rubric.name}:</span>`;

      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "20";
      slider.step = "0.5";
      slider.value = hasValidGrade(rubric.notes[0].grade) ? rubric.notes[0].grade : 11;

      const simVal = document.createElement("strong");
      simVal.textContent = hasValidGrade(rubric.notes[0].grade) ? rubric.notes[0].grade : "—";

      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "btn-ghost btn-small";
      clearBtn.textContent = "Dejar pendiente";

      slider.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        rubric.notes[0].grade = val;
        simVal.textContent = val;
        const gradeInputEl = notesGrid.querySelector(".note-grade-input");
        if (gradeInputEl) gradeInputEl.value = val;
        saveState();
        updateCalculations();
      });

      clearBtn.addEventListener("click", () => {
        rubric.notes[0].grade = "";
        simVal.textContent = "—";
        const gradeInputEl = notesGrid.querySelector(".note-grade-input");
        if (gradeInputEl) gradeInputEl.value = "";
        saveState();
        updateCalculations();
      });

      simBar.append(slider, simVal, clearBtn);
      box.appendChild(simBar);
    }

    container.appendChild(box);
  });

  updateCalculations();
}

function updateCalculations() {
  const heroResult = document.getElementById("heroResult");
  const heroTag = document.getElementById("heroTag");
  const heroHeadline = document.getElementById("heroHeadline");
  const heroSubtext = document.getElementById("heroSubtext");
  const accumulatedEl = document.getElementById("accumulatedPointsValue");
  const minPassDisplay = document.getElementById("minPassDisplay");
  const badgeEl = document.getElementById("courseWeightBadge");

  minPassDisplay.textContent = state.minPass;
  heroResult.className = "hero-result";

  const course = state.courses.find((c) => c.id === state.activeCourseId);
  if (!course) {
    heroTag.textContent = "LISTO PARA EMPEZAR";
    heroHeadline.textContent = "Agregar curso";
    heroSubtext.textContent = "Promedio simple por bloque × porcentaje → suma total.";
    accumulatedEl.textContent = "0.00";
    renderOverviewTable();
    return;
  }

  const stats = calculateCourseStep(course);
  const seed = `${course.id}-${stats.totalPoints.toFixed(1)}`;

  if (stats.totalWeight === 100) {
    badgeEl.textContent = `Pesos completos (100%) · ${stats.gradedWeight}% evaluado`;
    badgeEl.className = "subtitle ok";
  } else {
    badgeEl.textContent = `Los pesos suman ${stats.totalWeight}% (deben sumar 100%)`;
    badgeEl.className = "subtitle warn";
  }

  accumulatedEl.textContent = stats.totalPoints.toFixed(2);

  if (stats.totalWeight !== 100) {
    heroResult.classList.add("state-warn");
    heroTag.textContent = "AJUSTE DE PESOS";
    heroHeadline.textContent = `Los porcentajes suman ${stats.totalWeight}%`;
    heroSubtext.textContent = `Usa "Completar 100%" o revisa los pesos de cada bloque.`;
  } else if (stats.pendingWeight === 0) {
    const finalFormatted = formatFinalGrade(stats.totalPoints);
    const passed = stats.totalPoints >= state.minPass;
    const funnyMsg = getFunnySubtext(stats.totalPoints, seed);

    if (passed) {
      heroResult.classList.add("state-ok");
      heroTag.textContent = stats.totalPoints >= 17 ? "MODO MARCIANO" : "CURSO APROBADO";
      heroHeadline.textContent = `¡Aprobaste ${course.name} con ${finalFormatted}! (${stats.totalPoints.toFixed(2)} pts)`;
      heroSubtext.textContent = funnyMsg;
    } else {
      heroResult.classList.add("state-bad");
      heroTag.textContent = "CURSO DESAPROBADO";
      heroHeadline.textContent = `Promedio final: ${finalFormatted} (${stats.totalPoints.toFixed(2)} pts)`;
      heroSubtext.textContent = funnyMsg;
    }
  } else {
    if (stats.neededGrade <= 0) {
      heroResult.classList.add("state-ok");
      heroTag.textContent = "META ALCANZADA";
      heroHeadline.textContent = `¡Ya tienes ${stats.totalPoints.toFixed(2)} pts acumulados!`;
      heroSubtext.textContent = pickPhrase("coronaste", seed);
    } else if (stats.neededGrade > 20) {
      heroResult.classList.add("state-bad");
      heroTag.textContent = "META FUERA DE RANGO";
      heroHeadline.textContent = `Necesitarías ${stats.neededGrade.toFixed(2)} ${stats.targetLabel}`;
      heroSubtext.textContent = `${pickPhrase("susti", seed)} (Te faltan ${stats.missingPoints.toFixed(2)} pts).`;
    } else {
      heroResult.classList.add("state-warn");
      heroTag.textContent = "META PARA APROBAR";
      heroHeadline.textContent = `Necesitas aprox. ${stats.neededGrade.toFixed(2)} ${stats.targetLabel}`;
      const extraHint = stats.neededGrade >= 15
        ? pickPhrase("remontada", seed)
        : `Llevas ${stats.totalPoints.toFixed(2)} pts; te faltan ${stats.missingPoints.toFixed(2)} pts para llegar a ${state.minPass}.`;
      heroSubtext.textContent = extraHint;
    }
  }

  renderOverviewTable();
}

function renderOverviewTable() {
  const tbody = document.getElementById("overviewTableBody");
  const card = document.getElementById("overviewCard");
  tbody.innerHTML = "";

  if (state.courses.length === 0) {
    card.style.display = "none";
    return;
  }

  card.style.display = "block";

  state.courses.forEach((course) => {
    const stats = calculateCourseStep(course);
    const tr = document.createElement("tr");

    let statusText = "En curso";
    let statusClass = "warn";

    if (stats.totalWeight !== 100) {
      statusText = "Revisar pesos";
      statusClass = "warn";
    } else if (stats.pendingWeight === 0) {
      const passed = stats.totalPoints >= state.minPass;
      statusText = passed ? "Aprobado" : "Desaprobado";
      statusClass = passed ? "ok" : "bad";
    } else if (stats.neededGrade !== null && stats.neededGrade <= 0) {
      statusText = "Aprobado";
      statusClass = "ok";
    }

    tr.innerHTML = `
      <td><strong>${course.name}</strong></td>
      <td>${stats.totalPoints.toFixed(2)} pts</td>
      <td><strong>${stats.neededText}</strong></td>
      <td class="${statusClass}"><strong>${statusText}</strong></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAll() {
  renderTabs();
  renderActiveCourse();
}

function addNewCourse() {
  const input = document.getElementById("newCourseName");
  const preset = document.getElementById("syllabusPreset").value;
  const name = input.value.trim();
  if (!name) {
    input.focus();
    return;
  }

  const weightsMap = {
    "40-30-30": [40, 30, 30],
    "30-30-40": [30, 30, 40],
    "50-25-25": [50, 25, 25]
  };
  const [wPrac, wParc, wFin] = weightsMap[preset] || [40, 30, 30];

  const newId = "c_" + Date.now();
  state.courses.push({
    id: newId,
    name,
    rubrics: [
      { name: "Notas de Prácticas", weight: wPrac, notes: [{ label: "Práctica 1", grade: "" }] },
      { name: "Examen Parcial", weight: wParc, notes: [{ label: "Parcial", grade: "" }] },
      { name: "Examen Final", weight: wFin, notes: [{ label: "Final", grade: "" }] }
    ]
  });
  state.activeCourseId = newId;
  input.value = "";
  saveState();
  renderAll();
}

document.getElementById("addCourseBtn").addEventListener("click", addNewCourse);
document.getElementById("newCourseName").addEventListener("keydown", (e) => {
  if (e.key === "Enter") addNewCourse();
});

document.getElementById("loadExampleBtn").addEventListener("click", () => {
  const newId = "c_fisica_" + Date.now();
  state.courses.push({
    id: newId,
    name: "Física (Ejemplo)",
    rubrics: [
      {
        name: "Notas de Prácticas",
        weight: 40,
        notes: [
          { label: "PART Y ASIS", grade: 18 },
          { label: "MAS", grade: 16 },
          { label: "SEG II", grade: 6 },
          { label: "DIN LIN", grade: 17 },
          { label: "SIM M PARAB", grade: 17 },
          { label: "VAL AGR DENS", grade: 15 },
          { label: "SEG I", grade: 11 },
          { label: "EXP MED", grade: 16 },
          { label: "PC VECT", grade: 17 },
          { label: "ORG ING FISICA", grade: 14 }
        ]
      },
      {
        name: "Examen Parcial",
        weight: 30,
        notes: [{ label: "Parcial", grade: 14 }]
      },
      {
        name: "Examen Final",
        weight: 30,
        notes: [{ label: "Final", grade: "" }]
      }
    ]
  });
  state.activeCourseId = newId;
  saveState();
  renderAll();
});

document.getElementById("deleteCourseBtn").addEventListener("click", () => {
  if (!state.activeCourseId) return;
  state.courses = state.courses.filter((c) => c.id !== state.activeCourseId);
  state.activeCourseId = state.courses[0]?.id ?? null;
  saveState();
  renderAll();
});

document.getElementById("deleteAllCoursesBtn").addEventListener("click", () => {
  if (state.courses.length === 0) return;
  if (!confirm("¿Seguro que deseas eliminar todos los cursos?")) return;
  state.courses = [];
  state.activeCourseId = null;
  saveState();
  renderAll();
});

document.getElementById("addRubricBtn").addEventListener("click", () => {
  const course = state.courses.find((c) => c.id === state.activeCourseId);
  if (!course) return;
  course.rubrics.push({
    name: "Nuevo bloque",
    weight: 0,
    notes: [{ label: "Nota 1", grade: "" }]
  });
  saveState();
  renderActiveCourse();
});

document.getElementById("autoWeightBtn").addEventListener("click", () => {
  const course = state.courses.find((c) => c.id === state.activeCourseId);
  if (!course || !course.rubrics || course.rubrics.length === 0) return;

  const stats = calculateCourseStep(course);
  const diff = 100 - stats.totalWeight;
  if (diff === 0) return;

  const lastRubric = course.rubrics[course.rubrics.length - 1];
  lastRubric.weight = Math.max(0, (Number(lastRubric.weight) || 0) + diff);
  saveState();
  renderActiveCourse();
});

const minPassInput = document.getElementById("minPass");
const roundingSelect = document.getElementById("roundingMode");

minPassInput.value = state.minPass;
roundingSelect.value = state.roundingMode;

minPassInput.addEventListener("input", (e) => {
  state.minPass = parseFloat(e.target.value) || 0;
  saveState();
  updateCalculations();
});

roundingSelect.addEventListener("change", (e) => {
  state.roundingMode = e.target.value;
  saveState();
  updateCalculations();
});

renderAll();