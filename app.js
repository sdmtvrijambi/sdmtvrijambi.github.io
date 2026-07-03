/**
 * ═══════════════════════════════════════════════════════════════════
 *  NexusFlow — Sovereign Form Architect
 *  Main Application Orchestrator (app.js)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  This is the MAIN entry point loaded as type="module" from index.html.
 *  Responsibilities:
 *    • Initialize CanvasEngine and NexusFlowUI
 *    • Own and mutate all application state
 *    • Coordinate drag-and-drop question creation
 *    • Manage respondent preview / publish workflows
 *    • Keyboard shortcuts, progress tracking, boot animation
 *
 *  Architecture:
 *    App  ←eventBus→  UI   (bidirectional events)
 *    App  ———————→  Canvas  (imperative calls for visual FX)
 *
 *  @module app
 */

import { CanvasEngine } from './canvas.js';
import { NexusFlowUI, QUESTION_TYPES } from './ui.js';

/* ──────────────────────────────────────────────────────────────────
   Initial State Template
   ────────────────────────────────────────────────────────────────── */

/** @type {AppState} */
const initialState = {
  /** @type {QuestionObject[]} */
  questions: [],
  /** @type {LogicBranch[]} */
  logic: [],
  /** @type {{ title: string, description: string }} */
  settings: {
    title: 'Untitled Form',
    description: 'Form description',
  },
  /** @type {'builder' | 'respondent'} */
  mode: 'builder',
  /** @type {string|null} */
  activeQuestionId: null,
  /** @type {string|null} */
  draggedType: null,
};

/**
 * @typedef {Object} QuestionObject
 * @property {string}   id          - crypto.randomUUID()
 * @property {string}   type        - e.g. 'short-answer', 'multiple-choice'
 * @property {string}   title       - Display title
 * @property {string}   description - Optional helper text
 * @property {boolean}  required    - Whether the question is mandatory
 * @property {string[]} options     - Answer options (for choice-based types)
 * @property {number}   order       - Sort order index
 */

/**
 * @typedef {Object} LogicBranch
 * @property {string} id
 * @property {string} sourceQuestionId
 * @property {string} condition
 * @property {string} targetQuestionId
 */

/**
 * @typedef {Object} AppState
 * @property {QuestionObject[]} questions
 * @property {LogicBranch[]}    logic
 * @property {{ title: string, description: string }} settings
 * @property {'builder'|'respondent'} mode
 * @property {string|null} activeQuestionId
 * @property {string|null} draggedType
 */

/* ──────────────────────────────────────────────────────────────────
   Utility: inject runtime keyframes
   ────────────────────────────────────────────────────────────────── */

/**
 * Injects CSS keyframe animations that are used dynamically by
 * the orchestrator (fade-outs, pulse effects, etc.).
 * @private
 */
