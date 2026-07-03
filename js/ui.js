/**
 * @fileoverview NexusFlow UI Module
 * Renders all UI components for the NexusFlow Sovereign Form Architect:
 *   - Component Fabricator (left panel, drag source)
 *   - Hydration Canvas question blocks (center)
 *   - Logic Controller (right panel)
 *   - Respondent Mode (form preview / fill)
 *   - Audio Engine (Web Audio API synth sounds)
 *   - Toast Notification system
 *
 * @module ui
 */

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

/**
 * All supported question types with metadata.
 * @type {Array<{type: string, label: string, icon: string, desc: string}>}
 */
const QUESTION_TYPES = [
  { type: 'short-answer', label: 'Short Answer', icon: '⌨', desc: 'Single line text input' },
  { type: 'paragraph',    label: 'Paragraph',    icon: '📝', desc: 'Multi-line text response' },
  { type: 'multiple-choice', label: 'Multiple Choice', icon: '◉', desc: 'Select one option' },
  { type: 'checkbox',     label: 'Checkboxes',   icon: '☑', desc: 'Select multiple options' },
  { type: 'dropdown',     label: 'Dropdown',      icon: '▾', desc: 'Choose from a list' },
  { type: 'file-upload',  label: 'File Upload',   icon: '⬆', desc: 'Upload attachment' },
  { type: 'date',         label: 'Date',          icon: '📅', desc: 'Date selector' },
  { type: 'scale',        label: 'Linear Scale',  icon: '◈', desc: 'Rating scale 1-10' },
];

/** Map type string → QUESTION_TYPES entry for O(1) lookups */
const TYPE_MAP = Object.freeze(
  QUESTION_TYPES.reduce((m, qt) => { m[qt.type] = qt; return m; }, {})
);

/** Toast icon map */
const TOAST_ICONS = { info: 'ℹ', success: '✓', error: '✗' };

// ─────────────────────────────────────────────
// Audio Engine
// ─────────────────────────────────────────────

/**
 * Synthesizes short UI sound effects via Web Audio API.
 * Lazy-initialises the AudioContext on first user interaction.
 */
class AudioEngine {
  constructor() {
    /** @type {AudioContext|null} */
    this.ctx = null;
    /** @type {boolean} */
    this.enabled = true;
    /** @type {number} last hover timestamp for debounce */
    this._lastHover = 0;
  }

