import type { StepNode, Template } from '../core/model.ts';
import { loadTemplate, saveTemplate } from '../core/storage.ts';
import { newQuestion, newTask, parseTemplate, TemplateError } from '../core/template.ts';

type MessageTone = 'info' | 'error' | 'success';

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function showMessage(target: HTMLElement, text: string, tone: MessageTone = 'info'): void {
  target.textContent = text;
  target.className = `message${tone === 'info' ? '' : ` ${tone}`}`;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* ---------- Allowed hosts ---------- */

const hostForm = byId<HTMLFormElement>('host-form');
const hostInput = byId<HTMLInputElement>('host-input');
const hostMessage = byId('host-message');
const hostList = byId<HTMLUListElement>('host-list');

/** "azure.example.com/tfs/x" -> "https://azure.example.com/*" (any port, any path). */
function toOriginPattern(input: string): string | undefined {
  let value = input.trim();
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}/*`;
  } catch {
    return undefined;
  }
}

async function renderHosts(): Promise<void> {
  const { origins = [] } = await chrome.permissions.getAll();
  hostList.replaceChildren(
    ...origins.map((origin) => {
      const remove = el('button', { type: 'button', className: 'danger', textContent: 'Remove' });
      remove.addEventListener('click', () => {
        chrome.permissions
          .remove({ origins: [origin] })
          .then(() => renderHosts())
          .catch((error: unknown) => showMessage(hostMessage, errorText(error), 'error'));
      });
      return el('li', {}, [el('code', { textContent: origin }), remove]);
    }),
  );
  if (origins.length === 0) hostList.replaceChildren(el('li', { className: 'empty', textContent: 'No address allowed yet.' }));
}

hostForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const pattern = toOriginPattern(hostInput.value);
  if (!pattern) {
    showMessage(hostMessage, 'This is not a valid address.', 'error');
    return;
  }
  // permissions.request must run directly inside the user gesture.
  chrome.permissions
    .request({ origins: [pattern] })
    .then(async (granted) => {
      if (!granted) {
        showMessage(hostMessage, 'Permission was not granted.', 'error');
        return;
      }
      hostInput.value = '';
      showMessage(hostMessage, `Allowed ${pattern}. Reload open Azure DevOps tabs.`, 'success');
      await renderHosts();
    })
    .catch((error: unknown) => showMessage(hostMessage, errorText(error), 'error'));
});

/* ---------- Step editor ---------- */

const editor = byId('editor');
const saveButton = byId<HTMLButtonElement>('save');
const discardButton = byId<HTMLButtonElement>('discard');
const saveMessage = byId('save-message');

let draft: Template = { version: 1, steps: [] };
let savedJson = '';

function isDirty(): boolean {
  return JSON.stringify(draft) !== savedJson;
}

function refreshDirtyState(): void {
  const dirty = isDirty();
  saveButton.disabled = !dirty;
  discardButton.disabled = !dirty;
  if (dirty) showMessage(saveMessage, 'Unsaved changes');
  else if (saveMessage.textContent === 'Unsaved changes') showMessage(saveMessage, '');
}

function setDraft(template: Template): void {
  draft = structuredClone(template);
  renderEditor();
}

function renderEditor(): void {
  editor.removeAttribute('aria-busy');
  editor.replaceChildren(renderList(draft.steps));
  refreshDirtyState();
}

function addRow(list: StepNode[]): HTMLElement {
  const addStep = el('button', { type: 'button', textContent: '+ Step' });
  const addQuestion = el('button', { type: 'button', textContent: '+ Question' });
  const add = (node: StepNode) => {
    list.push(node);
    renderEditor();
    editor.querySelector<HTMLInputElement>(`[data-step-id="${node.id}"]`)?.focus();
  };
  addStep.addEventListener('click', () => add(newTask()));
  addQuestion.addEventListener('click', () => add(newQuestion()));
  return el('div', { className: 'add-row' }, [addStep, addQuestion]);
}

function renderList(list: StepNode[], emptyText?: string): HTMLElement {
  const wrapper = el('div');
  if (list.length === 0 && emptyText) wrapper.append(el('p', { className: 'empty', textContent: emptyText }));
  if (list.length > 0) {
    wrapper.append(el('ol', { className: 'step-list' }, list.map((node, index) => renderNode(node, list, index))));
  }
  wrapper.append(addRow(list));
  return wrapper;
}

function iconButton(text: string, label: string, onClick: () => void, disabled = false, extraClass = ''): HTMLButtonElement {
  const button = el('button', { type: 'button', className: `icon ${extraClass}`.trim(), textContent: text, disabled });
  button.setAttribute('aria-label', label);
  button.title = label;
  button.addEventListener('click', onClick);
  return button;
}

function renderNode(node: StepNode, list: StepNode[], index: number): HTMLElement {
  const title = el('input', {
    type: 'text',
    value: node.title,
    placeholder: node.kind === 'question' ? 'Question, e.g. Is this a DB fix?' : 'Step description',
  });
  title.dataset['stepId'] = node.id;
  title.setAttribute('aria-label', node.kind === 'question' ? 'Question' : 'Step');
  title.addEventListener('input', () => {
    node.title = title.value;
    title.classList.remove('invalid');
    refreshDirtyState();
  });

  const move = (offset: number) => {
    const [moved] = list.splice(index, 1);
    if (moved) list.splice(index + offset, 0, moved);
    renderEditor();
  };

  const head = el('div', { className: 'step-head' }, [
    el('span', { className: 'kind', textContent: node.kind === 'question' ? 'Question' : 'Step' }),
    title,
    iconButton('↑', 'Move up', () => move(-1), index === 0),
    iconButton('↓', 'Move down', () => move(1), index === list.length - 1),
    iconButton(
      '✕',
      'Delete',
      () => {
        list.splice(index, 1);
        renderEditor();
      },
      false,
      'danger',
    ),
  ]);

  const item = el('li', { className: `step ${node.kind}` }, [head]);
  if (node.kind === 'question') {
    item.append(
      el('div', { className: 'branches' }, [
        el('div', { className: 'branch yes' }, [
          el('div', { className: 'branch-label', textContent: 'If yes' }),
          renderList(node.yes, 'No extra steps.'),
        ]),
        el('div', { className: 'branch no' }, [
          el('div', { className: 'branch-label', textContent: 'If no' }),
          renderList(node.no, 'No extra steps.'),
        ]),
      ]),
    );
  }
  return item;
}

function markEmptyTitles(): void {
  for (const input of editor.querySelectorAll<HTMLInputElement>('input[data-step-id]')) {
    input.classList.toggle('invalid', input.value.trim().length === 0);
  }
}

saveButton.addEventListener('click', () => {
  let template: Template;
  try {
    template = parseTemplate(draft);
  } catch (error) {
    markEmptyTitles();
    const text = error instanceof TemplateError && /title is empty/.test(error.message)
      ? 'Every step and question needs a text.'
      : errorText(error);
    showMessage(saveMessage, text, 'error');
    return;
  }
  saveButton.disabled = true;
  saveTemplate(template)
    .then(() => {
      savedJson = JSON.stringify(template);
      setDraft(template);
      showMessage(saveMessage, 'Saved', 'success');
    })
    .catch((error: unknown) => {
      saveButton.disabled = false;
      showMessage(saveMessage, `Save failed: ${errorText(error)}`, 'error');
    });
});

discardButton.addEventListener('click', () => {
  setDraft(JSON.parse(savedJson) as Template);
  showMessage(saveMessage, '');
});

/* ---------- Export and import ---------- */

const exportButton = byId<HTMLButtonElement>('export');
const importButton = byId<HTMLButtonElement>('import');
const importFile = byId<HTMLInputElement>('import-file');

// Exports what is saved, not the draft, so the file always holds a valid template.
exportButton.addEventListener('click', () => {
  if (!savedJson) return; // steps are still loading
  const blob = new Blob([`${JSON.stringify(JSON.parse(savedJson), null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = el('a', { href: url, download: 'stepper-steps.json' });
  link.click();
  URL.revokeObjectURL(url);
  if (isDirty()) showMessage(saveMessage, 'Exported the saved steps; unsaved changes are not in the file.');
});

importButton.addEventListener('click', () => importFile.click());

// An import replaces the draft only; nothing is stored until Save, so Discard undoes it.
importFile.addEventListener('change', () => {
  const file = importFile.files?.[0];
  importFile.value = '';
  if (!file) return;
  file
    .text()
    .then((text) => {
      let template: Template;
      try {
        template = parseTemplate(JSON.parse(text));
      } catch (error) {
        const reason = error instanceof SyntaxError ? 'it is not valid JSON' : errorText(error);
        showMessage(saveMessage, `Could not import ${file.name}: ${reason}`, 'error');
        return;
      }
      setDraft(template);
      showMessage(saveMessage, `Imported ${file.name}. Review the steps, then Save.`);
    })
    .catch((error: unknown) => showMessage(saveMessage, `Could not read ${file.name}: ${errorText(error)}`, 'error'));
});

window.addEventListener('beforeunload', (event) => {
  if (isDirty()) event.preventDefault();
});

/* ---------- Init ---------- */

renderHosts().catch((error: unknown) => showMessage(hostMessage, errorText(error), 'error'));

loadTemplate()
  .then((template) => {
    savedJson = JSON.stringify(template);
    setDraft(template);
  })
  .catch((error: unknown) => {
    editor.removeAttribute('aria-busy');
    editor.replaceChildren(el('p', { className: 'message error', textContent: `Could not load steps: ${errorText(error)}` }));
  });