function injectRuntimeStyles() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeOut {
      to {
        opacity: 0;
        transform: scale(0.95);
      }
    }

    @keyframes pulseGlow {
      0%, 100% { box-shadow: 0 0 8px rgba(0, 255, 200, 0.3); }
      50%      { box-shadow: 0 0 20px rgba(0, 255, 200, 0.6); }
    }

    @keyframes shakeError {
      0%, 100% { transform: translateX(0); }
      20%      { transform: translateX(-6px); }
      40%      { transform: translateX(6px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }

    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes sinkPulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 20px rgba(0, 255, 200, 0.4);
      }
      50% {
        transform: scale(1.08);
        box-shadow: 0 0 40px rgba(0, 255, 200, 0.7);
      }
    }
  `;
  document.head.appendChild(style);
}

/* ══════════════════════════════════════════════════════════════════
   NexusFlowApp — Main Orchestrator
   ══════════════════════════════════════════════════════════════════ */

/**
 * Central application class.
 * Owns all mutable state; delegates rendering to `NexusFlowUI`
 * and visual effects to `CanvasEngine`.
 */
class NexusFlowApp {
  constructor() {
    /** Deep-clone the initial state so each instance is independent */
    this.state = JSON.parse(JSON.stringify(initialState));

    /**
     * Shared event bus for bidirectional communication between
     * the app orchestrator and the UI layer.
     * @type {EventTarget}
     */
    this.eventBus = new EventTarget();

    /** @type {CanvasEngine|null} */
    this.canvas = null;

    /** @type {NexusFlowUI|null} */
    this.ui = null;

    /**
     * Cached DOM element references.
     * Populated by {@link cacheElements}.
     * @type {Record<string, HTMLElement|null>}
     */
    this.elements = {};
  }

  /* ────────────────────────────────────────────────────────────────
     Lifecycle
     ──────────────────────────────────────────────────────────────── */

  /**
   * Boot the entire application.
   * Must be called after DOMContentLoaded.
   */
  init() {
    injectRuntimeStyles();
    this.cacheElements();
    this.initCanvas();
    this.initUI();
    this.setupDragDrop();
    this.setupEventListeners();
    this.setupKeyboard();
    this.renderEmptyState();
    this.playBootAnimation();
  }

  /**
   * Cache frequently-accessed DOM nodes to avoid repeated lookups.
   */
  cacheElements() {
    this.elements = {
      pcbCanvas: document.getElementById('pcb-canvas'),
      effectsCanvas: document.getElementById('effects-canvas'),
      topBar: document.getElementById('top-bar'),
      formTitle: document.getElementById('form-title'),
      fabricatorPanel: document.getElementById('fabricator-panel'),
      hydrationCanvas: document.getElementById('hydration-canvas'),
      logicPanel: document.getElementById('logic-panel'),
      progressTubeContainer: document.getElementById('progress-tube-container'),
      dataSinkContainer: document.getElementById('data-sink-container'),
      respondentOverlay: document.getElementById('respondent-overlay'),
      previewBtn: document.getElementById('preview-btn'),
      publishBtn: document.getElementById('publish-btn'),
      questionsContainer: document.getElementById('questions-container'),
    };
  }

  /* ────────────────────────────────────────────────────────────────
     Sub-system Initialisation
     ──────────────────────────────────────────────────────────────── */

  /**
   * Spin up the WebGL / Canvas2D visual-effects engine.
   */
  initCanvas() {
    this.canvas = new CanvasEngine(
      this.elements.pcbCanvas,
      this.elements.effectsCanvas,
    );
    this.canvas.init();
  }

  /**
   * Spin up the UI layer and render initial panels.
   */
  initUI() {
    this.ui = new NexusFlowUI(this.eventBus);
    this.ui.renderFabricator(this.elements.fabricatorPanel);
    this.ui.renderLogicPanel(
      this.elements.logicPanel,
      this.state.questions,
      this.state.logic,
    );
    this.renderProgressTube();
  }

  /* ════════════════════════════════════════════════════════════════
     DRAG  &  DROP  SYSTEM
     ════════════════════════════════════════════════════════════════ */

  /**
   * Wire up drag-over / drop handlers on the hydration canvas and
   * the questions container so users can add new question modules
   * by dragging from the fabricator panel.
   */
  setupDragDrop() {
    const canvas = this.elements.hydrationCanvas;
    const questionsContainer = this.elements.questionsContainer;

    if (!canvas && !questionsContainer) return;

    /**
     * Helper: attach standard drag-over / drag-leave / drop
     * to a given target element.
     * @param {HTMLElement} target
     */
    const attachDropZone = (target) => {
      if (!target) return;

      target.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        target.classList.add('drag-over');
      });

      target.addEventListener('dragleave', (e) => {
        // Only remove class when actually leaving the element
        // (not when entering a child).
        if (!target.contains(/** @type {Node} */ (e.relatedTarget))) {
          target.classList.remove('drag-over');
        }
      });

      target.addEventListener('drop', (e) => {
        e.preventDefault();
        target.classList.remove('drag-over');

        const type = e.dataTransfer.getData('application/nexusflow-type');
        if (!type) return;

        this.addQuestion(type, e.clientX, e.clientY);
      });
    };

    // Both the hydration canvas wrapper AND the questions list are
    // valid drop targets so the user can drop anywhere in the centre.
    attachDropZone(canvas);
    attachDropZone(questionsContainer);
  }

  /* ────────────────────────────────────────────────────────────────
     Question CRUD
     ──────────────────────────────────────────────────────────────── */

  /** Choice-based question types that need default options. */
  static CHOICE_TYPES = ['multiple-choice', 'checkbox', 'dropdown'];

  /**
   * Create a new question and append it to the canvas.
   *
   * @param {string} type   - The question type key (e.g. 'short-answer').
   * @param {number} dropX  - clientX of the drop event (for shockwave FX).
   * @param {number} dropY  - clientY of the drop event (for shockwave FX).
   */
  addQuestion(type, dropX, dropY) {
    /** @type {QuestionObject} */
    const question = {
      id: crypto.randomUUID(),
      type,
      title: 'Untitled Question',
      description: '',
      required: false,
      options: NexusFlowApp.CHOICE_TYPES.includes(type)
        ? ['Option 1', 'Option 2']
        : [],
      order: this.state.questions.length,
    };

    this.state.questions.push(question);

    // Render the question block DOM via the UI layer
    const block = this.ui.createQuestionBlock(question);
    if (this.elements.questionsContainer) {
      this.elements.questionsContainer.appendChild(block);
    }

    // Remove the "empty canvas" placeholder
    this.removeEmptyState();

    // Visual FX: shockwave at drop point
    if (this.canvas) {
      this.canvas.triggerShockwave(dropX, dropY);
    }

    // Audio FX
    this.ui.playSound('drop');

    // Refresh progress indicator
    this.updateProgress();

    // Refresh logic panel with new question list
    this.ui.renderLogicPanel(
      this.elements.logicPanel,
      this.state.questions,
      this.state.logic,
    );

    // Smoothly scroll the new block into view
    block.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Toast notification
    const typeMeta = QUESTION_TYPES.find((t) => t.type === type);
    this.ui.showToast(
      `${typeMeta?.label || type} added`,
      'success',
    );
  }

  /**
   * Remove a question by its ID.
   * @param {string} questionId
   */
  removeQuestion(questionId) {
    this.state.questions = this.state.questions.filter(
      (q) => q.id !== questionId,
    );

    // Re-index orders
    this.state.questions.forEach((q, i) => {
      q.order = i;
    });

    this.ui.removeQuestionBlock(questionId);
    this.updateProgress();
    this.ui.renderLogicPanel(
      this.elements.logicPanel,
      this.state.questions,
      this.state.logic,
    );
    this.ui.playSound('click');

    if (this.state.questions.length === 0) {
      this.renderEmptyState();
    }

    // Clear active selection if the removed question was active
    if (this.state.activeQuestionId === questionId) {
      this.state.activeQuestionId = null;
    }
  }

  /**
   * Duplicate an existing question.
   * @param {QuestionObject} question - The source question to clone.
   */
  duplicateQuestion(question) {
    /** @type {QuestionObject} */
    const newQuestion = {
      ...question,
      id: crypto.randomUUID(),
      title: `${question.title} (Copy)`,
      options: [...question.options],
      order: this.state.questions.length,
    };

    this.state.questions.push(newQuestion);

    const block = this.ui.createQuestionBlock(newQuestion);
    if (this.elements.questionsContainer) {
      this.elements.questionsContainer.appendChild(block);
    }

    this.updateProgress();
    this.ui.renderLogicPanel(
      this.elements.logicPanel,
      this.state.questions,
      this.state.logic,
    );
    this.ui.playSound('drop');

    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.ui.showToast('Question duplicated', 'success');
  }

  /**
   * Update a single field on a question.
   * @param {string} questionId
   * @param {string} field
   * @param {*}      value
   */
  updateQuestionField(questionId, field, value) {
    const question = this.state.questions.find((q) => q.id === questionId);
    if (question) {
      question[field] = value;
    }
  }

  /**
   * Set the currently-selected (active) question.
   * @param {string|null} questionId
   */
  setActiveQuestion(questionId) {
    this.state.activeQuestionId = questionId;

    // Visual: remove 'active' from all blocks, add to the selected one
    document.querySelectorAll('.question-block').forEach((b) => {
      b.classList.remove('active');
    });

    if (questionId) {
      const block = document.querySelector(
        `[data-question-id="${questionId}"]`,
      );
      if (block) block.classList.add('active');
    }
  }

  /* ════════════════════════════════════════════════════════════════
     EVENT  LISTENERS
     ════════════════════════════════════════════════════════════════ */

  /**
   * Wire up all event listeners:
   *   • Form title editing
   *   • EventBus events dispatched by the UI layer
   *   • Preview / Publish buttons
   *   • Window resize
   */
  setupEventListeners() {
    // ── Form title ────────────────────────────────────────────────
    if (this.elements.formTitle) {
      this.elements.formTitle.addEventListener('input', (e) => {
        this.state.settings.title =
          /** @type {HTMLInputElement} */ (e.target).value || 'Untitled Form';
      });
    }

    // ── Question field updated ────────────────────────────────────
    this.eventBus.addEventListener('question:updated', (/** @type {CustomEvent} */ e) => {
      const { questionId, field, value } = e.detail;
      this.updateQuestionField(questionId, field, value);
    });

    // ── Question removed ──────────────────────────────────────────
    this.eventBus.addEventListener('question:removed', (/** @type {CustomEvent} */ e) => {
      const { questionId } = e.detail;
      this.removeQuestion(questionId);
    });

    // ── Question duplicated ───────────────────────────────────────
    this.eventBus.addEventListener('question:duplicated', (/** @type {CustomEvent} */ e) => {
      const { question } = e.detail;
      this.duplicateQuestion(question);
    });

    // ── Question selected / focused ───────────────────────────────
    this.eventBus.addEventListener('question:selected', (/** @type {CustomEvent} */ e) => {
      const { questionId } = e.detail;
      this.setActiveQuestion(questionId);
    });

    // ── Logic branch added ────────────────────────────────────────
    this.eventBus.addEventListener('logic:added', (/** @type {CustomEvent} */ e) => {
      const { branch } = e.detail;
      if (branch) {
        this.state.logic.push(branch);
        this.ui.renderLogicPanel(
          this.elements.logicPanel,
          this.state.questions,
          this.state.logic,
        );
      }
    });

    // ── Logic branch removed ──────────────────────────────────────
    this.eventBus.addEventListener('logic:removed', (/** @type {CustomEvent} */ e) => {
      const { branchId } = e.detail;
      this.state.logic = this.state.logic.filter((l) => l.id !== branchId);
      this.ui.renderLogicPanel(
        this.elements.logicPanel,
        this.state.questions,
        this.state.logic,
      );
    });

    // ── Preview / Respondent mode ─────────────────────────────────
    if (this.elements.previewBtn) {
      this.elements.previewBtn.addEventListener('click', () => {
        this.enterRespondentMode();
      });
    }

    // ── Publish ───────────────────────────────────────────────────
    if (this.elements.publishBtn) {
      this.elements.publishBtn.addEventListener('click', () => {
        this.publishForm();
      });
    }

    // ── Exit respondent mode via eventBus ─────────────────────────
    this.eventBus.addEventListener('respondent:exit', () => {
      this.exitRespondentMode();
    });

    // ── Window resize → canvas resize ─────────────────────────────
    window.addEventListener('resize', () => {
      if (this.canvas) {
        this.canvas.resize();
      }
    });
  }

  /* ════════════════════════════════════════════════════════════════
     KEYBOARD  SHORTCUTS
     ════════════════════════════════════════════════════════════════ */

  /**
   * Global keyboard shortcuts:
   *   Escape  — exit respondent mode *or* deselect active question
   *   Delete  — remove the active question (when no input is focused)
   *   Ctrl+P  — toggle preview (respondent) mode
   */
  setupKeyboard() {
    document.addEventListener('keydown', (e) => {
      // ── Escape ──────────────────────────────────────────────────
      if (e.key === 'Escape') {
        if (this.state.mode === 'respondent') {
          this.exitRespondentMode();
        } else {
          this.setActiveQuestion(null);
        }
        return;
      }

      // ── Delete active question ──────────────────────────────────
      if (
        e.key === 'Delete' &&
        this.state.activeQuestionId &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement?.tagName ?? '',
        )
      ) {
        this.eventBus.dispatchEvent(
          new CustomEvent('question:removed', {
            detail: { questionId: this.state.activeQuestionId },
          }),
        );
        return;
      }

      // ── Ctrl + P → preview toggle ──────────────────────────────
      if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (this.state.mode === 'respondent') {
          this.exitRespondentMode();
        } else {
          this.enterRespondentMode();
        }
      }
    });
  }

  /* ════════════════════════════════════════════════════════════════
     PROGRESS  SYSTEM
     ════════════════════════════════════════════════════════════════ */

  /**
   * Render the initial progress tube UI into the container.
   */
  renderProgressTube() {
    const container = this.elements.progressTubeContainer;
    if (!container) return;

    container.innerHTML = `
      <div class="progress-tube">
        <div class="progress-tube__fill" id="progress-fill"></div>
        <div class="progress-tube__glow"></div>
      </div>
      <span class="progress-tube__count" id="progress-count">0 modules</span>
    `;
  }

  /**
   * Recalculate and render progress based on current question count.
   */
  updateProgress() {
    const count = this.state.questions.length;
    /** Visual cap — the bar fills completely at this many questions. */
    const maxDisplay = 20;
    const percent = Math.min(count / maxDisplay, 1) * 100;

    const fill = document.getElementById('progress-fill');
    const countEl = document.getElementById('progress-count');

    if (fill) {
      fill.style.width = `${percent}%`;
    }
    if (countEl) {
      countEl.textContent = `${count} module${count !== 1 ? 's' : ''}`;
    }

    // Notify the canvas engine so it can adjust background energy FX
    if (this.canvas) {
      this.canvas.updateProgress(percent / 100);
    }
  }

  /* ════════════════════════════════════════════════════════════════
     EMPTY  STATE
     ════════════════════════════════════════════════════════════════ */

  /**
   * Show the "no questions yet" placeholder inside the hydration canvas.
   */
  renderEmptyState() {
    const container = this.elements.questionsContainer;
    if (!container) return;

    // Guard: don't render twice
    if (document.getElementById('empty-state')) return;

    const emptyEl = document.createElement('div');
    emptyEl.className = 'empty-canvas';
    emptyEl.id = 'empty-state';
    emptyEl.innerHTML = `
      <div class="empty-canvas__icon">⎔</div>
      <div class="empty-canvas__title">HYDRATION CANVAS</div>
      <div class="empty-canvas__subtitle">
        Drag components from the fabricator to begin building your data-inflow engine
      </div>
      <div class="empty-canvas__hint">
        <span class="empty-canvas__arrow">←</span>
        Drag modules from the left panel
      </div>
    `;
    container.appendChild(emptyEl);
  }

  /**
   * Animate out and remove the empty-state placeholder.
   */
  removeEmptyState() {
    const empty = document.getElementById('empty-state');
    if (!empty) return;

    empty.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
      empty.remove();
    }, 300);
  }

  /* ════════════════════════════════════════════════════════════════
     RESPONDENT  MODE  (Preview)
     ════════════════════════════════════════════════════════════════ */

  /**
   * Switch the application into respondent (preview) mode.
   * Shows the form as an end-user would see it.
   */
  enterRespondentMode() {
    if (this.state.questions.length === 0) {
      this.ui.showToast('Add at least one question to preview', 'error');
      return;
    }

    this.state.mode = 'respondent';
    this.ui.showRespondentMode(
      this.elements.respondentOverlay,
      this.state.questions,
      this.state.settings,
    );
    this.ui.playSound('success');

    // Update top-bar visual indicator
    if (this.elements.previewBtn) {
      this.elements.previewBtn.textContent = 'EXIT PREVIEW';
      this.elements.previewBtn.classList.add('active');
    }
  }

  /**
   * Return to builder mode from respondent preview.
   */
  exitRespondentMode() {
    this.state.mode = 'builder';
    this.ui.hideRespondentMode(this.elements.respondentOverlay);

    // Restore top-bar button
    if (this.elements.previewBtn) {
      this.elements.previewBtn.textContent = 'PREVIEW';
      this.elements.previewBtn.classList.remove('active');
    }
  }

  /* ════════════════════════════════════════════════════════════════
     PUBLISH  /  SUBMIT  FLOW
     ════════════════════════════════════════════════════════════════ */

  /**
   * Validate, animate, and "publish" the form.
   * In a real app this would POST to a backend — here we
   * show a success modal with a fake shareable link.
   */
  async publishForm() {
    // ── Guard: no questions ───────────────────────────────────────
    if (this.state.questions.length === 0) {
      this.ui.showToast('Add at least one question to publish', 'error');
      return;
    }

    // ── Validate: all questions must be titled ────────────────────
    const untitled = this.state.questions.filter(
      (q) => q.title === 'Untitled Question',
    );

    if (untitled.length > 0) {
      this.highlightErrorQuestions(untitled);
      this.ui.playSound('error');
      this.ui.showToast(
        'Please title all questions before publishing',
        'error',
      );

      // Auto-clear error highlights after 2 s
      setTimeout(() => {
        document
          .querySelectorAll('.question-block.error')
          .forEach((b) => b.classList.remove('error'));
      }, 2000);
      return;
    }

    // ── Trigger submission animation ──────────────────────────────
    this.ui.playSound('success');

    // Collect rects of all question blocks for the converge animation
    /** @type {{ x: number, y: number, width: number, height: number }[]} */
    const sourceRects = [];
    document.querySelectorAll('.question-block').forEach((block) => {
      const rect = block.getBoundingClientRect();
      sourceRects.push({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    });

    /** Target "data sink" position */
    const sinkRect = {
      x: window.innerWidth / 2 - 50,
      y: window.innerHeight - 80,
      width: 100,
      height: 60,
    };

    // Show the data-sink visual element
    if (this.elements.dataSinkContainer) {
      this.elements.dataSinkContainer.classList.remove('hidden');
      this.elements.dataSinkContainer.innerHTML = `
        <div class="data-sink">
          <div class="data-sink__core"></div>
          <div class="data-sink__ring"></div>
          <div class="data-sink__label">DATA SINK</div>
        </div>
      `;
    }

    // Tell the canvas engine to play the converge-to-sink animation
    if (this.canvas) {
      this.canvas.triggerSubmission(sourceRects, sinkRect);
    }

    // After the animation completes, show the success modal
    await this.delay(2500);
    this.showPublishSuccess();
  }

  /**
   * Flash error state on question blocks that failed validation.
   * @param {QuestionObject[]} questions
   */
  highlightErrorQuestions(questions) {
    questions.forEach((q) => {
      const block = document.querySelector(
        `[data-question-id="${q.id}"]`,
      );
      if (block) {
        block.classList.add('error');
        block.style.animation = 'shakeError 0.5s ease';
        block.addEventListener(
          'animationend',
          () => {
            block.style.animation = '';
          },
          { once: true },
        );

        // Optional: trigger a localized error flash on the canvas
        if (this.canvas) {
          const rect = block.getBoundingClientRect();
          this.canvas.triggerErrorFlash(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          );
        }
      }
    });
  }

  /**
   * Display the "Form Published" success modal with a shareable link.
   */
  showPublishSuccess() {
    const formSlug =
      this.state.questions[0]?.id?.slice(0, 8) ?? 'nexus';
    const shareUrl = `https://nexusflow.io/form/${formSlug}`;

    const modal = document.createElement('div');
    modal.className = 'nexus-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `
      <div class="nexus-modal">
        <div class="nexus-modal__icon">⚡</div>
        <h2 class="nexus-modal__title">FORM PUBLISHED</h2>
        <p class="nexus-modal__subtitle">
          Your data-inflow engine is now active
        </p>
        <div class="nexus-modal__link">
          <input
            type="text"
            value="${shareUrl}"
            readonly
            class="laser-input"
            aria-label="Shareable form link"
          />
          <button
            class="cyber-btn cyber-btn--primary"
            id="copy-link-btn"
          >COPY LINK</button>
        </div>
        <button class="cyber-btn nexus-modal__close" id="close-modal-btn">
          CLOSE
        </button>
      </div>
    `;
    document.body.appendChild(modal);

    // ── Copy link handler ─────────────────────────────────────────
    const copyBtn = modal.querySelector('#copy-link-btn');
    const input = modal.querySelector('.laser-input');
    if (copyBtn && input) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(
            /** @type {HTMLInputElement} */ (input).value,
          );
          copyBtn.textContent = 'COPIED ✓';
          setTimeout(() => {
            copyBtn.textContent = 'COPY LINK';
          }, 2000);
        } catch {
          // Fallback: select the input text
          /** @type {HTMLInputElement} */ (input).select();
        }
      });
    }

    // ── Close handler ─────────────────────────────────────────────
    const closeBtn = modal.querySelector('#close-modal-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.dismissPublishModal(modal);
      });
    }

    // Also close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.dismissPublishModal(modal);
      }
    });

    // Also close on Escape
    const escHandler = (/** @type {KeyboardEvent} */ e) => {
      if (e.key === 'Escape') {
        document.removeEventListener('keydown', escHandler);
        this.dismissPublishModal(modal);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  /**
   * Animate-out and remove the publish success modal.
   * @param {HTMLElement} modal
   */
  dismissPublishModal(modal) {
    modal.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
      modal.remove();
    }, 300);

    if (this.elements.dataSinkContainer) {
      this.elements.dataSinkContainer.classList.add('hidden');
    }
  }

  /* ════════════════════════════════════════════════════════════════
     BOOT  ANIMATION
     ════════════════════════════════════════════════════════════════ */

  /**
   * Play a staggered entrance animation for the three main panels.
   */
  playBootAnimation() {
    const panels = [
      this.elements.fabricatorPanel,
      this.elements.hydrationCanvas,
      this.elements.logicPanel,
    ];

    panels.forEach((panel, i) => {
      if (!panel) return;

      // Set initial hidden state
      panel.style.opacity = '0';
      panel.style.transform = 'translateY(20px)';

      // Stagger reveal
      setTimeout(() => {
        panel.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        panel.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
      }, 200 + i * 150);
    });

    // Optionally fire a brief welcome toast after panels settle
    setTimeout(() => {
      this.ui?.showToast('NexusFlow initialised', 'success');
    }, 1000);
  }

  /* ════════════════════════════════════════════════════════════════
     UTILITIES
     ════════════════════════════════════════════════════════════════ */

  /**
   * Promise-based delay helper.
   * @param {number} ms
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Serialise the current form state to a plain JSON object.
   * Useful for persistence / export.
   * @returns {{ settings: object, questions: QuestionObject[], logic: LogicBranch[] }}
   */
  toJSON() {
    return {
      settings: { ...this.state.settings },
      questions: this.state.questions.map((q) => ({ ...q, options: [...q.options] })),
      logic: this.state.logic.map((l) => ({ ...l })),
    };
  }

  /**
   * Restore state from a previously exported JSON blob.
   * @param {{ settings?: object, questions?: QuestionObject[], logic?: LogicBranch[] }} data
   */
  fromJSON(data) {
    if (data.settings) {
      this.state.settings = { ...this.state.settings, ...data.settings };
      if (this.elements.formTitle) {
        /** @type {HTMLInputElement} */ (this.elements.formTitle).value =
          this.state.settings.title;
      }
    }

    if (Array.isArray(data.questions)) {
      // Clear existing
      this.state.questions = [];
      const container = this.elements.questionsContainer;
      if (container) {
        container.querySelectorAll('.question-block').forEach((b) => b.remove());
      }
      this.removeEmptyState();

      // Re-add each question
      data.questions.forEach((q) => {
        const question = {
          id: q.id || crypto.randomUUID(),
          type: q.type || 'short-answer',
          title: q.title || 'Untitled Question',
          description: q.description || '',
          required: Boolean(q.required),
          options: Array.isArray(q.options) ? [...q.options] : [],
          order: this.state.questions.length,
        };
        this.state.questions.push(question);

        const block = this.ui.createQuestionBlock(question);
        if (container) container.appendChild(block);
      });

      this.updateProgress();

      if (this.state.questions.length === 0) {
        this.renderEmptyState();
      }
    }

    if (Array.isArray(data.logic)) {
      this.state.logic = data.logic.map((l) => ({ ...l }));
    }

    this.ui.renderLogicPanel(
      this.elements.logicPanel,
      this.state.questions,
      this.state.logic,
    );
  }

  /**
   * Get a question by ID.
   * @param {string} id
   * @returns {QuestionObject|undefined}
   */
  getQuestion(id) {
    return this.state.questions.find((q) => q.id === id);
  }

  /**
   * Get the total number of questions.
   * @returns {number}
   */
  get questionCount() {
    return this.state.questions.length;
  }
}

/* ══════════════════════════════════════════════════════════════════
   Bootstrap
   ══════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  const app = new NexusFlowApp();
  app.init();

  // Expose globally for debugging / console access
  window.nexusApp = app;
});

/* ──────────────────────────────────────────────────────────────────
   Module Export
   ────────────────────────────────────────────────────────────────── */

export default NexusFlowApp;
