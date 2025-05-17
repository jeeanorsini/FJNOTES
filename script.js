// Estado do aplicativo
let state = {
    columns: [],
    history: [],
    historyIndex: -1,
    currentTask: null
};

// Elementos DOM
const DOM = {
    board: document.getElementById('board'),
    searchInput: document.getElementById('searchInput'),
    btnUndo: document.getElementById('btnUndo'),
    btnRedo: document.getElementById('btnRedo'),
    btnAddCol: document.getElementById('btnAddCol'),
    toast: document.getElementById('toast'),
    commentModal: document.getElementById('commentModal'),
    commentsList: document.getElementById('commentsList'),
    newComment: document.getElementById('newComment'),
    saveComment: document.getElementById('saveComment'),
    cancelComment: document.getElementById('cancelComment')
};

// Inicialização
function init() {
    loadState();
    renderBoard();
    setupEventListeners();
    showToast('FJNOTES carregado!');
}

// Carregar estado do localStorage
function loadState() {
    const saved = localStorage.getItem('fjnotes-state');
    if (saved) {
        state = JSON.parse(saved);
        state.columns.forEach(col => {
            if (!col.tasks) col.tasks = [];
        });
    } else {
        state.columns = [
            { id: Date.now(), title: 'Para Fazer', tasks: [] },
            { id: Date.now() + 1, title: 'Em Progresso', tasks: [] },
            { id: Date.now() + 2, title: 'Concluído', tasks: [] }
        ];
        saveState();
    }
}

// Salvar estado no localStorage
function saveState() {
    if (state.history.length > 50) state.history.shift();
    state.history.push(JSON.stringify(state.columns));
    state.historyIndex = state.history.length - 1;
    localStorage.setItem('fjnotes-state', JSON.stringify(state));
    updateUndoRedoButtons();
}

// Renderizar o board
function renderBoard() {
    DOM.board.innerHTML = '';
    state.columns.forEach(column => {
        const colEl = document.createElement('div');
        colEl.className = 'coluna';
        colEl.dataset.columnId = column.id;

        const header = document.createElement('div');
        header.className = 'coluna-header';

        const title = document.createElement('div');
        title.className = 'coluna-title';
        title.textContent = column.title;

        const count = document.createElement('div');
        count.className = 'task-count';
        count.textContent = column.tasks.length;

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Remover coluna';
        deleteBtn.onclick = () => deleteColumn(column.id);

        header.appendChild(title);
        header.appendChild(count);
        header.appendChild(deleteBtn);
        colEl.appendChild(header);

        column.tasks.forEach(task => {
            const taskEl = createTaskElement(task, column.id);
            colEl.appendChild(taskEl);
        });

        const addTaskBtn = document.createElement('button');
        addTaskBtn.className = 'primary';
        addTaskBtn.style.width = '100%';
        addTaskBtn.textContent = '+ Adicionar Tarefa';
        addTaskBtn.onclick = () => addTaskToColumn(column.id);
        colEl.appendChild(addTaskBtn);

        DOM.board.appendChild(colEl);
    });
    setupDragAndDrop();
}

function createTaskElement(task, columnId) {
    const taskEl = document.createElement('div');
    taskEl.className = 'tarefa';
    taskEl.draggable = true;
    taskEl.dataset.taskId = task.id;
    taskEl.dataset.columnId = columnId;

    const priority = document.createElement('div');
    priority.className = `tarefa-priority ${task.priority.toLowerCase()}`;
    priority.textContent = task.priority;

    const title = document.createElement('div');
    title.className = 'tarefa-title';
    title.textContent = task.title;
    title.contentEditable = true;
    title.onblur = () => {
        task.title = title.textContent;
        saveState();
    };

    const dueDate = document.createElement('div');
    dueDate.className = 'tarefa-due';
    if (task.dueDate) {
        const due = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dueDate.textContent = due < today && task.progress < 100
            ? `Venceu em ${due.toLocaleDateString()}`
            : `Vence em ${due.toLocaleDateString()}`;
        if (due < today && task.progress < 100) dueDate.classList.add('overdue');
    } else {
        dueDate.textContent = 'Sem data';
    }

    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = `${task.progress}%`;
    progressContainer.appendChild(progressBar);

    const actions = document.createElement('div');
    actions.className = 'tarefa-actions';

    const progressBtn = document.createElement('button');
    progressBtn.innerHTML = '📈 Progresso';
    progressBtn.onclick = () => updateTaskProgress(task.id, columnId);

    const priorityBtn = document.createElement('button');
    priorityBtn.innerHTML = '⚠️ Prioridade';
    priorityBtn.onclick = () => updateTaskPriority(task.id, columnId);

    const commentBtn = document.createElement('button');
    commentBtn.innerHTML = '💬 Comentários';
    commentBtn.onclick = () => openCommentModal(task, columnId);

    actions.appendChild(progressBtn);
    actions.appendChild(priorityBtn);
    actions.appendChild(commentBtn);

    taskEl.appendChild(priority);
    taskEl.appendChild(title);
    taskEl.appendChild(dueDate);
    taskEl.appendChild(progressContainer);
    taskEl.appendChild(actions);

    return taskEl;
}

// Código de drag and drop (setupDragAndDrop, getDragAfterElement, moveTask, etc.) será incluído depois
