type StringProperty = ComponentFramework.PropertyTypes.StringProperty;

interface IInputs {
  DefaultHtml: StringProperty;
}

interface IOutputs {
  HtmlText?: string;
}

type ResizeState = {
  image: HTMLImageElement;
  startX: number;
  startWidth: number;
};

/* ─── Inline SVG icons (no external deps) ─────────────────────────────────── */
function ico(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${body}</svg>`;
}

const SVG = {
  alignL:  ico('<rect fill="currentColor" x="2" y="2.5" width="12" height="1.5" rx=".75"/><rect fill="currentColor" x="2" y="6.5" width="7.5" height="1.5" rx=".75"/><rect fill="currentColor" x="2" y="10.5" width="10" height="1.5" rx=".75"/>'),
  alignC:  ico('<rect fill="currentColor" x="2" y="2.5" width="12" height="1.5" rx=".75"/><rect fill="currentColor" x="4.25" y="6.5" width="7.5" height="1.5" rx=".75"/><rect fill="currentColor" x="3" y="10.5" width="10" height="1.5" rx=".75"/>'),
  alignR:  ico('<rect fill="currentColor" x="2" y="2.5" width="12" height="1.5" rx=".75"/><rect fill="currentColor" x="6.5" y="6.5" width="7.5" height="1.5" rx=".75"/><rect fill="currentColor" x="4" y="10.5" width="10" height="1.5" rx=".75"/>'),
  ul:      ico('<circle fill="currentColor" cx="3.5" cy="3.75" r="1.25"/><circle fill="currentColor" cx="3.5" cy="8" r="1.25"/><circle fill="currentColor" cx="3.5" cy="12.25" r="1.25"/><rect fill="currentColor" x="7" y="3" width="7" height="1.5" rx=".75"/><rect fill="currentColor" x="7" y="7.25" width="7" height="1.5" rx=".75"/><rect fill="currentColor" x="7" y="11.5" width="7" height="1.5" rx=".75"/>'),
  ol:      ico('<rect fill="currentColor" x="6.5" y="3" width="7.5" height="1.5" rx=".75"/><rect fill="currentColor" x="6.5" y="7.25" width="7.5" height="1.5" rx=".75"/><rect fill="currentColor" x="6.5" y="11.5" width="7.5" height="1.5" rx=".75"/><path fill="currentColor" d="M2 2.5h.8v3.2H2V4.4l-.5.2V4l.5-.75V2.5zm-.2 5.1h1.4v.5H2.2v.5h1v.5h-1v.5h1.2v.5H1.8V7.6zm0 3.8h1.2c0 .35-.35.55-.55.85H3V13H1.8v-.4c.4-.4.8-.65.8-.95H1.8v-.25z"/>'),
  link:    ico('<path fill="currentColor" d="M9.9 6.1a3 3 0 0 0-4.24 0L4.2 7.56a3 3 0 1 0 4.24 4.24l.7-.7-1.06-1.07-.7.71a1.5 1.5 0 1 1-2.12-2.12l1.46-1.46a1.5 1.5 0 0 1 2.12 2.12l1.07 1.06A3 3 0 0 0 9.9 6.1zm-3.8 3.8a3 3 0 0 0 4.24 0l1.46-1.46a3 3 0 1 0-4.24-4.24l-.7.7 1.06 1.07.7-.71a1.5 1.5 0 1 1 2.12 2.12L9.28 8.84a1.5 1.5 0 0 1-2.12-2.12L6.1 5.66z"/>'),
  table:   ico('<rect fill="none" stroke="currentColor" stroke-width="1.3" x="1.5" y="1.5" width="13" height="13" rx="1.5"/><line stroke="currentColor" stroke-width="1.3" x1="1.5" y1="6" x2="14.5" y2="6"/><line stroke="currentColor" stroke-width="1.3" x1="1.5" y1="10.5" x2="14.5" y2="10.5"/><line stroke="currentColor" stroke-width="1.3" x1="6" y1="1.5" x2="6" y2="14.5"/><line stroke="currentColor" stroke-width="1.3" x1="10.5" y1="1.5" x2="10.5" y2="14.5"/>'),
  image:   ico('<rect fill="none" stroke="currentColor" stroke-width="1.3" x="1.5" y="2.5" width="13" height="11" rx="1.5"/><circle fill="currentColor" cx="5.5" cy="6.5" r="1.5"/><path fill="currentColor" d="M2 13.5l3.5-4 2.5 2.5 2.5-3 4 4.5H2z"/>'),
  eraser:  ico('<path fill="currentColor" d="M13 2.5a1.5 1.5 0 0 1 0 2.12L7.5 10 6 8.5l5.5-5.5a1.5 1.5 0 0 1 1.5-.5zM5.6 9.9 4.4 11.1l2.1 1.9H8l-2.4-3.1zM2 14.5h12v-1H2v1z"/>'),
  chevron: ico('<path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M4 6.5l4 3 4-3"/>'),
  rowAdd:  ico('<path fill="currentColor" d="M1.5 3.5h13v5h-1.5V5H3V8.5H1.5v-5zM8 11v2H6v1.5h2v2h1.5v-2h2V13h-2v-2H8z"/>'),
  rowDel:  ico('<path fill="currentColor" d="M1.5 3.5h13v5h-1.5V5H3V8.5H1.5v-5zM6 12.5l1.5 1.5-1.5 1.5 1 1 1.5-1.5 1.5 1.5 1-1L9.5 14l1.5-1.5-1-1-1.5 1.5-1.5-1.5-1 1z"/>'),
  colAdd:  ico('<path fill="currentColor" d="M3.5 1.5v13h5v-1.5H5V3h3.5V1.5h-5zM11 8v2H9v1.5h2v2h1.5v-2h2V10h-2V8H11z"/>'),
  colDel:  ico('<path fill="currentColor" d="M3.5 1.5v13h5v-1.5H5V3h3.5V1.5h-5zM10 9.5l1.5 1.5-1.5 1.5 1 1 1.5-1.5 1.5 1.5 1-1L12.5 11l1.5-1.5-1-1L11.5 10 10 8.5l-1 1z"/>'),
  undo:    ico('<path fill="currentColor" d="M3.5 6.5H9a3.5 3.5 0 0 1 0 7H5v-1.5h4a2 2 0 0 0 0-4H3.5l2 2-1.06 1.06L1 7.56 4.44 4.1 3.5 6.5z" clip-rule="evenodd" fill-rule="evenodd"/>'),
  redo:    ico('<path fill="currentColor" d="M12.5 6.5H7a3.5 3.5 0 0 0 0 7h4v-1.5H7a2 2 0 0 1 0-4h5.5l-2 2 1.06 1.06L15 7.56 11.56 4.1l.94 2.4z" clip-rule="evenodd" fill-rule="evenodd"/>'),
  indent:  ico('<path fill="currentColor" d="M2 3h12v1.5H2V3zm4 3.5h8V8H6V6.5zm0 3.5h8v1.5H6V10zm-4 3h12v1.5H2V13zm0-6.5v4l2.5-2L2 6.5z"/>'),
  outdent: ico('<path fill="currentColor" d="M2 3h12v1.5H2V3zm4 3.5h8V8H6V6.5zm0 3.5h8v1.5H6V10zm-4 3h12v1.5H2V13zm2.5-6.5L2 9l2.5 2V6.5z"/>'),
  hr:      ico('<rect fill="currentColor" x="1" y="7.25" width="14" height="1.5" rx=".75"/><rect fill="currentColor" x="4" y="3" width="8" height="1.5" rx=".75"/><rect fill="currentColor" x="4" y="11.5" width="8" height="1.5" rx=".75"/>'),
  source:  ico('<path fill="currentColor" d="M5.5 4.5 2 8l3.5 3.5 1.06-1.06L4.12 8l2.44-2.44L5.5 4.5zm5 0-1.06 1.06L11.88 8l-2.44 2.44L10.5 11.5 14 8l-3.5-3.5z"/>'),
};

export class HtmlEditor implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private root!: HTMLDivElement;
  private editor!: HTMLDivElement;
  private fileInput!: HTMLInputElement;
  private counter!: HTMLSpanElement;
  private status!: HTMLSpanElement;
  private resizeHandle?: HTMLDivElement;
  private selectedImage?: HTMLImageElement;
  private resizeState?: ResizeState;
  private savedRange?: Range;
  private notifyOutputChanged!: () => void;
  private html = "";
  private defaultHtml = "";
  private sourceMode = false;
  private sourceArea!: HTMLTextAreaElement;

  // Toolbar buttons with active state
  private btnBold!: HTMLButtonElement;
  private btnItalic!: HTMLButtonElement;
  private btnUnderline!: HTMLButtonElement;
  private btnStrike!: HTMLButtonElement;
  private btnAlignL!: HTMLButtonElement;
  private btnAlignC!: HTMLButtonElement;
  private btnAlignR!: HTMLButtonElement;
  private btnUl!: HTMLButtonElement;
  private btnOl!: HTMLButtonElement;
  private formatSel!: HTMLSelectElement;
  private fontSizeSel!: HTMLSelectElement;

  // Table dropdown
  private tableDropdown!: HTMLDivElement;
  private tableBtn!: HTMLButtonElement;
  private tableMenuOpen = false;

  // Color pickers
  private textColorInput!: HTMLInputElement;
  private bgColorInput!: HTMLInputElement;
  private textColorSwatch!: HTMLElement;
  private bgColorSwatch!: HTMLElement;

  private readonly allowedTags = new Set([
    "A", "B", "BLOCKQUOTE", "BR", "DIV", "EM",
    "FONT", "H1", "H2", "H3", "I", "IMG",
    "LI", "OL", "P", "S", "SPAN", "STRIKE", "STRONG",
    "TABLE", "TBODY", "TD", "TH", "THEAD", "TR", "U", "UL", "HR"
  ]);

  /* ──────────────────────────────── lifecycle ─────────────────────────────── */

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    void state;
    this.notifyOutputChanged = notifyOutputChanged;
    this.defaultHtml = context.parameters.DefaultHtml.raw ?? "";
    this.html = this.sanitizeHtml(this.defaultHtml);

    this.root = document.createElement("div");
    this.root.className = "fdi-editor";

    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = "image/*";
    this.fileInput.hidden = true;
    this.fileInput.addEventListener("change", this.handleFileSelected);

    this.root.appendChild(this.buildToolbar());
    this.root.appendChild(this.buildBody());
    this.root.appendChild(this.buildFooter());
    this.root.appendChild(this.fileInput);
    container.appendChild(this.root);

    this.editor.innerHTML = this.html;
    this.updateCounters();
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    const next = context.parameters.DefaultHtml.raw ?? "";
    if (next === this.defaultHtml) return;
    this.defaultHtml = next;
    if (document.activeElement === this.editor) return;
    this.html = this.sanitizeHtml(next);
    this.editor.innerHTML = this.html;
    this.updateCounters();
  }

  public getOutputs(): IOutputs {
    return { HtmlText: this.html };
  }

  public destroy(): void {
    this.fileInput?.removeEventListener("change", this.handleFileSelected);
    this.editor?.removeEventListener("input", this.handleInput);
    this.editor?.removeEventListener("paste", this.handlePaste);
    this.editor?.removeEventListener("keydown", this.handleKeyDown);
    this.editor?.removeEventListener("click", this.handleEditorClick);
    document.removeEventListener("mousemove", this.handleImageResize);
    document.removeEventListener("mouseup", this.stopImageResize);
    document.removeEventListener("mousedown", this.handleOutsideClick);
    this.resizeHandle?.remove();
  }

  /* ──────────────────────────────── toolbar ───────────────────────────────── */

  private buildToolbar(): HTMLDivElement {
    const bar = document.createElement("div");
    bar.className = "fdi-editor__toolbar";

    // Undo / Redo
    bar.appendChild(
      this.buildGroup([
        this.buildSvgBtn(SVG.undo, "Deshacer (Ctrl+Z)",  () => this.cmd("undo")),
        this.buildSvgBtn(SVG.redo, "Rehacer (Ctrl+Y)",   () => this.cmd("redo")),
      ])
    );

    // Format block + font size
    this.formatSel  = this.buildFormatSelect();
    this.fontSizeSel = this.buildFontSizeSelect();
    bar.appendChild(this.buildGroup([this.formatSel, this.fontSizeSel]));

    // Text styling
    this.btnBold      = this.buildLabelBtn("B", "Negrita (Ctrl+B)",    "bold",          "fdi-editor__btn--bold");
    this.btnItalic    = this.buildLabelBtn("I", "Cursiva (Ctrl+I)",     "italic",        "fdi-editor__btn--italic");
    this.btnUnderline = this.buildLabelBtn("U", "Subrayado (Ctrl+U)",   "underline",     "fdi-editor__btn--underline");
    this.btnStrike    = this.buildLabelBtn("S", "Tachado",              "strikeThrough", "fdi-editor__btn--strike");
    bar.appendChild(this.buildGroup([this.btnBold, this.btnItalic, this.btnUnderline, this.btnStrike]));

    // Colors
    const { wrapper: tcWrap, input: tcInput, swatch: tcSwatch } =
      this.buildColorBtn("foreColor",   "Color de texto",    "#000000", "A");
    const { wrapper: bcWrap, input: bcInput, swatch: bcSwatch } =
      this.buildColorBtn("hiliteColor", "Color de resaltado", "#ffff00", "H");

    this.textColorInput  = tcInput;
    this.textColorSwatch = tcSwatch;
    this.bgColorInput    = bcInput;
    this.bgColorSwatch   = bcSwatch;

    bar.appendChild(this.buildGroup([tcWrap as unknown as HTMLButtonElement, bcWrap as unknown as HTMLButtonElement]));

    // Alignment
    this.btnAlignL = this.buildSvgBtn(SVG.alignL, "Alinear izquierda", () => this.cmd("justifyLeft"));
    this.btnAlignC = this.buildSvgBtn(SVG.alignC, "Centrar",           () => this.cmd("justifyCenter"));
    this.btnAlignR = this.buildSvgBtn(SVG.alignR, "Alinear derecha",   () => this.cmd("justifyRight"));
    bar.appendChild(this.buildGroup([this.btnAlignL, this.btnAlignC, this.btnAlignR]));

    // Lists + indent
    this.btnUl = this.buildSvgBtn(SVG.ul, "Lista con viñetas",  () => this.cmd("insertUnorderedList"));
    this.btnOl = this.buildSvgBtn(SVG.ol, "Lista numerada",      () => this.cmd("insertOrderedList"));
    bar.appendChild(
      this.buildGroup([
        this.btnUl,
        this.btnOl,
        this.buildSvgBtn(SVG.outdent, "Disminuir sangría", () => this.cmd("outdent")),
        this.buildSvgBtn(SVG.indent,  "Aumentar sangría",  () => this.cmd("indent")),
      ])
    );

    // Insert actions
    const tableWrap = this.buildTableDropdown();
    bar.appendChild(
      this.buildGroup([
        this.buildSvgBtn(SVG.link,   "Insertar vínculo",        () => this.insertLink(), true),
        tableWrap as unknown as HTMLButtonElement,
        this.buildSvgBtn(SVG.image,  "Insertar imagen",         () => this.fileInput.click(), true),
        this.buildSvgBtn(SVG.hr,     "Insertar línea divisoria", () => this.insertHr(), true),
        this.buildSvgBtn(SVG.eraser, "Limpiar formato",          () => this.clearFormatting(), true),
      ])
    );

    // Source view toggle
    bar.appendChild(
      this.buildGroup([
        this.buildSvgBtn(SVG.source, "Ver código HTML", () => this.toggleSourceMode(), true),
      ])
    );

    return bar;
  }

  private buildGroup(items: HTMLElement[]): HTMLDivElement {
    const g = document.createElement("div");
    g.className = "fdi-editor__group";
    items.forEach((el) => g.appendChild(el));
    return g;
  }

  private buildLabelBtn(label: string, title: string, command: string, extraClass = ""): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `fdi-editor__btn ${extraClass}`.trim();
    btn.textContent = label;
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", (e) => { e.preventDefault(); this.cmd(command); this.updateToolbarState(); });
    return btn;
  }

  private buildSvgBtn(iconHtml: string, title: string, onClick: () => void, wide = false): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = wide ? "fdi-editor__btn fdi-editor__btn--wide" : "fdi-editor__btn";
    btn.innerHTML = iconHtml;
    btn.title = title;
    btn.setAttribute("aria-label", title);
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", (e) => { e.preventDefault(); onClick(); });
    return btn;
  }

  private buildFormatSelect(): HTMLSelectElement {
    const sel = document.createElement("select");
    sel.className = "fdi-editor__format-sel";
    sel.title = "Formato de bloque";
    [
      ["p",  "Normal"],
      ["h1", "Título 1"],
      ["h2", "Título 2"],
      ["h3", "Título 3"],
    ].forEach(([val, label]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = label;
      sel.appendChild(opt);
    });
    sel.addEventListener("mousedown", () => this.saveSelection());
    sel.addEventListener("change", () => {
      this.restoreSelection();
      this.cmd("formatBlock", sel.value);
    });
    return sel;
  }

  private buildFontSizeSelect(): HTMLSelectElement {
    const sel = document.createElement("select");
    sel.className = "fdi-editor__font-size-sel";
    sel.title = "Tamaño de fuente";
    [
      ["1", "8pt"],
      ["2", "10pt"],
      ["3", "12pt (Normal)"],
      ["4", "14pt"],
      ["5", "18pt"],
      ["6", "24pt"],
      ["7", "36pt"],
    ].forEach(([val, label]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = label;
      if (val === "3") opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("mousedown", () => this.saveSelection());
    sel.addEventListener("change", () => {
      this.restoreSelection();
      document.execCommand("fontSize", false, sel.value);
      this.saveSelection();
      this.syncFromEditor();
    });
    return sel;
  }

  private buildColorBtn(
    command: string,
    title: string,
    initial: string,
    letter: string
  ): { wrapper: HTMLDivElement; input: HTMLInputElement; swatch: HTMLElement } {
    const wrapper = document.createElement("div");
    wrapper.className = "fdi-editor__color-wrap";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fdi-editor__btn fdi-editor__btn--color";
    btn.title = title;
    btn.setAttribute("aria-label", title);

    const letterEl = document.createElement("span");
    letterEl.className = "fdi-editor__color-letter";
    letterEl.textContent = letter;

    const swatch = document.createElement("span");
    swatch.className = "fdi-editor__color-swatch";
    swatch.style.background = initial;

    btn.appendChild(letterEl);
    btn.appendChild(swatch);
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      colorInput.click();
    });

    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.className = "fdi-editor__color-input";
    colorInput.value = initial;
    colorInput.tabIndex = -1;
    colorInput.setAttribute("aria-hidden", "true");
    colorInput.addEventListener("input", () => {
      swatch.style.background = colorInput.value;
      this.restoreSelection();
      document.execCommand(command, false, colorInput.value);
      this.saveSelection();
      this.syncFromEditor();
    });

    wrapper.appendChild(btn);
    wrapper.appendChild(colorInput);
    return { wrapper, input: colorInput, swatch };
  }

  /* ──────────────────────────────── table dropdown ───────────────────────── */

  private buildTableDropdown(): HTMLDivElement {
    const wrap = document.createElement("div");
    wrap.className = "fdi-editor__dropdown-wrap";

    this.tableBtn = document.createElement("button");
    this.tableBtn.type = "button";
    this.tableBtn.className = "fdi-editor__btn fdi-editor__btn--wide fdi-editor__btn--split";
    this.tableBtn.title = "Tabla";
    this.tableBtn.setAttribute("aria-label", "Tabla");
    this.tableBtn.innerHTML = SVG.table + SVG.chevron;
    this.tableBtn.addEventListener("mousedown", (e) => e.preventDefault());
    this.tableBtn.addEventListener("click", (e) => { e.preventDefault(); this.toggleTableMenu(); });

    this.tableDropdown = document.createElement("div");
    this.tableDropdown.className = "fdi-editor__dropdown fdi-editor__dropdown--hidden";
    this.tableDropdown.setAttribute("role", "menu");

    this.rebuildTableMenu();

    wrap.appendChild(this.tableBtn);
    wrap.appendChild(this.tableDropdown);
    document.addEventListener("mousedown", this.handleOutsideClick);
    return wrap;
  }

  private rebuildTableMenu(): void {
    const d = this.tableDropdown;
    d.innerHTML = "";

    const inTable = this.isInTable();

    d.appendChild(this.makeMenuSection("Insertar tabla"));
    [[2, 2], [3, 3], [4, 4], [5, 5]].forEach(([r, c]) => {
      d.appendChild(this.makeMenuItem(
        `${r}×${c} tabla`, SVG.table,
        () => { this.insertTablePreset(r, c); this.closeTableMenu(); }
      ));
    });

    d.appendChild(this.makeMenuSection("Filas"));
    d.appendChild(this.makeMenuItem("Insertar fila arriba",  SVG.rowAdd, () => { this.addRow("above");  this.closeTableMenu(); }, !inTable));
    d.appendChild(this.makeMenuItem("Insertar fila abajo",   SVG.rowAdd, () => { this.addRow("below");  this.closeTableMenu(); }, !inTable));
    d.appendChild(this.makeMenuItem("Eliminar fila",         SVG.rowDel, () => { this.deleteRow();      this.closeTableMenu(); }, !inTable));

    d.appendChild(this.makeMenuSection("Columnas"));
    d.appendChild(this.makeMenuItem("Insertar columna izquierda", SVG.colAdd, () => { this.addColumn("left");   this.closeTableMenu(); }, !inTable));
    d.appendChild(this.makeMenuItem("Insertar columna derecha",   SVG.colAdd, () => { this.addColumn("right");  this.closeTableMenu(); }, !inTable));
    d.appendChild(this.makeMenuItem("Eliminar columna",            SVG.colDel, () => { this.deleteColumn();     this.closeTableMenu(); }, !inTable));
  }

  private makeMenuSection(label: string): HTMLDivElement {
    const s = document.createElement("div");
    s.className = "fdi-editor__menu-section";
    s.textContent = label;
    return s;
  }

  private makeMenuItem(
    label: string,
    iconHtml: string,
    onClick: () => void,
    disabled = false
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fdi-editor__menu-item";
    btn.disabled = disabled;
    btn.setAttribute("role", "menuitem");
    btn.innerHTML = iconHtml + `<span>${label}</span>`;
    btn.addEventListener("mousedown", (e) => e.preventDefault());
    btn.addEventListener("click", (e) => { e.preventDefault(); if (!disabled) onClick(); });
    return btn;
  }

  private toggleTableMenu(): void {
    if (this.tableMenuOpen) { this.closeTableMenu(); } else { this.openTableMenu(); }
  }

  private openTableMenu(): void {
    this.rebuildTableMenu();
    this.tableDropdown.classList.remove("fdi-editor__dropdown--hidden");
    this.tableMenuOpen = true;
  }

  private closeTableMenu(): void {
    this.tableDropdown.classList.add("fdi-editor__dropdown--hidden");
    this.tableMenuOpen = false;
  }

  private readonly handleOutsideClick = (event: MouseEvent): void => {
    if (this.tableMenuOpen && !this.tableDropdown.contains(event.target as Node) && event.target !== this.tableBtn) {
      this.closeTableMenu();
    }
  };

  /* ──────────────────────────────── table operations ─────────────────────── */

  private insertTablePreset(rows: number, cols: number): void {
    let html = '<table style="border-collapse:collapse;width:100%"><tbody>';
    for (let r = 0; r < rows; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) {
        const tag = r === 0 ? "th" : "td";
        html += `<${tag} style="border:1px solid #c9d1d9;padding:8px;min-width:80px">&nbsp;</${tag}>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table><p><br></p>";
    this.insertHtml(html);
  }

  private addRow(position: "above" | "below"): void {
    const tr = this.getAncestor<HTMLTableRowElement>("TR");
    if (!tr) return;
    const colCount = tr.cells.length;
    const newRow = document.createElement("tr");
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement("td");
      td.style.cssText = "border:1px solid #c9d1d9;padding:8px;min-width:80px";
      td.innerHTML = "&nbsp;";
      newRow.appendChild(td);
    }
    position === "below" ? tr.after(newRow) : tr.before(newRow);
    this.syncFromEditor();
  }

  private deleteRow(): void {
    const tr = this.getAncestor<HTMLTableRowElement>("TR");
    if (!tr) return;
    const table = tr.closest("table");
    if (!table) return;
    table.rows.length <= 1 ? table.remove() : tr.remove();
    this.syncFromEditor();
  }

  private addColumn(position: "left" | "right"): void {
    const td = this.getAncestor<HTMLTableCellElement>("TD") ?? this.getAncestor<HTMLTableCellElement>("TH");
    if (!td) return;
    const table = td.closest("table");
    if (!table) return;
    const colIdx = td.cellIndex;
    Array.from(table.rows).forEach((row) => {
      const cell = document.createElement("td");
      cell.style.cssText = "border:1px solid #c9d1d9;padding:8px;min-width:80px";
      cell.innerHTML = "&nbsp;";
      const ref = row.cells[position === "right" ? colIdx + 1 : colIdx] ?? null;
      row.insertBefore(cell, ref);
    });
    this.syncFromEditor();
  }

  private deleteColumn(): void {
    const td = this.getAncestor<HTMLTableCellElement>("TD") ?? this.getAncestor<HTMLTableCellElement>("TH");
    if (!td) return;
    const table = td.closest("table");
    if (!table) return;
    const colIdx = td.cellIndex;
    if ((table.rows[0]?.cells.length ?? 0) <= 1) {
      table.remove();
    } else {
      Array.from(table.rows).forEach((row) => { row.cells[colIdx]?.remove(); });
    }
    this.syncFromEditor();
  }

  private isInTable(): boolean {
    return this.getAncestor("TABLE") !== null;
  }

  private getAncestor<T extends Element>(tagName: string): T | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.anchorNode;
    while (node && node !== this.editor) {
      if ((node as Element).tagName === tagName.toUpperCase()) return node as T;
      node = node.parentNode;
    }
    return null;
  }

  /* ──────────────────────────────── body / footer ────────────────────────── */

  private buildBody(): HTMLDivElement {
    const body = document.createElement("div");
    body.className = "fdi-editor__body";

    this.editor = document.createElement("div");
    this.editor.className = "fdi-editor__editable";
    this.editor.contentEditable = "true";
    this.editor.spellcheck = true;
    this.editor.setAttribute("role", "textbox");
    this.editor.setAttribute("aria-multiline", "true");
    this.editor.setAttribute("placeholder", "Escribe el cuerpo del correo...");
    this.editor.addEventListener("input",   this.handleInput);
    this.editor.addEventListener("paste",   this.handlePaste);
    this.editor.addEventListener("keydown", this.handleKeyDown);
    this.editor.addEventListener("click",   this.handleEditorClick);
    this.editor.addEventListener("keyup",   () => { this.saveSelection(); this.updateToolbarState(); });
    this.editor.addEventListener("mouseup", () => { this.saveSelection(); this.updateToolbarState(); });

    this.sourceArea = document.createElement("textarea");
    this.sourceArea.className = "fdi-editor__source";
    this.sourceArea.setAttribute("aria-label", "Código HTML fuente");
    this.sourceArea.spellcheck = false;
    this.sourceArea.hidden = true;
    this.sourceArea.addEventListener("input", () => {
      this.html = this.sanitizeHtml(this.sourceArea.value);
      this.updateCounters();
      this.notifyOutputChanged();
    });

    body.appendChild(this.editor);
    body.appendChild(this.sourceArea);
    return body;
  }

  private buildFooter(): HTMLDivElement {
    const footer = document.createElement("div");
    footer.className = "fdi-editor__footer";

    this.counter = document.createElement("span");
    this.status = document.createElement("span");
    this.status.textContent = "HTML listo para correo";

    footer.appendChild(this.counter);
    footer.appendChild(this.status);
    return footer;
  }

  /* ──────────────────────────────── source mode ───────────────────────────── */

  private toggleSourceMode(): void {
    this.sourceMode = !this.sourceMode;
    const srcBtn = this.root.querySelector<HTMLButtonElement>(`[aria-label="Ver código HTML"]`);

    if (this.sourceMode) {
      this.sourceArea.value = this.editor.innerHTML;
      this.editor.hidden = true;
      this.sourceArea.hidden = false;
      srcBtn?.classList.add("fdi-editor__btn--active");
      this.setStatus("Modo código fuente");
    } else {
      this.html = this.sanitizeHtml(this.sourceArea.value);
      this.editor.innerHTML = this.html;
      this.editor.hidden = false;
      this.sourceArea.hidden = true;
      srcBtn?.classList.remove("fdi-editor__btn--active");
      this.updateCounters();
      this.notifyOutputChanged();
      this.setStatus("HTML listo para correo");
    }
  }

  /* ──────────────────────────────── toolbar state ────────────────────────── */

  private updateToolbarState(): void {
    this.setActive(this.btnBold,      document.queryCommandState("bold"));
    this.setActive(this.btnItalic,    document.queryCommandState("italic"));
    this.setActive(this.btnUnderline, document.queryCommandState("underline"));
    this.setActive(this.btnStrike,    document.queryCommandState("strikeThrough"));
    this.setActive(this.btnUl,        document.queryCommandState("insertUnorderedList"));
    this.setActive(this.btnOl,        document.queryCommandState("insertOrderedList"));
    this.setActive(this.btnAlignL,    document.queryCommandState("justifyLeft"));
    this.setActive(this.btnAlignC,    document.queryCommandState("justifyCenter"));
    this.setActive(this.btnAlignR,    document.queryCommandState("justifyRight"));

    const block = document.queryCommandValue("formatBlock").toLowerCase().replace(/[<>]/g, "");
    const knownValues = ["p", "h1", "h2", "h3"];
    this.formatSel.value = knownValues.includes(block) ? block : "p";

    const size = document.queryCommandValue("fontSize");
    if (size && ["1","2","3","4","5","6","7"].includes(size)) {
      this.fontSizeSel.value = size;
    }
  }

  private setActive(btn: HTMLButtonElement | undefined, active: boolean): void {
    if (!btn) return;
    btn.classList.toggle("fdi-editor__btn--active", active);
    btn.setAttribute("aria-pressed", String(active));
  }

  /* ──────────────────────────────── commands ─────────────────────────────── */

  private cmd(command: string, value?: string): void {
    this.editor.focus();
    this.restoreSelection();
    document.execCommand(command, false, value);
    this.saveSelection();
    this.syncFromEditor();
    this.updateToolbarState();
  }

  private insertLink(): void {
    this.saveSelection();
    const sel = window.getSelection()?.toString() ?? "";
    const url = window.prompt("URL del vínculo", "https://");
    if (!url) return;
    this.restoreSelection();

    const safe = this.normalizeUrl(url);
    if (!safe) { this.setWarning("El vínculo no es válido."); return; }

    if (!sel) {
      this.insertHtml(`<a href="${this.escapeAttr(safe)}">${this.escapeHtml(safe)}</a>`);
      return;
    }
    this.cmd("createLink", safe);
  }

  private clearFormatting(): void {
    this.editor.focus();
    document.execCommand("removeFormat", false);
    document.execCommand("unlink", false);
    this.syncFromEditor();
    this.updateToolbarState();
  }

  private insertHr(): void {
    this.insertHtml("<hr><p><br></p>");
  }

  private insertHtml(html: string): void {
    this.editor.focus();
    this.restoreSelection();
    document.execCommand("insertHTML", false, html);
    this.saveSelection();
    this.syncFromEditor();
  }

  /* ──────────────────────────────── event handlers ───────────────────────── */

  private readonly handleInput = (): void => { this.syncFromEditor(); };

  private readonly handlePaste = (event: ClipboardEvent): void => {
    const items = Array.from(event.clipboardData?.items ?? []);
    const imgItem = items.find((item) => item.type.startsWith("image/"));

    if (imgItem) {
      const file = imgItem.getAsFile();
      if (file) { event.preventDefault(); this.insertImageFile(file); }
      return;
    }

    // Strip external HTML formatting on paste — keep plain text
    const html = event.clipboardData?.getData("text/html");
    if (html) {
      event.preventDefault();
      const clean = this.sanitizeHtml(html);
      document.execCommand("insertHTML", false, clean);
      this.syncFromEditor();
      return;
    }

    window.setTimeout(() => this.syncFromEditor(), 0);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    // Tab inside table: move to next/prev cell
    if (event.key === "Tab" && this.isInTable()) {
      event.preventDefault();
      const td = this.getAncestor<HTMLTableCellElement>("TD") ?? this.getAncestor<HTMLTableCellElement>("TH");
      if (!td) return;
      const table = td.closest("table");
      if (!table) return;
      const cells = Array.from(table.querySelectorAll<HTMLElement>("th, td"));
      const idx   = cells.indexOf(td);
      const next  = cells[event.shiftKey ? idx - 1 : idx + 1];
      if (next) {
        next.focus();
        const range = document.createRange();
        range.selectNodeContents(next);
        range.collapse(false);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
      }
      return;
    }

    // Escape: close table dropdown
    if (event.key === "Escape" && this.tableMenuOpen) {
      this.closeTableMenu();
    }
  };

  private readonly handleFileSelected = (): void => {
    const file = this.fileInput.files?.[0];
    if (file) this.insertImageFile(file);
    this.fileInput.value = "";
  };

  private insertImageFile(file: File): void {
    if (!file.type.startsWith("image/")) { this.setWarning("Solo se permiten imágenes."); return; }
    const MAX_BYTES = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_BYTES) { this.setWarning("La imagen supera el límite de 2 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      this.insertHtml(`<img src="${this.escapeAttr(src)}" alt="${this.escapeAttr(file.name)}" style="max-width:100%">`);
      this.setStatus("Imagen insertada.");
    };
    reader.readAsDataURL(file);
  }

  private readonly handleEditorClick = (event: MouseEvent): void => {
    if (event.target instanceof HTMLImageElement) {
      this.selectImage(event.target);
      return;
    }
    this.clearImageSelection();
  };

  /* ──────────────────────────────── image resize ─────────────────────────── */

  private selectImage(image: HTMLImageElement): void {
    this.clearImageSelection();
    this.selectedImage = image;
    image.classList.add("fdi-editor__img--selected");

    this.resizeHandle = document.createElement("div");
    this.resizeHandle.className = "fdi-editor__resize-handle";
    this.resizeHandle.title = "Arrastrar para cambiar tamaño";
    this.resizeHandle.addEventListener("mousedown", this.startImageResize);
    // Append inside root to keep positioning within PCF container
    this.root.appendChild(this.resizeHandle);
    this.positionResizeHandle();
  }

  private clearImageSelection(): void {
    this.selectedImage?.classList.remove("fdi-editor__img--selected");
    if (this.resizeHandle) {
      this.resizeHandle.removeEventListener("mousedown", this.startImageResize);
      this.resizeHandle.remove();
      this.resizeHandle = undefined;
    }
    this.selectedImage = undefined;
  }

  private positionResizeHandle(): void {
    if (!this.selectedImage || !this.resizeHandle) return;
    const imgRect  = this.selectedImage.getBoundingClientRect();
    const rootRect = this.root.getBoundingClientRect();
    this.resizeHandle.style.left = `${imgRect.right  - rootRect.left - 6}px`;
    this.resizeHandle.style.top  = `${imgRect.bottom - rootRect.top  - 6}px`;
  }

  private readonly startImageResize = (event: MouseEvent): void => {
    if (!this.selectedImage) return;
    event.preventDefault();
    this.resizeState = {
      image:      this.selectedImage,
      startX:     event.clientX,
      startWidth: this.selectedImage.getBoundingClientRect().width
    };
    document.addEventListener("mousemove", this.handleImageResize);
    document.addEventListener("mouseup",   this.stopImageResize);
  };

  private readonly handleImageResize = (event: MouseEvent): void => {
    if (!this.resizeState) return;
    const w = Math.max(80, this.resizeState.startWidth + event.clientX - this.resizeState.startX);
    this.resizeState.image.style.width  = `${Math.round(w)}px`;
    this.resizeState.image.style.height = "auto";
    this.positionResizeHandle();
    this.syncFromEditor(false);
  };

  private readonly stopImageResize = (): void => {
    document.removeEventListener("mousemove", this.handleImageResize);
    document.removeEventListener("mouseup",   this.stopImageResize);
    this.resizeState = undefined;
    this.syncFromEditor();
  };

  /* ──────────────────────────────── sync / state ─────────────────────────── */

  private syncFromEditor(notify = true): void {
    this.html = this.sanitizeHtml(this.editor.innerHTML);
    this.updateCounters();
    this.setStatus("HTML listo para correo");
    if (notify) this.notifyOutputChanged();
  }

  private updateCounters(): void {
    const text  = this.editor.textContent ?? "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.counter.textContent = `${words} palabras / ${text.length} car.`;
  }

  /* ──────────────────────────────── sanitisation ─────────────────────────── */

  private sanitizeHtml(value: string): string {
    const template = document.createElement("template");
    template.innerHTML = value ?? "";
    const out = document.createElement("div");
    Array.from(template.content.childNodes).forEach((node) => {
      const clean = this.cleanNode(node);
      if (clean) out.appendChild(clean);
    });
    return out.innerHTML.trim();
  }

  private cleanNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent ?? "");
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    const el  = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    // Self-closing allowed tags
    if (tag === "HR") return document.createElement("hr");
    if (tag === "BR") return document.createElement("br");

    if (!this.allowedTags.has(tag)) {
      const frag = document.createDocumentFragment();
      Array.from(el.childNodes).forEach((child) => {
        const c = this.cleanNode(child);
        if (c) frag.appendChild(c);
      });
      return frag;
    }

    const out = document.createElement(tag.toLowerCase());
    this.copyAllowedAttributes(el, out, tag);

    if (tag === "IMG" && !out.hasAttribute("src")) return null;

    Array.from(el.childNodes).forEach((child) => {
      const c = this.cleanNode(child);
      if (c) out.appendChild(c);
    });
    return out;
  }

  private copyAllowedAttributes(source: HTMLElement, target: HTMLElement, tag: string): void {
    const style = this.sanitizeStyle(source.getAttribute("style") ?? "");
    if (style) target.setAttribute("style", style);

    if (tag === "A") {
      const href = this.normalizeUrl(source.getAttribute("href") ?? "", true);
      if (href) {
        target.setAttribute("href", href);
        target.setAttribute("target", "_blank");
        target.setAttribute("rel", "noopener noreferrer");
      }
    }

    if (tag === "IMG") {
      const src = source.getAttribute("src") ?? "";
      if (this.isSafeImage(src)) target.setAttribute("src", src);
      const alt = source.getAttribute("alt");
      if (alt) target.setAttribute("alt", alt);
      this.copyPosInt(source, target, "width");
      this.copyPosInt(source, target, "height");
    }

    if (tag === "TD" || tag === "TH") {
      this.copyPosInt(source, target, "colspan");
      this.copyPosInt(source, target, "rowspan");
    }

    if (tag === "FONT") {
      const color = source.getAttribute("color");
      if (color && /^#[0-9a-f]{3,6}$/i.test(color)) target.setAttribute("color", color);
      const size = source.getAttribute("size");
      if (size && /^[1-7]$/.test(size)) target.setAttribute("size", size);
    }
  }

  private copyPosInt(source: HTMLElement, target: HTMLElement, attr: string): void {
    const v = source.getAttribute(attr);
    if (v && /^\d{1,4}$/.test(v)) target.setAttribute(attr, v);
  }

  private sanitizeStyle(style: string): string {
    const allowed = new Set([
      "background-color", "border", "border-collapse", "border-top",
      "border-bottom", "border-left", "border-right",
      "color", "font-family", "font-size", "font-style", "font-weight",
      "height", "margin", "max-width", "min-width", "padding",
      "text-align", "text-decoration", "width", "vertical-align",
      "line-height", "letter-spacing", "display"
    ]);

    return style
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => {
        const sep  = p.indexOf(":");
        if (sep === -1) return "";
        const prop = p.slice(0, sep).trim().toLowerCase();
        const val  = p.slice(sep + 1).trim();
        if (!allowed.has(prop) || /url\s*\(|expression\s*\(|javascript:/i.test(val)) return "";
        return `${prop}: ${val}`;
      })
      .filter(Boolean)
      .join("; ");
  }

  /* ──────────────────────────────── helpers ──────────────────────────────── */

  private normalizeUrl(value: string, allowHash = false): string {
    const t = value.trim();
    if (!t || /^javascript:/i.test(t)) return "";
    if (allowHash && t.startsWith("#")) return t;
    if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
    if (!t.includes(":")) return `https://${t}`;
    return "";
  }

  private isSafeImage(value: string): boolean {
    return /^(https?:|data:image\/(?:png|jpeg|jpg|gif|webp);base64,)/i.test(value.trim());
  }

  private readonly saveSelection = (): void => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (this.editor.contains(sel.anchorNode)) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    }
  };

  private restoreSelection(): void {
    if (!this.savedRange) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(this.savedRange);
  }

  private setStatus(msg: string): void {
    this.status.className = "";
    this.status.textContent = msg;
  }

  private setWarning(msg: string): void {
    this.status.className = "fdi-editor__status--warn";
    this.status.textContent = msg;
  }

  private escapeHtml(v: string): string {
    const s = document.createElement("span");
    s.textContent = v;
    return s.innerHTML;
  }

  private escapeAttr(v: string): string {
    return this.escapeHtml(v).replace(/"/g, "&quot;");
  }
}
