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
    "I",
    "IMG",
    "LI",
    "OL",
    "P",
    "SPAN",
    "STRONG",
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
    this.editor?.removeEventListener("keyup", this.saveSelection);
    this.editor?.removeEventListener("mouseup", this.saveSelection);
    document.removeEventListener("mousemove", this.handleImageResize);
    document.removeEventListener("mouseup", this.stopImageResize);
    this.resizeHandle?.remove();
  }

  private buildToolbar(): HTMLDivElement {
    const toolbar = document.createElement("div");
    toolbar.className = "fdi-html-editor__toolbar";

    toolbar.appendChild(
      this.buildGroup([
        this.buildButton("B", "Negrita", () => this.runCommand("bold")),
        this.buildButton("I", "Cursiva", () => this.runCommand("italic")),
        this.buildButton("U", "Subrayado", () => this.runCommand("underline"))
      ])
    );

    toolbar.appendChild(
      this.buildGroup([
        this.buildButton("Izq", "Alinear a la izquierda", () => this.runCommand("justifyLeft")),
        this.buildButton("Cen", "Centrar", () => this.runCommand("justifyCenter")),
        this.buildButton("Der", "Alinear a la derecha", () => this.runCommand("justifyRight"))
      ])
    );

    toolbar.appendChild(
      this.buildGroup([
        this.buildButton("•", "Lista con vineta", () => this.runCommand("insertUnorderedList")),
        this.buildButton("1.", "Lista numerada", () => this.runCommand("insertOrderedList"))
      ])
    );

    toolbar.appendChild(
      this.buildGroup([
        this.buildButton("Link", "Insertar vinculo", () => this.insertLink(), true),
        this.buildButton("Tabla", "Insertar tabla", () => this.insertTable(), true),
        this.buildButton("Img", "Insertar imagen", () => this.fileInput.click(), true),
        this.buildButton("Limpiar", "Limpiar formato", () => this.clearFormatting(), true)
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
    this.editor.addEventListener("keyup", this.saveSelection);
    this.editor.addEventListener("mouseup", this.saveSelection);

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

  private buildGroup(buttons: HTMLButtonElement[]): HTMLDivElement {
    const group = document.createElement("div");
    group.className = "fdi-html-editor__group";
    buttons.forEach((button) => group.appendChild(button));
    return group;
  }

  private buildButton(label: string, title: string, onClick: () => void, wide = false): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = wide ? "fdi-html-editor__button fdi-html-editor__button--wide" : "fdi-html-editor__button";
    button.textContent = label;
    button.title = title;
    button.setAttribute("aria-label", title);
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

  private insertLink(): void {
    const currentSelection = window.getSelection()?.toString() ?? "";
    const url = window.prompt("URL del vinculo", "");

    if (!url) {
      return;
    }

    const safeUrl = this.normalizeUrl(url);

    if (!safeUrl) {
      this.setWarning("El vinculo no es valido.");
      return;
    }

    if (!currentSelection) {
      this.insertHtml(`<a href="${this.escapeAttribute(safeUrl)}">${this.escapeHtml(safeUrl)}</a>`);
      return;
    }

    this.runCommand("createLink", safeUrl);
  }

  private insertTable(): void {
    const rows = this.clampNumber(window.prompt("Filas", "3"), 1, 12, 3);
    const columns = this.clampNumber(window.prompt("Columnas", "3"), 1, 8, 3);
    let html = '<table><tbody>';

    for (let row = 0; row < rows; row += 1) {
      html += "<tr>";
      for (let column = 0; column < columns; column += 1) {
        html += row === 0 ? "<th>&nbsp;</th>" : "<td>&nbsp;</td>";
      }
      html += "</tr>";
    }

    html += "</tbody></table><p><br></p>";
    this.insertHtml(html);
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

    if (target instanceof HTMLImageElement) {
      this.selectImage(target);
      return;
    }

    this.clearImageSelection();
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
      "border-collapse",
      "color",
      "font-style",
      "font-weight",
      "height",
      "margin",
      "max-width",
      "padding",
      "text-align",
      "text-decoration",
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
}