  /** Create the AudioContext (call once after a user gesture). */
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {
      this.enabled = false;
    }
  }

  /**
   * Play a named sound effect.
   * @param {'click'|'drop'|'error'|'success'|'hover'} type
   */
  play(type) {
    if (!this.enabled) return;
    // Lazy init on first audible interaction
    if (!this.ctx) this.init();
    if (!this.ctx) return;

    switch (type) {
      case 'click':   this._playClick(); break;
      case 'drop':    this._playDrop(); break;
      case 'error':   this._playError(); break;
      case 'success': this._playSuccess(); break;
      case 'hover':   this._playHover(); break;
    }
  }

  /* ── Individual synth recipes ───────────────── */

  /** Short high-freq tick */
  _playClick() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  /** Medium bass thump + sparkle overlay */
  _playDrop() {
    const t = this.ctx.currentTime;

    // Bass thump
    const bass = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bass.type = 'sine';
    bass.frequency.setValueAtTime(150, t);
    bass.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    bassGain.gain.setValueAtTime(0.12, t);
    bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    bass.connect(bassGain).connect(this.ctx.destination);
    bass.start(t);
    bass.stop(t + 0.15);

    // High sparkle
    const sparkle = this.ctx.createOscillator();
    const spkGain = this.ctx.createGain();
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(2000, t);
    sparkle.frequency.exponentialRampToValueAtTime(3000, t + 0.05);
    spkGain.gain.setValueAtTime(0.04, t);
    spkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    sparkle.connect(spkGain).connect(this.ctx.destination);
    sparkle.start(t);
    sparkle.stop(t + 0.05);
  }

  /** Low sawtooth buzz with gain wobble */
  _playError() {
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, t);
    gain.gain.setValueAtTime(0.1, t);
    // wobble
    gain.gain.linearRampToValueAtTime(0.04, t + 0.05);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.1);
    gain.gain.linearRampToValueAtTime(0.04, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  /** Ascending dual-tone sweep */
  _playSuccess() {
    const t = this.ctx.currentTime;

    const lo = this.ctx.createOscillator();
    const loG = this.ctx.createGain();
    lo.type = 'sine';
    lo.frequency.setValueAtTime(500, t);
    lo.frequency.exponentialRampToValueAtTime(800, t + 0.2);
    loG.gain.setValueAtTime(0.08, t);
    loG.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    lo.connect(loG).connect(this.ctx.destination);
    lo.start(t);
    lo.stop(t + 0.2);

    const hi = this.ctx.createOscillator();
    const hiG = this.ctx.createGain();
    hi.type = 'sine';
    hi.frequency.setValueAtTime(700, t + 0.05);
    hi.frequency.exponentialRampToValueAtTime(1100, t + 0.2);
    hiG.gain.setValueAtTime(0.05, t + 0.05);
    hiG.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    hi.connect(hiG).connect(this.ctx.destination);
    hi.start(t + 0.05);
    hi.stop(t + 0.22);
  }

  /** Very subtle, barely-audible tick for hover */
  _playHover() {
    const now = performance.now();
    if (now - this._lastHover < 80) return;   // debounce 80 ms
    this._lastHover = now;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    gain.gain.setValueAtTime(0.025, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.015);
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * Pad a number to two digits: 1 → "01".
 * @param {number} n
 * @returns {string}
 */
function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Create a DOM element with optional className and textContent.
 * @param {string} tag
 * @param {string} [className]
 * @param {string} [text]
 * @returns {HTMLElement}
 */
function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

/**
 * Determine whether a question type has user-editable options.
 * @param {string} type
 * @returns {boolean}
 */
function hasOptions(type) {
  return ['multiple-choice', 'checkbox', 'dropdown'].includes(type);
}

// ─────────────────────────────────────────────
// NexusFlowUI
// ─────────────────────────────────────────────

/**
 * Main UI class for the NexusFlow form builder.
 * All rendering, interaction logic, audio, and toast notifications
 * are encapsulated here.
 *
 * Communication with the data layer happens through an EventTarget bus.
 */
class NexusFlowUI {
  /**
   * @param {EventTarget} eventBus - shared event bus for cross-module comms
   */
  constructor(eventBus) {
    /** @type {EventTarget} */
    this.eventBus = eventBus;

    /** @type {AudioEngine} */
    this.audio = new AudioEngine();

    /**
     * Map of questionId → DOM element for quick lookups.
     * @type {Map<string, HTMLElement>}
     */
    this._blockElements = new Map();

    /**
     * Currently-active (selected) question id.
     * @type {string|null}
     */
    this._activeQuestionId = null;

    /** Hover sound debounce tracker */
    this._lastHoverSoundTime = 0;
  }

  // ═══════════════════════════════════════════
  // 1. FABRICATOR PANEL
  // ═══════════════════════════════════════════

  /**
   * Render the Component Fabricator panel into a container.
   * Creates draggable module cards for each question type.
   * @param {HTMLElement} container
   */
  renderFabricator(container) {
    container.innerHTML = '';

    // ── Panel header ──
    const header = el('div', 'panel-header');
    const headerIcon = el('span', 'panel-header__icon', '⚙');
    const headerTitle = el('span', 'panel-header__title', 'COMPONENT FABRICATOR');
    header.append(headerIcon, headerTitle);
    container.appendChild(header);

    // ── Module list ──
    const modules = el('div', 'fabricator-modules');

    for (const qt of QUESTION_TYPES) {
      const card = el('div', 'module-card');
      card.draggable = true;
      card.dataset.type = qt.type;

      const icon = el('div', 'module-card__icon', qt.icon);
      const info = el('div', 'module-card__info');
      const label = el('div', 'module-card__label', qt.label);
      const desc  = el('div', 'module-card__desc', qt.desc);
      info.append(label, desc);
      card.append(icon, info);

      // ── Drag events ──
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/nexusflow-type', qt.type);
        e.dataTransfer.effectAllowed = 'copy';
        card.classList.add('dragging');
        this.playSound('click');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });

      // ── Hover sound (debounced via AudioEngine) ──
      card.addEventListener('mouseenter', () => {
        this.playSound('hover');
      });

      modules.appendChild(card);
    }

    container.appendChild(modules);
  }

  // ═══════════════════════════════════════════
  // 2. QUESTION BLOCKS
  // ═══════════════════════════════════════════

  /**
   * Create and return a new question-block DOM element.
   * The element is also stored in the internal map.
   *
   * @param {Object} question - question data object
   * @returns {HTMLElement} the created block element
   */
  createQuestionBlock(question) {
    const meta = TYPE_MAP[question.type] || QUESTION_TYPES[0];
    const block = el('div', 'question-block');
    block.dataset.questionId = question.id;
    block.dataset.type = question.type;

    // ── Number badge ──
    const number = el('div', 'question-block__number', pad2((question.order ?? 0) + 1));
    block.appendChild(number);

    // ── Header row ──
    const header = el('div', 'question-block__header');
    const titleInput = document.createElement('input');
    titleInput.className = 'question-block__title-input';
    titleInput.value = question.title || '';
    titleInput.placeholder = 'Enter your question...';
    titleInput.setAttribute('aria-label', 'Question title');

    const badge = el('div', 'question-block__type-badge', `${meta.icon} ${meta.label}`);
    header.append(titleInput, badge);
    block.appendChild(header);

    // ── Description ──
    const descInput = document.createElement('input');
    descInput.className = 'question-block__desc-input';
    descInput.value = question.description || '';
    descInput.placeholder = 'Add description (optional)';
    descInput.setAttribute('aria-label', 'Question description');
    block.appendChild(descInput);

    // ── Type-specific content ──
    const content = el('div', 'question-block__content');
    this._renderTypeContent(content, question, false);
    block.appendChild(content);

    // ── Toolbar ──
    const toolbar = el('div', 'question-block__toolbar');

    // Required toggle
    const reqLabel = document.createElement('label');
    reqLabel.className = 'question-block__required';
    const reqCheckbox = document.createElement('input');
    reqCheckbox.type = 'checkbox';
    reqCheckbox.checked = !!question.required;
    reqLabel.append(reqCheckbox, document.createTextNode(' Required'));
    toolbar.appendChild(reqLabel);

    // Duplicate button
    const dupeBtn = el('button', 'cyber-btn cyber-btn--icon', '⧉');
    dupeBtn.title = 'Duplicate';
    toolbar.appendChild(dupeBtn);

    // Delete button
    const delBtn = el('button', 'cyber-btn cyber-btn--icon cyber-btn--danger', '✕');
    delBtn.title = 'Delete';
    toolbar.appendChild(delBtn);

    block.appendChild(toolbar);

    // ── Wire events ──
    this._bindBlockEvents(block, question);

    // Store reference
    this._blockElements.set(question.id, block);

    return block;
  }

  /**
   * Update an existing question block in-place.
   * Re-renders number, title, description, type content, and required state.
   *
   * @param {string} questionId
   * @param {Object} question - updated question data
   */
  updateQuestionBlock(questionId, question) {
    const block = this._blockElements.get(questionId);
    if (!block) return;

    const meta = TYPE_MAP[question.type] || QUESTION_TYPES[0];

    // Number
    const numberEl = block.querySelector('.question-block__number');
    if (numberEl) numberEl.textContent = pad2((question.order ?? 0) + 1);

    // Title
    const titleEl = block.querySelector('.question-block__title-input');
    if (titleEl && document.activeElement !== titleEl) {
      titleEl.value = question.title || '';
    }

    // Description
    const descEl = block.querySelector('.question-block__desc-input');
    if (descEl && document.activeElement !== descEl) {
      descEl.value = question.description || '';
    }

    // Badge
    const badgeEl = block.querySelector('.question-block__type-badge');
    if (badgeEl) badgeEl.textContent = `${meta.icon} ${meta.label}`;

    // Type-specific content
    const contentEl = block.querySelector('.question-block__content');
    if (contentEl) {
      contentEl.innerHTML = '';
      this._renderTypeContent(contentEl, question, false);
    }

    // Required
    const reqCheckbox = block.querySelector('.question-block__required input[type="checkbox"]');
    if (reqCheckbox) reqCheckbox.checked = !!question.required;

    // Update data attrs
    block.dataset.type = question.type;
  }

  /**
   * Remove a question block from DOM and internal map.
   * @param {string} questionId
   */
  removeQuestionBlock(questionId) {
    const block = this._blockElements.get(questionId);
    if (block) {
      block.classList.add('question-block--removing');
      // Animate out then remove
      setTimeout(() => {
        block.remove();
        this._blockElements.delete(questionId);
      }, 300);
    }
    if (this._activeQuestionId === questionId) {
      this._activeQuestionId = null;
    }
  }

  // ── Private: type-specific content renderers ──

  /**
   * Render type-specific content into a container.
   * @param {HTMLElement} container
   * @param {Object} question
   * @param {boolean} respondentMode - if true, inputs are enabled
   * @private
   */
  _renderTypeContent(container, question, respondentMode) {
    switch (question.type) {
      case 'short-answer': this._renderShortAnswer(container, question, respondentMode); break;
      case 'paragraph':    this._renderParagraph(container, question, respondentMode); break;
      case 'multiple-choice': this._renderMultipleChoice(container, question, respondentMode); break;
      case 'checkbox':     this._renderCheckbox(container, question, respondentMode); break;
      case 'dropdown':     this._renderDropdown(container, question, respondentMode); break;
      case 'file-upload':  this._renderFileUpload(container, question, respondentMode); break;
      case 'date':         this._renderDate(container, question, respondentMode); break;
      case 'scale':        this._renderScale(container, question, respondentMode); break;
      default:             this._renderShortAnswer(container, question, respondentMode); break;
    }
  }

  /**
   * Short Answer renderer
   * @private
   */
  _renderShortAnswer(container, question, respondentMode) {
    const wrapper = el('div', 'laser-input');
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Short answer text';
    input.disabled = !respondentMode;
    if (respondentMode) {
      input.dataset.questionId = question.id;
      input.addEventListener('input', () => {
        this._emitRespondentInput(question.id, input.value);
      });
    }
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  }

  /**
   * Paragraph renderer
   * @private
   */
  _renderParagraph(container, question, respondentMode) {
    const wrapper = el('div', 'laser-input laser-input--multi');
    const textarea = document.createElement('textarea');
    textarea.placeholder = 'Long answer text';
    textarea.rows = 3;
    textarea.disabled = !respondentMode;
    if (respondentMode) {
      textarea.dataset.questionId = question.id;
      textarea.addEventListener('input', () => {
        this._emitRespondentInput(question.id, textarea.value);
      });
    }
    wrapper.appendChild(textarea);
    container.appendChild(wrapper);
  }

  /**
   * Multiple Choice renderer
   * @private
   */
  _renderMultipleChoice(container, question, respondentMode) {
    const options = question.options || ['Option 1', 'Option 2'];
    const list = el('div', 'options-list');

    options.forEach((opt, i) => {
      const row = el('div', 'reactor-radio');
      row.dataset.index = String(i);

      const core = el('div', 'reactor-radio__core');

      if (respondentMode) {
        // Clickable radio in respondent mode
        row.addEventListener('click', () => {
          list.querySelectorAll('.reactor-radio').forEach(r => r.classList.remove('selected'));
          row.classList.add('selected');
          this.playSound('click');
          this._emitRespondentInput(question.id, opt);
        });
        const labelSpan = el('span', 'reactor-radio__label-text', opt);
        row.append(core, labelSpan);
      } else {
        // Editable label in builder mode
        const labelInput = document.createElement('input');
        labelInput.className = 'reactor-radio__label-input';
        labelInput.value = opt;
        labelInput.addEventListener('change', () => {
          this._emitOptionChange(question.id, i, labelInput.value);
        });

        const removeBtn = el('button', 'option-remove', '✕');
        removeBtn.addEventListener('click', () => {
          this._emitOptionRemove(question.id, i);
        });

        // Preview select in builder
        core.addEventListener('click', () => {
          list.querySelectorAll('.reactor-radio').forEach(r => r.classList.remove('selected'));
          row.classList.add('selected');
          this.playSound('click');
        });

        row.append(core, labelInput, removeBtn);
      }

      list.appendChild(row);
    });

    if (!respondentMode) {
      const addBtn = el('button', 'add-option-btn cyber-btn', '+ Add Option');
      addBtn.addEventListener('click', () => {
        this._emitOptionAdd(question.id);
        this.playSound('click');
      });
      list.appendChild(addBtn);
    }

    container.appendChild(list);
  }

  /**
   * Checkbox renderer
   * @private
   */
  _renderCheckbox(container, question, respondentMode) {
    const options = question.options || ['Option 1', 'Option 2'];
    const list = el('div', 'options-list');

    options.forEach((opt, i) => {
      const row = el('div', 'reactor-checkbox');
      row.dataset.index = String(i);

      const core = el('div', 'reactor-checkbox__core');

      if (respondentMode) {
        row.addEventListener('click', () => {
          row.classList.toggle('selected');
          this.playSound('click');
          const selected = Array.from(list.querySelectorAll('.reactor-checkbox.selected'))
            .map(r => options[parseInt(r.dataset.index, 10)]);
          this._emitRespondentInput(question.id, selected);
        });
        const labelSpan = el('span', 'reactor-checkbox__label-text', opt);
        row.append(core, labelSpan);
      } else {
        const labelInput = document.createElement('input');
        labelInput.className = 'reactor-checkbox__label-input';
        labelInput.value = opt;
        labelInput.addEventListener('change', () => {
          this._emitOptionChange(question.id, i, labelInput.value);
        });

        const removeBtn = el('button', 'option-remove', '✕');
        removeBtn.addEventListener('click', () => {
          this._emitOptionRemove(question.id, i);
        });

        core.addEventListener('click', () => {
          row.classList.toggle('selected');
          this.playSound('click');
        });

        row.append(core, labelInput, removeBtn);
      }

      list.appendChild(row);
    });

    if (!respondentMode) {
      const addBtn = el('button', 'add-option-btn cyber-btn', '+ Add Option');
      addBtn.addEventListener('click', () => {
        this._emitOptionAdd(question.id);
        this.playSound('click');
      });
      list.appendChild(addBtn);
    }

    container.appendChild(list);
  }

  /**
   * Dropdown renderer
   * @private
   */
  _renderDropdown(container, question, respondentMode) {
    const options = question.options || ['Option 1', 'Option 2'];

    if (respondentMode) {
      const wrapper = el('div', 'mech-dropdown-preview');
      const select = document.createElement('select');
      select.className = 'mech-dropdown__select';

      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select an option…';
      placeholder.disabled = true;
      placeholder.selected = true;
      select.appendChild(placeholder);

      options.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        select.appendChild(o);
      });

      select.addEventListener('change', () => {
        this.playSound('click');
        this._emitRespondentInput(question.id, select.value);
      });

      wrapper.appendChild(select);
      container.appendChild(wrapper);
    } else {
      const wrapper = el('div', 'mech-dropdown-preview');
      const list = el('div', 'options-list');

      options.forEach((opt, i) => {
        const row = el('div', 'reactor-radio');
        row.dataset.index = String(i);

        const indexLabel = el('span', 'dropdown-index', `${i + 1}.`);

        const labelInput = document.createElement('input');
        labelInput.className = 'reactor-radio__label-input';
        labelInput.value = opt;
        labelInput.addEventListener('change', () => {
          this._emitOptionChange(question.id, i, labelInput.value);
        });

        const removeBtn = el('button', 'option-remove', '✕');
        removeBtn.addEventListener('click', () => {
          this._emitOptionRemove(question.id, i);
        });

        row.append(indexLabel, labelInput, removeBtn);
        list.appendChild(row);
      });

      const addBtn = el('button', 'add-option-btn cyber-btn', '+ Add Option');
      addBtn.addEventListener('click', () => {
        this._emitOptionAdd(question.id);
        this.playSound('click');
      });
      list.appendChild(addBtn);

      wrapper.appendChild(list);
      container.appendChild(wrapper);
    }
  }

  /**
   * File Upload renderer
   * @private
   */
  _renderFileUpload(container, question, respondentMode) {
    const hatch = el('div', 'hatch-upload');
    const hatchIcon = el('div', 'hatch-upload__icon', '⬆');
    const hatchText = el('div', 'hatch-upload__text', 'Drag files here or click to upload');
    const hatchFormats = el('div', 'hatch-upload__formats', 'Supported: PDF, DOC, IMG');
    hatch.append(hatchIcon, hatchText, hatchFormats);

    if (respondentMode) {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.className = 'hatch-upload__input';
      fileInput.style.display = 'none';
      fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
          hatchText.textContent = fileInput.files[0].name;
          hatch.classList.add('hatch-upload--filled');
          this.playSound('success');
          this._emitRespondentInput(question.id, fileInput.files[0].name);
        }
      });
      hatch.appendChild(fileInput);
      hatch.addEventListener('click', () => fileInput.click());
      hatch.style.cursor = 'pointer';

      // Drag & drop visual feedback
      hatch.addEventListener('dragover', (e) => {
        e.preventDefault();
        hatch.classList.add('hatch-upload--dragover');
      });
      hatch.addEventListener('dragleave', () => {
        hatch.classList.remove('hatch-upload--dragover');
      });
      hatch.addEventListener('drop', (e) => {
        e.preventDefault();
        hatch.classList.remove('hatch-upload--dragover');
        if (e.dataTransfer.files.length) {
          hatchText.textContent = e.dataTransfer.files[0].name;
          hatch.classList.add('hatch-upload--filled');
          this.playSound('success');
          this._emitRespondentInput(question.id, e.dataTransfer.files[0].name);
        }
      });
    }

    container.appendChild(hatch);
  }

  /**
   * Date renderer
   * @private
   */
  _renderDate(container, question, respondentMode) {
    const wrapper = el('div', 'laser-input');
    const input = document.createElement('input');
    input.type = 'date';
    input.disabled = !respondentMode;
    if (respondentMode) {
      input.dataset.questionId = question.id;
      input.addEventListener('change', () => {
        this.playSound('click');
        this._emitRespondentInput(question.id, input.value);
      });
    }
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  }

  /**
   * Linear Scale renderer (1-10)
   * @private
   */
  _renderScale(container, question, respondentMode) {
    const scaleContainer = el('div', 'scale-container');
    const labelLow = el('span', 'scale-label', '1');
    const points = el('div', 'scale-points');
    const labelHigh = el('span', 'scale-label', '10');

    for (let v = 1; v <= 10; v++) {
      const point = el('div', 'scale-point');
      point.dataset.value = String(v);
      const core = el('div', 'reactor-radio__core');
      const valueLabel = el('span', 'scale-point__value', String(v));
      point.append(core, valueLabel);

      point.addEventListener('click', () => {
        points.querySelectorAll('.scale-point').forEach(p => p.classList.remove('selected'));
        point.classList.add('selected');
        this.playSound('click');
        if (respondentMode) {
          this._emitRespondentInput(question.id, v);
        }
      });

      points.appendChild(point);
    }

    scaleContainer.append(labelLow, points, labelHigh);
    container.appendChild(scaleContainer);
  }

  // ── Private: event binding for question blocks ──

  /**
   * Bind all interactive events for a question block.
   * @param {HTMLElement} block
   * @param {Object} question
   * @private
   */
  _bindBlockEvents(block, question) {
    const qid = question.id;

    // ── Block selection ──
    block.addEventListener('click', (e) => {
      // Don't select when interacting with inputs/buttons inside
      if (e.target.closest('input, button, textarea, select, label')) return;

      this._setActiveBlock(qid);
    });

    // ── Title change ──
    const titleInput = block.querySelector('.question-block__title-input');
    if (titleInput) {
      titleInput.addEventListener('input', () => {
        this.eventBus.dispatchEvent(new CustomEvent('question:updated', {
          detail: { id: qid, field: 'title', value: titleInput.value }
        }));
      });
      titleInput.addEventListener('focus', () => this._setActiveBlock(qid));
    }

    // ── Description change ──
    const descInput = block.querySelector('.question-block__desc-input');
    if (descInput) {
      descInput.addEventListener('input', () => {
        this.eventBus.dispatchEvent(new CustomEvent('question:updated', {
          detail: { id: qid, field: 'description', value: descInput.value }
        }));
      });
      descInput.addEventListener('focus', () => this._setActiveBlock(qid));
    }

    // ── Required toggle ──
    const reqCheckbox = block.querySelector('.question-block__required input[type="checkbox"]');
    if (reqCheckbox) {
      reqCheckbox.addEventListener('change', () => {
        this.playSound('click');
        this.eventBus.dispatchEvent(new CustomEvent('question:updated', {
          detail: { id: qid, field: 'required', value: reqCheckbox.checked }
        }));
      });
    }

    // ── Delete ──
    const delBtn = block.querySelector('.cyber-btn--danger');
    if (delBtn) {
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playSound('click');
        this.eventBus.dispatchEvent(new CustomEvent('question:removed', {
          detail: { id: qid }
        }));
      });
    }

    // ── Duplicate ──
    const dupeBtn = block.querySelector('.cyber-btn--icon:not(.cyber-btn--danger)');
    if (dupeBtn) {
      dupeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playSound('click');
        this.eventBus.dispatchEvent(new CustomEvent('question:duplicated', {
          detail: { id: qid }
        }));
      });
    }
  }

  /**
   * Set a block as active (selected) and deselect the previous.
   * @param {string} questionId
   * @private
   */
  _setActiveBlock(questionId) {
    if (this._activeQuestionId === questionId) return;

    // Deselect previous
    if (this._activeQuestionId) {
      const prev = this._blockElements.get(this._activeQuestionId);
      if (prev) prev.classList.remove('active');
    }

    this._activeQuestionId = questionId;
    const block = this._blockElements.get(questionId);
    if (block) {
      block.classList.add('active');
      this.playSound('click');
    }

    this.eventBus.dispatchEvent(new CustomEvent('question:selected', {
      detail: { id: questionId }
    }));
  }

  // ── Private: option mutation emitters ──

  /** @private */
  _emitOptionChange(questionId, index, value) {
    this.eventBus.dispatchEvent(new CustomEvent('question:updated', {
      detail: { id: questionId, field: 'option', index, value }
    }));
  }

  /** @private */
  _emitOptionRemove(questionId, index) {
    this.playSound('click');
    this.eventBus.dispatchEvent(new CustomEvent('question:updated', {
      detail: { id: questionId, field: 'option-remove', index }
    }));
  }

  /** @private */
  _emitOptionAdd(questionId) {
    this.eventBus.dispatchEvent(new CustomEvent('question:updated', {
      detail: { id: questionId, field: 'option-add' }
    }));
  }

  /** @private */
  _emitRespondentInput(questionId, value) {
    this.eventBus.dispatchEvent(new CustomEvent('respondent:input', {
      detail: { id: questionId, value }
    }));
  }

  // ═══════════════════════════════════════════
  // 3. LOGIC PANEL
  // ═══════════════════════════════════════════

  /**
   * Render the Logic Controller panel.
   * Shows question nodes and existing branch rules.
   *
   * @param {HTMLElement} container
   * @param {Object[]} questions - array of question data objects
   * @param {Object[]} branches - array of {id, fromId, toId, condition}
   */
  renderLogicPanel(container, questions, branches) {
    container.innerHTML = '';

    // ── Panel header ──
    const header = el('div', 'panel-header');
    const headerIcon = el('span', 'panel-header__icon', '⚡');
    const headerTitle = el('span', 'panel-header__title', 'LOGIC CONTROLLER');
    header.append(headerIcon, headerTitle);
    container.appendChild(header);

    // ── Question nodes ──
    const nodesContainer = el('div', 'logic-nodes');

    if (questions.length === 0) {
      const empty = el('div', 'logic-nodes__empty', 'No questions yet. Drag components from the Fabricator to begin.');
      nodesContainer.appendChild(empty);
    } else {
      questions.forEach((q, i) => {
        const meta = TYPE_MAP[q.type] || QUESTION_TYPES[0];
        const node = el('div', 'logic-node');
        node.dataset.questionId = q.id;

        const dot = el('div', 'logic-node__dot');
        // Cycle through accent colours for visual distinction
        const hue = (i * 40 + 180) % 360;
        dot.style.background = `hsl(${hue}, 90%, 55%)`;

        const title = el('div', 'logic-node__title', q.title || `Question ${i + 1}`);
        const type  = el('div', 'logic-node__type', `${meta.icon} ${meta.label}`);

        node.append(dot, title, type);
        nodesContainer.appendChild(node);
      });
    }

    container.appendChild(nodesContainer);

    // ── Branch rules ──
    const branchContainer = el('div', 'logic-branches');

    if (branches && branches.length > 0) {
      const questionOrderMap = new Map();
      questions.forEach((q, i) => questionOrderMap.set(q.id, i + 1));

      branches.forEach((branch) => {
        const branchEl = el('div', 'logic-branch');
        branchEl.dataset.branchId = branch.id;

        const fromLabel = el('span', 'logic-branch__from', `Q${questionOrderMap.get(branch.fromId) || '?'}`);
        const arrow1    = el('span', 'logic-branch__arrow', '→');
        const condition = el('span', 'logic-branch__condition', branch.condition || 'any');
        const arrow2    = el('span', 'logic-branch__arrow', '→');
        const toLabel   = el('span', 'logic-branch__to', `Q${questionOrderMap.get(branch.toId) || '?'}`);

        const removeBtn = el('button', 'logic-branch__remove', '✕');
        removeBtn.addEventListener('click', () => {
          this.playSound('click');
          this.eventBus.dispatchEvent(new CustomEvent('logic:branch-removed', {
            detail: { id: branch.id }
          }));
        });

        branchEl.append(fromLabel, arrow1, condition, arrow2, toLabel, removeBtn);
        branchContainer.appendChild(branchEl);
      });
    } else {
      const empty = el('div', 'logic-branches__empty', 'No branching logic defined.');
      branchContainer.appendChild(empty);
    }

    container.appendChild(branchContainer);

    // ── Add branch button ──
    const addBtn = el('button', 'cyber-btn cyber-btn--primary add-logic-btn', '+ Add Logic Branch');
    addBtn.addEventListener('click', () => {
      this.playSound('click');
      this.eventBus.dispatchEvent(new CustomEvent('logic:branch-add'));
    });
    container.appendChild(addBtn);
  }

  // ═══════════════════════════════════════════
  // 4. RESPONDENT MODE
  // ═══════════════════════════════════════════

  /**
   * Show the immersive respondent (form-filling) overlay.
   *
   * @param {HTMLElement} container - parent element to inject overlay into
   * @param {Object[]} questions - array of question data
   * @param {Object[]} branches - logic branches (for future skip logic)
   */
  showRespondentMode(container, questions, branches) {
    // Remove any existing overlay first
    this.hideRespondentMode(container);

    const overlay = el('div');
    overlay.id = 'respondent-overlay';

    const respondentContainer = el('div', 'respondent-container');

    // ── Header ──
    const header = el('div', 'respondent-header');
    const title = el('h1', 'respondent-title', 'NexusFlow Survey');
    const desc  = el('p', 'respondent-desc', 'Complete the form below to submit your response.');
    header.append(title, desc);
    respondentContainer.appendChild(header);

    // ── Progress bar ──
    const progressWrap = el('div', 'respondent-progress');
    const tube = el('div', 'progress-tube');
    const tubeFill = el('div', 'progress-tube__fill');
    tubeFill.style.width = '0%';
    tube.appendChild(tubeFill);
    const progressText = el('span', 'respondent-progress__text', `0 / ${questions.length}`);
    progressWrap.append(tube, progressText);
    respondentContainer.appendChild(progressWrap);

    // ── Questions ──
    const questionsWrap = el('div', 'respondent-questions');

    /** Track which questions have been answered for progress */
    const answered = new Set();

    questions.forEach((q, i) => {
      const meta = TYPE_MAP[q.type] || QUESTION_TYPES[0];

      const card = el('div', 'respondent-question');
      card.dataset.id = q.id;

      const num = el('div', 'respondent-question__number', pad2(i + 1));
      const qTitle = el('h2', 'respondent-question__title');
      qTitle.textContent = q.title || `Question ${i + 1}`;
      if (q.required) {
        const reqMark = el('span', 'respondent-question__required', ' *');
        qTitle.appendChild(reqMark);
      }
      const qDesc = el('p', 'respondent-question__desc', q.description || '');
      if (!q.description) qDesc.style.display = 'none';

      const inputWrap = el('div', 'respondent-question__input');
      this._renderTypeContent(inputWrap, q, true);

      card.append(num, qTitle, qDesc, inputWrap);
      questionsWrap.appendChild(card);
    });

    respondentContainer.appendChild(questionsWrap);

    // ── Progress updater ──
    const updateProgress = () => {
      const pct = questions.length ? (answered.size / questions.length) * 100 : 0;
      tubeFill.style.width = `${pct}%`;
      progressText.textContent = `${answered.size} / ${questions.length}`;
    };

    // Listen for respondent input events to update progress
    const onInput = (e) => {
      const { id, value } = e.detail;
      const isEmpty = value === '' || value === null || value === undefined ||
                      (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        answered.delete(id);
      } else {
        answered.add(id);
      }
      updateProgress();
    };
    this.eventBus.addEventListener('respondent:input', onInput);

    // ── Actions ──
    const actions = el('div', 'respondent-actions');
    const submitBtn = el('button', 'cyber-btn cyber-btn--primary respondent-submit-btn', 'SUBMIT');
    submitBtn.addEventListener('click', () => {
      // Validate required questions
      const unanswered = questions.filter(q => q.required && !answered.has(q.id));
      if (unanswered.length > 0) {
        this.playSound('error');
        this.showToast(`Please answer all required questions (${unanswered.length} remaining)`, 'error');
        // Highlight unanswered required questions
        unanswered.forEach(q => {
          const qCard = questionsWrap.querySelector(`[data-id="${q.id}"]`);
          if (qCard) {
            qCard.classList.add('respondent-question--error');
            setTimeout(() => qCard.classList.remove('respondent-question--error'), 2000);
          }
        });
        return;
      }
      this.playSound('success');
      this.showToast('Response submitted successfully!', 'success');
      this.eventBus.dispatchEvent(new CustomEvent('respondent:submitted'));
      setTimeout(() => this.hideRespondentMode(container), 1200);
    });
    actions.appendChild(submitBtn);
    respondentContainer.appendChild(actions);

    // ── Close button ──
    const closeBtn = el('button', 'respondent-close cyber-btn cyber-btn--icon', '✕');
    closeBtn.addEventListener('click', () => {
      this.playSound('click');
      this.hideRespondentMode(container);
    });
    respondentContainer.appendChild(closeBtn);

    // ── Store cleanup reference ──
    overlay._cleanup = () => {
      this.eventBus.removeEventListener('respondent:input', onInput);
    };

    overlay.appendChild(respondentContainer);

    // Animate entrance
    requestAnimationFrame(() => {
      container.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('respondent-overlay--visible'));
    });

    this.playSound('success');
  }

  /**
   * Hide and clean up the respondent overlay.
   * @param {HTMLElement} container
   */
  hideRespondentMode(container) {
    const overlay = container.querySelector('#respondent-overlay') ||
                    document.getElementById('respondent-overlay');
    if (!overlay) return;

    overlay.classList.remove('respondent-overlay--visible');
    overlay.classList.add('respondent-overlay--exiting');

    if (typeof overlay._cleanup === 'function') {
      overlay._cleanup();
    }

    setTimeout(() => overlay.remove(), 500);
  }

  // ═══════════════════════════════════════════
  // 5. AUDIO
  // ═══════════════════════════════════════════

  /**
   * Play a UI sound effect.
   * @param {'click'|'drop'|'error'|'success'|'hover'} type
   */
  playSound(type) {
    this.audio.play(type);
  }

  // ═══════════════════════════════════════════
  // 6. TOAST NOTIFICATIONS
  // ═══════════════════════════════════════════

  /**
   * Display a toast notification that auto-dismisses.
   * @param {string} message
   * @param {'info'|'success'|'error'} [type='info']
   */
  showToast(message, type = 'info') {
    const toast = el('div', `nexus-toast nexus-toast--${type}`);

    const icon = el('span', 'nexus-toast__icon', TOAST_ICONS[type] || TOAST_ICONS.info);
    const msg  = el('span', 'nexus-toast__message', message);

    toast.append(icon, msg);

    // Insert into toast container (create if needed)
    let toastContainer = document.querySelector('.nexus-toast-container');
    if (!toastContainer) {
      toastContainer = el('div', 'nexus-toast-container');
      document.body.appendChild(toastContainer);
    }

    toastContainer.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => toast.classList.add('nexus-toast--enter'));

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.remove('nexus-toast--enter');
      toast.classList.add('nexus-toast--exit');
    }, 3000);

    setTimeout(() => {
      toast.remove();
      // Clean up empty container
      if (toastContainer && toastContainer.children.length === 0) {
        toastContainer.remove();
      }
    }, 3500);
  }
}
