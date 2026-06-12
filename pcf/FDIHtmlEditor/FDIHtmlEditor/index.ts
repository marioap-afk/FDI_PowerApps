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

type TableInsertSize = {
  rows: number;
  columns: number;
};

type TableActionPosition = "before" | "after";

export class HtmlEditor implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private root!: HTMLDivElement;
  private editor!: HTMLDivElement;
  private fileInput!: HTMLInputElement;
  private counter!: HTMLSpanElement;
  private status!: HTMLSpanElement;
  private linkPanel!: HTMLDivElement;
  private linkUrlInput!: HTMLInputElement;
  private linkTextInput!: HTMLInputElement;
  private tablePanel!: HTMLDivElement;
  private tablePickerLabel!: HTMLSpanElement;
  private tableContextBar!: HTMLDivElement;
  private resizeHandle?: HTMLDivElement;
  private selectedImage?: HTMLImageElement;
  private selectedTableCell?: HTMLTableCellElement;
  private resizeState?: ResizeState;
  private savedRange?: Range;
  private notifyOutputChanged!: () => void;
  private html = "";
  private defaultHtml = "";

  private readonly allowedTags = new Set([
    "A",
    "B",
    "BLOCKQUOTE",
    "BR",
    "DIV",
    "EM",
    "H1",
    "H2",
    "H3",
    "HR",
    "I",
    "IMG",
    "LI",
    "OL",
    "P",
    "S",
    "SPAN",
    "STRIKE",
    "STRONG",
    "SUB",
    "SUP",
    "TABLE",
    "TBODY",
    "TD",
    "TH",
    "THEAD",
    "TR",
    "U",
    "UL"
  ]);

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
    this.root.className = "fdi-html-editor";

    this.fileInput = document.createElement("input");
    this.fileInput.type = "file";
    this.fileInput.accept = "image/*";
    this.fileInput.hidden = true;
    this.fileInput.addEventListener("change", this.handleFileSelected);

    this.root.appendChild(this.buildToolbar());
    this.root.appendChild(this.buildTableContextBar());
    this.root.appendChild(this.buildBody());
    this.root.appendChild(this.buildFooter());
    this.root.appendChild(this.fileInput);
    container.appendChild(this.root);

    this.editor.innerHTML = this.html;
    this.updateCounters();
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    const nextDefault = context.parameters.DefaultHtml.raw ?? "";

    if (nextDefault === this.defaultHtml) {
      return;
    }

    this.defaultHtml = nextDefault;

    if (document.activeElement === this.editor) {
      return;
    }

    this.html = this.sanitizeHtml(nextDefault);
    this.editor.innerHTML = this.html;
    this.updateCounters();
  }

  public getOutputs(): IOutputs {
    return {
      HtmlText: this.html
    };
  }

  public destroy(): void {
    this.fileInput?.removeEventListener("change", this.handleFileSelected);
    this.editor?.removeEventListener("input", this.handleInput);
    this.editor?.removeEventListener("paste", this.handlePaste);
    this.editor?.removeEventListener("click", this.handleEditorClick);
    this.editor?.removeEventListener("keyup", this.handleEditorKeyUp);
    this.editor?.removeEventListener("mouseup", this.handleEditorMouseUp);
    document.removeEventListener("mousemove", this.handleImageResize);
    document.removeEventListener("mouseup", this.stopImageResize);
    this.resizeHandle?.remove();
  }

  private buildToolbar(): HTMLDivElement {
    const toolbar = document.createElement("div");
    toolbar.className = "fdi-html-editor__toolbar";

    toolbar.appendChild(this.buildGroup([this.buildFormatSelect()]));

    toolbar.appendChild(
      this.buildGroup([
        this.buildButton("undo", "Deshacer", () => this.runCommand("undo")),
        this.buildButton("redo", "Rehacer", () => this.runCommand("redo"))
      ])
    );

    toolbar.appendChild(
      this.buildGroup([
        this.buildButton("bold", "Negrita", () => this.runCommand("bold")),
        this.buildButton("italic", "Cursiva", () => this.runCommand("italic")),
        this.buildButton("underline", "Subrayado", () => this.runCommand("underline")),
        this.buildButton("strike", "Tachado", () => this.runCommand("strikeThrough"))
      ])
    );

    toolbar.appendChild(
      this.buildGroup([
        this.buildButton("align-left", "Alinear a la izquierda", () => this.runCommand("justifyLeft")),
        this.buildButton("align-center", "Centrar", () => this.runCommand("justifyCenter")),
        this.buildButton("align-right", "Alinear a la derecha", () => this.runCommand("justifyRight")),
        this.buildButton("align-justify", "Justificar", () => this.runCommand("justifyFull"))
      ])
    );

    toolbar.appendChild(
      this.buildGroup([
        this.buildButton("list", "Lista con vineta", () => this.runCommand("insertUnorderedList")),
        this.buildButton("list-ordered", "Lista numerada", () => this.runCommand("insertOrderedList")),
        this.buildButton("outdent", "Disminuir sangria", () => this.runCommand("outdent")),
        this.buildButton("indent", "Aumentar sangria", () => this.runCommand("indent"))
      ])
    );

    const linkGroup = this.buildPopupGroup(
      this.buildButton("link", "Insertar o editar vinculo", () => this.toggleLinkPanel()),
      this.buildLinkPanel()
    );
    toolbar.appendChild(linkGroup);

    const tableGroup = this.buildPopupGroup(
      this.buildButton("table", "Insertar tabla", () => this.toggleTablePanel()),
      this.buildTablePicker()
    );
    toolbar.appendChild(tableGroup);

    toolbar.appendChild(
      this.buildGroup([
        this.buildButton("image", "Insertar imagen", () => this.fileInput.click()),
        this.buildButton("horizontal-rule", "Insertar linea", () => this.insertHtml("<hr>")),
        this.buildButton("eraser", "Limpiar formato", () => this.clearFormatting())
      ])
    );

    return toolbar;
  }

  private buildBody(): HTMLDivElement {
    const body = document.createElement("div");
    body.className = "fdi-html-editor__body";

    this.editor = document.createElement("div");
    this.editor.className = "fdi-html-editor__editable";
    this.editor.contentEditable = "true";
    this.editor.spellcheck = true;
    this.editor.setAttribute("role", "textbox");
    this.editor.setAttribute("aria-multiline", "true");
    this.editor.addEventListener("input", this.handleInput);
    this.editor.addEventListener("paste", this.handlePaste);
    this.editor.addEventListener("click", this.handleEditorClick);
    this.editor.addEventListener("keyup", this.handleEditorKeyUp);
    this.editor.addEventListener("mouseup", this.handleEditorMouseUp);

    body.appendChild(this.editor);
    return body;
  }

  private buildFooter(): HTMLDivElement {
    const footer = document.createElement("div");
    footer.className = "fdi-html-editor__footer";

    this.counter = document.createElement("span");
    this.status = document.createElement("span");
    this.status.textContent = "HTML listo para correo";

    footer.appendChild(this.counter);
    footer.appendChild(this.status);
    return footer;
  }

  private buildGroup(children: HTMLElement[]): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "fdi-html-editor__group";
    children.forEach((child) => group.appendChild(child));
    return group;
  }

  private buildPopupGroup(button: HTMLButtonElement, panel: HTMLDivElement): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "fdi-html-editor__group fdi-html-editor__group--popup";
    group.appendChild(button);
    group.appendChild(panel);
    return group;
  }

  private buildButton(iconName: string, title: string, onClick: () => void, label?: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = label ? "fdi-html-editor__button fdi-html-editor__button--label" : "fdi-html-editor__button";
    button.innerHTML = this.getIcon(iconName);
    button.title = title;
    button.setAttribute("aria-label", title);

    if (label) {
      const text = document.createElement("span");
      text.textContent = label;
      button.appendChild(text);
    }

    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      onClick();
    });
    return button;
  }

  private buildFormatSelect(): HTMLSelectElement {
    const select = document.createElement("select");
    select.className = "fdi-html-editor__select";
    select.title = "Formato de parrafo";
    select.setAttribute("aria-label", "Formato de parrafo");

    [
      ["P", "Parrafo"],
      ["H1", "Titulo 1"],
      ["H2", "Titulo 2"],
      ["H3", "Titulo 3"],
      ["BLOCKQUOTE", "Cita"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      this.runCommand("formatBlock", select.value);
      select.value = "P";
    });

    return select;
  }

  private buildLinkPanel(): HTMLDivElement {
    this.linkPanel = document.createElement("div");
    this.linkPanel.className = "fdi-html-editor__popover";
    this.linkPanel.hidden = true;

    const title = document.createElement("div");
    title.className = "fdi-html-editor__popover-title";
    title.textContent = "Vinculo";

    this.linkTextInput = document.createElement("input");
    this.linkTextInput.className = "fdi-html-editor__input";
    this.linkTextInput.placeholder = "Texto visible";
    this.linkTextInput.type = "text";

    this.linkUrlInput = document.createElement("input");
    this.linkUrlInput.className = "fdi-html-editor__input";
    this.linkUrlInput.placeholder = "https://...";
    this.linkUrlInput.type = "url";

    const actions = document.createElement("div");
    actions.className = "fdi-html-editor__popover-actions";
    actions.appendChild(this.buildSmallButton("Aplicar", () => this.applyLink()));
    actions.appendChild(this.buildSmallButton("Quitar", () => this.removeLink()));

    this.linkPanel.appendChild(title);
    this.linkPanel.appendChild(this.linkTextInput);
    this.linkPanel.appendChild(this.linkUrlInput);
    this.linkPanel.appendChild(actions);
    return this.linkPanel;
  }

  private buildTablePicker(): HTMLDivElement {
    this.tablePanel = document.createElement("div");
    this.tablePanel.className = "fdi-html-editor__popover fdi-html-editor__table-picker";
    this.tablePanel.hidden = true;

    const title = document.createElement("div");
    title.className = "fdi-html-editor__popover-title";
    title.textContent = "Insertar tabla";

    this.tablePickerLabel = document.createElement("span");
    this.tablePickerLabel.className = "fdi-html-editor__table-picker-label";
    this.tablePickerLabel.textContent = "Selecciona tamano";

    const grid = document.createElement("div");
    grid.className = "fdi-html-editor__table-grid";

    for (let row = 1; row <= 8; row += 1) {
      for (let column = 1; column <= 8; column += 1) {
        const size = { rows: row, columns: column };
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "fdi-html-editor__table-grid-cell";
        cell.title = `${row} x ${column}`;
        cell.dataset.rows = String(row);
        cell.dataset.columns = String(column);
        cell.addEventListener("mouseenter", () => this.previewTableSize(size));
        cell.addEventListener("focus", () => this.previewTableSize(size));
        cell.addEventListener("mousedown", (event) => event.preventDefault());
        cell.addEventListener("click", (event) => {
          event.preventDefault();
          this.insertTable(size.rows, size.columns);
          this.hideTablePanel();
        });
        grid.appendChild(cell);
      }
    }

    this.tablePanel.appendChild(title);
    this.tablePanel.appendChild(this.tablePickerLabel);
    this.tablePanel.appendChild(grid);
    return this.tablePanel;
  }

  private buildTableContextBar(): HTMLDivElement {
    this.tableContextBar = document.createElement("div");
    this.tableContextBar.className = "fdi-html-editor__tablebar";
    this.tableContextBar.hidden = true;

    const label = document.createElement("span");
    label.className = "fdi-html-editor__tablebar-label";
    label.textContent = "Tabla";

    this.tableContextBar.appendChild(label);
    this.tableContextBar.appendChild(this.buildButton("row-before", "Insertar fila arriba", () => this.insertTableRow("before")));
    this.tableContextBar.appendChild(this.buildButton("row-after", "Insertar fila abajo", () => this.insertTableRow("after")));
    this.tableContextBar.appendChild(this.buildButton("column-before", "Insertar columna izquierda", () => this.insertTableColumn("before")));
    this.tableContextBar.appendChild(this.buildButton("column-after", "Insertar columna derecha", () => this.insertTableColumn("after")));
    this.tableContextBar.appendChild(this.buildButton("delete-row", "Eliminar fila", () => this.deleteTableRow()));
    this.tableContextBar.appendChild(this.buildButton("delete-column", "Eliminar columna", () => this.deleteTableColumn()));
    this.tableContextBar.appendChild(this.buildButton("header-row", "Alternar encabezado", () => this.toggleHeaderRow()));
    this.tableContextBar.appendChild(this.buildButton("delete-table", "Eliminar tabla", () => this.deleteTable()));
    return this.tableContextBar;
  }

  private buildSmallButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fdi-html-editor__small-button";
    button.textContent = label;
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", (event) => {
      event.preventDefault();
      onClick();
    });
    return button;
  }

  private runCommand(command: string, value?: string): void {
    this.editor.focus();
    this.restoreSelection();
    document.execCommand(command, false, value);
    this.saveSelection();
    this.syncFromEditor();
  }

  private toggleLinkPanel(): void {
    this.hideTablePanel();
    this.saveSelection();
    const anchor = this.getCurrentAnchor();
    this.linkTextInput.value = anchor?.textContent ?? window.getSelection()?.toString() ?? "";
    this.linkUrlInput.value = anchor?.getAttribute("href") ?? "";
    this.linkPanel.hidden = !this.linkPanel.hidden;

    if (!this.linkPanel.hidden) {
      this.linkUrlInput.focus();
    }
  }

  private applyLink(): void {
    const safeUrl = this.normalizeUrl(this.linkUrlInput.value);

    if (!safeUrl) {
      this.setWarning("El vinculo no es valido.");
      return;
    }

    this.restoreSelection();
    const anchor = this.getCurrentAnchor();

    if (anchor) {
      anchor.setAttribute("href", safeUrl);
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener noreferrer");

      if (this.linkTextInput.value.trim()) {
        anchor.textContent = this.linkTextInput.value.trim();
      }

      this.syncFromEditor();
      this.hideLinkPanel();
      return;
    }

    const label = this.linkTextInput.value.trim() || safeUrl;
    this.insertHtml(`<a href="${this.escapeAttribute(safeUrl)}">${this.escapeHtml(label)}</a>`);
    this.hideLinkPanel();
  }

  private removeLink(): void {
    this.restoreSelection();
    const anchor = this.getCurrentAnchor();

    if (anchor) {
      const text = document.createTextNode(anchor.textContent ?? "");
      anchor.replaceWith(text);
      this.syncFromEditor();
      this.hideLinkPanel();
      return;
    }

    this.runCommand("unlink");
    this.hideLinkPanel();
  }

  private hideLinkPanel(): void {
    this.linkPanel.hidden = true;
  }

  private toggleTablePanel(): void {
    this.hideLinkPanel();
    this.saveSelection();
    this.tablePanel.hidden = !this.tablePanel.hidden;
    this.previewTableSize({ rows: 0, columns: 0 });
  }

  private hideTablePanel(): void {
    this.tablePanel.hidden = true;
  }

  private previewTableSize(size: TableInsertSize): void {
    const cells = Array.from(this.tablePanel.querySelectorAll<HTMLButtonElement>(".fdi-html-editor__table-grid-cell"));

    cells.forEach((cell) => {
      const rows = Number.parseInt(cell.dataset.rows ?? "0", 10);
      const columns = Number.parseInt(cell.dataset.columns ?? "0", 10);
      cell.classList.toggle("fdi-html-editor__table-grid-cell--active", rows <= size.rows && columns <= size.columns);
    });

    this.tablePickerLabel.textContent = size.rows && size.columns ? `${size.rows} x ${size.columns}` : "Selecciona tamano";
  }

  private insertTable(rows: number, columns: number): void {
    const safeRows = this.clampNumber(String(rows), 1, 12, 3);
    const safeColumns = this.clampNumber(String(columns), 1, 8, 3);
    let html = '<table><thead><tr>';

    for (let column = 0; column < safeColumns; column += 1) {
      html += "<th>&nbsp;</th>";
    }

    html += "</tr></thead><tbody>";

    for (let row = 1; row < safeRows; row += 1) {
      html += "<tr>";
      for (let column = 0; column < safeColumns; column += 1) {
        html += "<td>&nbsp;</td>";
      }
      html += "</tr>";
    }

    html += "</tbody></table><p><br></p>";
    this.insertHtml(html);
    this.setStatus(`Tabla ${safeRows} x ${safeColumns} insertada.`);
  }

  private insertTableRow(position: TableActionPosition): void {
    const cell = this.getActiveTableCell();

    if (!cell) {
      this.setWarning("Selecciona una celda de la tabla.");
      return;
    }

    const row = cell.parentElement as HTMLTableRowElement;
    const section = row.parentElement;

    if (!section) {
      return;
    }

    const newRow = document.createElement("tr");
    const isHeaderRow = section.tagName.toUpperCase() === "THEAD";

    for (let index = 0; index < row.cells.length; index += 1) {
      newRow.appendChild(this.createTableCell(isHeaderRow));
    }

    section.insertBefore(newRow, position === "before" ? row : row.nextElementSibling);
    this.selectTableCell(newRow.cells[Math.min(cell.cellIndex, newRow.cells.length - 1)]);
    this.syncFromEditor();
  }

  private insertTableColumn(position: TableActionPosition): void {
    const cell = this.getActiveTableCell();
    const table = cell?.closest("table");

    if (!cell || !(table instanceof HTMLTableElement)) {
      this.setWarning("Selecciona una celda de la tabla.");
      return;
    }

    const sourceIndex = cell.cellIndex;
    const targetIndex = position === "before" ? sourceIndex : sourceIndex + 1;

    Array.from(table.rows).forEach((row) => {
      const sourceCell = row.cells[Math.min(sourceIndex, row.cells.length - 1)];
      const isHeader = sourceCell?.tagName.toUpperCase() === "TH" || row.parentElement?.tagName.toUpperCase() === "THEAD";
      const newCell = this.createTableCell(isHeader);
      row.insertBefore(newCell, row.cells[targetIndex] ?? null);
    });

    const selectedRow = cell.parentElement as HTMLTableRowElement;
    this.selectTableCell(selectedRow.cells[targetIndex]);
    this.syncFromEditor();
  }

  private deleteTableRow(): void {
    const cell = this.getActiveTableCell();
    const table = cell?.closest("table");

    if (!cell || !(table instanceof HTMLTableElement)) {
      this.setWarning("Selecciona una celda de la tabla.");
      return;
    }

    if (table.rows.length <= 1) {
      this.setWarning("La tabla debe conservar al menos una fila.");
      return;
    }

    const row = cell.parentElement as HTMLTableRowElement;
    const nextRow = row.nextElementSibling instanceof HTMLTableRowElement ? row.nextElementSibling : table.rows[row.rowIndex - 1];
    row.remove();

    if (nextRow?.cells.length) {
      this.selectTableCell(nextRow.cells[Math.min(cell.cellIndex, nextRow.cells.length - 1)]);
    }

    this.syncFromEditor();
  }

  private deleteTableColumn(): void {
    const cell = this.getActiveTableCell();
    const table = cell?.closest("table");

    if (!cell || !(table instanceof HTMLTableElement)) {
      this.setWarning("Selecciona una celda de la tabla.");
      return;
    }

    const columnCount = Math.max(...Array.from(table.rows).map((row) => row.cells.length));

    if (columnCount <= 1) {
      this.setWarning("La tabla debe conservar al menos una columna.");
      return;
    }

    const columnIndex = cell.cellIndex;

    Array.from(table.rows).forEach((row) => {
      row.cells[columnIndex]?.remove();
    });

    const row = table.rows[Math.min(cell.parentElement instanceof HTMLTableRowElement ? cell.parentElement.rowIndex : 0, table.rows.length - 1)];
    const nextIndex = Math.min(columnIndex, row.cells.length - 1);

    if (row?.cells[nextIndex]) {
      this.selectTableCell(row.cells[nextIndex]);
    }

    this.syncFromEditor();
  }

  private toggleHeaderRow(): void {
    const cell = this.getActiveTableCell();
    const table = cell?.closest("table");

    if (!cell || !(table instanceof HTMLTableElement) || table.rows.length === 0) {
      this.setWarning("Selecciona una celda de la tabla.");
      return;
    }

    const firstRow = table.rows[0];
    const currentlyHeader = Array.from(firstRow.cells).every((rowCell) => rowCell.tagName.toUpperCase() === "TH");
    Array.from(firstRow.cells).forEach((rowCell) => this.replaceCellTag(rowCell, currentlyHeader ? "td" : "th"));
    this.syncFromEditor();
    this.setStatus(currentlyHeader ? "Encabezado de tabla desactivado." : "Encabezado de tabla activado.");
  }

  private deleteTable(): void {
    const cell = this.getActiveTableCell();
    const table = cell?.closest("table");

    if (!cell || !(table instanceof HTMLTableElement)) {
      this.setWarning("Selecciona una celda de la tabla.");
      return;
    }

    table.remove();
    this.clearTableSelection();
    this.syncFromEditor();
    this.setStatus("Tabla eliminada.");
  }

  private createTableCell(isHeader: boolean): HTMLTableCellElement {
    const cell = document.createElement(isHeader ? "th" : "td") as HTMLTableCellElement;
    cell.innerHTML = "&nbsp;";
    return cell;
  }

  private replaceCellTag(cell: HTMLTableCellElement, tagName: "td" | "th"): HTMLTableCellElement {
    const replacement = document.createElement(tagName) as HTMLTableCellElement;
    replacement.innerHTML = cell.innerHTML || "&nbsp;";
    replacement.colSpan = cell.colSpan;
    replacement.rowSpan = cell.rowSpan;
    cell.replaceWith(replacement);

    if (cell === this.selectedTableCell) {
      this.selectTableCell(replacement);
    }

    return replacement;
  }

  private clearFormatting(): void {
    this.editor.focus();
    document.execCommand("removeFormat", false);
    document.execCommand("unlink", false);
    this.syncFromEditor();
  }

  private insertHtml(html: string): void {
    this.editor.focus();
    this.restoreSelection();
    document.execCommand("insertHTML", false, html);
    this.saveSelection();
    this.syncFromEditor();
  }

  private readonly handleInput = (): void => {
    this.syncFromEditor();
  };

  private readonly handlePaste = (event: ClipboardEvent): void => {
    const items = Array.from(event.clipboardData?.items ?? []);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (!imageItem) {
      window.setTimeout(() => this.syncFromEditor(), 0);
      return;
    }

    const imageFile = imageItem.getAsFile();

    if (!imageFile) {
      return;
    }

    event.preventDefault();
    this.insertImageFile(imageFile);
  };

  private readonly handleFileSelected = (): void => {
    const imageFile = this.fileInput.files?.[0];

    if (imageFile) {
      this.insertImageFile(imageFile);
    }

    this.fileInput.value = "";
  };

  private insertImageFile(imageFile: File): void {
    if (!imageFile.type.startsWith("image/")) {
      this.setWarning("Solo se permiten imagenes.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === "string" ? reader.result : "";
      this.insertHtml(`<img src="${this.escapeAttribute(src)}" alt="${this.escapeAttribute(imageFile.name)}">`);
      this.setStatus("Imagen insertada.");
    };
    reader.readAsDataURL(imageFile);
  }

  private readonly handleEditorClick = (event: MouseEvent): void => {
    const target = event.target;

    if (!(target instanceof HTMLElement)) {
      return;
    }

    const tableCell = target.closest("td,th");

    if (tableCell instanceof HTMLTableCellElement && this.editor.contains(tableCell)) {
      this.clearImageSelection();
      this.selectTableCell(tableCell);
      this.saveSelection();
      return;
    }

    if (target instanceof HTMLImageElement) {
      this.clearTableSelection();
      this.selectImage(target);
      return;
    }

    this.clearImageSelection();
    this.clearTableSelection();
    this.saveSelection();
  };

  private readonly handleEditorMouseUp = (): void => {
    this.saveSelection();
    this.updateTableSelectionFromRange();
  };

  private readonly handleEditorKeyUp = (): void => {
    this.saveSelection();
    this.updateTableSelectionFromRange();
  };

  private selectImage(image: HTMLImageElement): void {
    this.clearImageSelection();
    this.selectedImage = image;
    image.classList.add("fdi-html-editor__image-selected");

    this.resizeHandle = document.createElement("div");
    this.resizeHandle.className = "fdi-html-editor__resize-handle";
    this.resizeHandle.title = "Arrastrar para cambiar tamano";
    this.resizeHandle.addEventListener("mousedown", this.startImageResize);
    document.body.appendChild(this.resizeHandle);
    this.positionResizeHandle();
  }

  private clearImageSelection(): void {
    this.selectedImage?.classList.remove("fdi-html-editor__image-selected");

    if (this.resizeHandle) {
      this.resizeHandle.removeEventListener("mousedown", this.startImageResize);
      this.resizeHandle.remove();
      this.resizeHandle = undefined;
    }

    this.selectedImage = undefined;
  }

  private positionResizeHandle(): void {
    if (!this.selectedImage || !this.resizeHandle) {
      return;
    }

    const rect = this.selectedImage.getBoundingClientRect();
    this.resizeHandle.style.left = `${rect.right - 6}px`;
    this.resizeHandle.style.top = `${rect.bottom - 6}px`;
  }

  private readonly startImageResize = (event: MouseEvent): void => {
    if (!this.selectedImage) {
      return;
    }

    event.preventDefault();
    this.resizeState = {
      image: this.selectedImage,
      startX: event.clientX,
      startWidth: this.selectedImage.getBoundingClientRect().width
    };
    document.addEventListener("mousemove", this.handleImageResize);
    document.addEventListener("mouseup", this.stopImageResize);
  };

  private readonly handleImageResize = (event: MouseEvent): void => {
    if (!this.resizeState) {
      return;
    }

    const nextWidth = Math.max(80, this.resizeState.startWidth + event.clientX - this.resizeState.startX);
    this.resizeState.image.style.width = `${Math.round(nextWidth)}px`;
    this.resizeState.image.style.height = "auto";
    this.positionResizeHandle();
    this.syncFromEditor(false);
  };

  private readonly stopImageResize = (): void => {
    document.removeEventListener("mousemove", this.handleImageResize);
    document.removeEventListener("mouseup", this.stopImageResize);
    this.resizeState = undefined;
    this.syncFromEditor();
  };

  private selectTableCell(cell: HTMLTableCellElement): void {
    this.selectedTableCell?.classList.remove("fdi-html-editor__cell-selected");
    this.selectedTableCell = cell;
    this.selectedTableCell.classList.add("fdi-html-editor__cell-selected");
    this.tableContextBar.hidden = false;
  }

  private clearTableSelection(): void {
    this.selectedTableCell?.classList.remove("fdi-html-editor__cell-selected");
    this.selectedTableCell = undefined;
    this.tableContextBar.hidden = true;
  }

  private getActiveTableCell(): HTMLTableCellElement | undefined {
    if (this.selectedTableCell && this.editor.contains(this.selectedTableCell)) {
      return this.selectedTableCell;
    }

    const element = this.getSelectionElement();
    const cell = element?.closest("td,th");
    return cell instanceof HTMLTableCellElement && this.editor.contains(cell) ? cell : undefined;
  }

  private updateTableSelectionFromRange(): void {
    const cell = this.getActiveTableCell();

    if (cell) {
      this.selectTableCell(cell);
      return;
    }

    this.clearTableSelection();
  }

  private getCurrentAnchor(): HTMLAnchorElement | undefined {
    const element = this.getSelectionElement();
    const anchor = element?.closest("a");
    return anchor instanceof HTMLAnchorElement && this.editor.contains(anchor) ? anchor : undefined;
  }

  private getSelectionElement(): Element | undefined {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return undefined;
    }

    const node = selection.anchorNode;

    if (!node) {
      return undefined;
    }

    return node instanceof Element ? node : node.parentElement ?? undefined;
  }

  private syncFromEditor(notify = true): void {
    this.html = this.sanitizeHtml(this.editor.innerHTML);
    this.updateCounters();
    this.setStatus("HTML listo para correo");

    if (notify) {
      this.notifyOutputChanged();
    }
  }

  private updateCounters(): void {
    const text = this.editor.textContent ?? "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    this.counter.textContent = `${words} palabras / ${text.length} caracteres`;
  }

  private sanitizeHtml(value: string): string {
    const template = document.createElement("template");
    template.innerHTML = value ?? "";
    const output = document.createElement("div");

    Array.from(template.content.childNodes).forEach((node) => {
      const cleanNode = this.cleanNode(node);

      if (cleanNode) {
        output.appendChild(cleanNode);
      }
    });

    return output.innerHTML.trim();
  }

  private cleanNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) {
      return document.createTextNode(node.textContent ?? "");
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const element = node as HTMLElement;
    const tag = element.tagName.toUpperCase();

    if (!this.allowedTags.has(tag)) {
      const fragment = document.createDocumentFragment();
      Array.from(element.childNodes).forEach((child) => {
        const cleanChild = this.cleanNode(child);

        if (cleanChild) {
          fragment.appendChild(cleanChild);
        }
      });
      return fragment;
    }

    const cleanElement = document.createElement(tag.toLowerCase());
    this.copyAllowedAttributes(element, cleanElement, tag);

    if (tag === "IMG" && !cleanElement.hasAttribute("src")) {
      return null;
    }

    Array.from(element.childNodes).forEach((child) => {
      const cleanChild = this.cleanNode(child);

      if (cleanChild) {
        cleanElement.appendChild(cleanChild);
      }
    });

    return cleanElement;
  }

  private copyAllowedAttributes(source: HTMLElement, target: HTMLElement, tag: string): void {
    const style = this.sanitizeStyle(source.getAttribute("style") ?? "");

    if (style) {
      target.setAttribute("style", style);
    }

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

      if (this.isSafeImageSource(src)) {
        target.setAttribute("src", src);
      }

      const alt = source.getAttribute("alt");

      if (alt) {
        target.setAttribute("alt", alt);
      }

      this.copyPositiveIntegerAttribute(source, target, "width");
      this.copyPositiveIntegerAttribute(source, target, "height");
    }

    if (tag === "TD" || tag === "TH") {
      this.copyPositiveIntegerAttribute(source, target, "colspan");
      this.copyPositiveIntegerAttribute(source, target, "rowspan");
    }
  }

  private copyPositiveIntegerAttribute(source: HTMLElement, target: HTMLElement, attribute: string): void {
    const value = source.getAttribute(attribute);

    if (value && /^\d{1,4}$/.test(value)) {
      target.setAttribute(attribute, value);
    }
  }

  private sanitizeStyle(style: string): string {
    const allowedProperties = new Set([
      "background-color",
      "border",
      "border-bottom",
      "border-color",
      "border-collapse",
      "border-left",
      "border-right",
      "border-style",
      "border-top",
      "border-width",
      "color",
      "font-style",
      "font-weight",
      "height",
      "margin",
      "max-width",
      "padding",
      "text-align",
      "text-decoration",
      "vertical-align",
      "width"
    ]);

    return style
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const separatorIndex = part.indexOf(":");

        if (separatorIndex === -1) {
          return "";
        }

        const property = part.slice(0, separatorIndex).trim().toLowerCase();
        const value = part.slice(separatorIndex + 1).trim();

        if (!allowedProperties.has(property) || /url\s*\(|expression\s*\(|javascript:/i.test(value)) {
          return "";
        }

        return `${property}: ${value}`;
      })
      .filter(Boolean)
      .join("; ");
  }

  private normalizeUrl(value: string, allowHash = false): string {
    const trimmed = value.trim();

    if (!trimmed || /^javascript:/i.test(trimmed)) {
      return "";
    }

    if (allowHash && trimmed.startsWith("#")) {
      return trimmed;
    }

    if (/^(https?:|mailto:|tel:)/i.test(trimmed)) {
      return trimmed;
    }

    if (!trimmed.includes(":")) {
      return `https://${trimmed}`;
    }

    return "";
  }

  private isSafeImageSource(value: string): boolean {
    return /^(https?:|data:image\/(?:png|jpeg|jpg|gif|webp);base64,)/i.test(value.trim());
  }

  private readonly saveSelection = (): void => {
    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0) {
      return;
    }

    const anchor = selection.anchorNode;

    if (anchor && this.editor.contains(anchor)) {
      this.savedRange = selection.getRangeAt(0).cloneRange();
    }
  };

  private restoreSelection(): void {
    if (!this.savedRange) {
      return;
    }

    const selection = window.getSelection();

    if (!selection) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(this.savedRange);
  }

  private clampNumber(value: string | null, min: number, max: number, fallback: number): number {
    const parsed = Number.parseInt(value ?? "", 10);

    if (Number.isNaN(parsed)) {
      return fallback;
    }

    return Math.min(max, Math.max(min, parsed));
  }

  private setStatus(message: string): void {
    this.status.className = "";
    this.status.textContent = message;
  }

  private setWarning(message: string): void {
    this.status.className = "fdi-html-editor__status--warning";
    this.status.textContent = message;
  }

  private escapeHtml(value: string): string {
    const span = document.createElement("span");
    span.textContent = value;
    return span.innerHTML;
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value).replace(/"/g, "&quot;");
  }

  private getIcon(name: string): string {
    const icons: Record<string, string> = {
      "align-center": '<line x1="6" y1="6" x2="18" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="7" y1="18" x2="17" y2="18"/>',
      "align-justify": '<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>',
      "align-left": '<line x1="4" y1="6" x2="18" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="14" y2="18"/>',
      "align-right": '<line x1="6" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/>',
      bold: '<path d="M7 5h6a3 3 0 0 1 0 6H7z"/><path d="M7 11h7a4 4 0 0 1 0 8H7z"/>',
      "column-after": '<rect x="4" y="5" width="10" height="14"/><line x1="9" y1="5" x2="9" y2="19"/><path d="M18 8v8"/><path d="M15 12h6"/>',
      "column-before": '<rect x="10" y="5" width="10" height="14"/><line x1="15" y1="5" x2="15" y2="19"/><path d="M6 8v8"/><path d="M3 12h6"/>',
      "delete-column": '<rect x="5" y="5" width="14" height="14"/><line x1="12" y1="5" x2="12" y2="19"/><path d="M8 2l8 20"/><path d="M16 2L8 22"/>',
      "delete-row": '<rect x="5" y="5" width="14" height="14"/><line x1="5" y1="12" x2="19" y2="12"/><path d="M8 2l8 20"/><path d="M16 2L8 22"/>',
      "delete-table": '<rect x="4" y="5" width="16" height="14"/><line x1="4" y1="10" x2="20" y2="10"/><line x1="9" y1="5" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="19"/><path d="M8 2l8 20"/><path d="M16 2L8 22"/>',
      eraser: '<path d="M4 15l8-8 7 7-5 5H8z"/><path d="M13 18h7"/><path d="M9 11l4 4"/>',
      "header-row": '<rect x="4" y="5" width="16" height="14"/><path d="M4 10h16"/><path d="M9 5v14"/><path d="M15 5v14"/>',
      "horizontal-rule": '<line x1="5" y1="12" x2="19" y2="12"/>',
      image: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M5 18l5-5 3 3 2-2 4 4"/>',
      indent: '<path d="M4 6h16"/><path d="M12 12h8"/><path d="M4 18h16"/><path d="M4 10l4 2-4 2z"/>',
      italic: '<path d="M10 5h7"/><path d="M7 19h7"/><path d="M14 5l-4 14"/>',
      link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
      list: '<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="5" cy="6" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="18" r="1"/>',
      "list-ordered": '<line x1="10" y1="6" x2="20" y2="6"/><line x1="10" y1="12" x2="20" y2="12"/><line x1="10" y1="18" x2="20" y2="18"/><path d="M4 5h1v3"/><path d="M4 11h2l-2 3h2"/><path d="M4 17h2v3H4"/>',
      outdent: '<path d="M4 6h16"/><path d="M12 12h8"/><path d="M4 18h16"/><path d="M8 10l-4 2 4 2z"/>',
      redo: '<path d="M20 7v6h-6"/><path d="M20 13a8 8 0 1 0-2.3 5.7"/>',
      "row-after": '<rect x="5" y="4" width="14" height="10"/><line x1="5" y1="9" x2="19" y2="9"/><path d="M8 19h8"/><path d="M12 15v8"/>',
      "row-before": '<rect x="5" y="10" width="14" height="10"/><line x1="5" y1="15" x2="19" y2="15"/><path d="M8 5h8"/><path d="M12 1v8"/>',
      strike: '<path d="M6 12h12"/><path d="M16 6a4 4 0 0 0-4-2c-3 0-5 1.5-5 4 0 1 .5 2 1.6 2.7"/><path d="M9 18a6 6 0 0 0 4 1c3 0 5-1.5 5-4 0-1-.4-1.8-1.2-2.4"/>',
      table: '<rect x="4" y="5" width="16" height="14"/><path d="M4 10h16"/><path d="M9 5v14"/><path d="M15 5v14"/>',
      underline: '<path d="M7 5v6a5 5 0 0 0 10 0V5"/><path d="M6 21h12"/>',
      undo: '<path d="M4 7v6h6"/><path d="M4 13a8 8 0 1 1 2.3 5.7"/>'
    };

    return `<svg class="fdi-html-editor__icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] ?? ""}</svg>`;
  }
}
