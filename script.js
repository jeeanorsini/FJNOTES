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
        // Garantir que todas as colunas tenham um array de tarefas
        state.columns.forEach(col => {
            if (!col.tasks) col.tasks = [];
        });
    } else {
        // Estado inicial
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
    // Limitar histórico a 50 estados
    if (state.history.length > 50) state.history.shift();

    // Adicionar snapshot ao histórico
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

        // Header da coluna
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

        // Tarefas
        column.tasks.forEach(task => {
            const taskEl = createTaskElement(task, column.id);
            colEl.appendChild(taskEl);
        });

        // Botão para adicionar tarefa
        const addTaskBtn = document.createElement('button');
        addTaskBtn.className = 'primary';
        addTaskBtn.style.width = '100%';
        addTaskBtn.textContent = '+ Adicionar Tarefa';
        addTaskBtn.onclick = () => addTaskToColumn(column.id);
        colEl.appendChild(addTaskBtn);

        DOM.board.appendChild(colEl);
    });

    // Habilitar drag and drop
    setupDragAndDrop();
}

// Criar elemento de tarefa
function createTaskElement(task, columnId) {
    const taskEl = document.createElement('div');
    taskEl.className = 'tarefa';
    taskEl.draggable = true;
    taskEl.dataset.taskId = task.id;
    taskEl.dataset.columnId = columnId;

    // Prioridade
    const priority = document.createElement('div');
    priority.className = `tarefa-priority ${task.priority.toLowerCase()}`;
    priority.textContent = task.priority;

    // Título
    const title = document.createElement('div');
    title.className = 'tarefa-title';
    title.textContent = task.title;
    title.contentEditable = true;
    title.onblur = () => {
        task.title = title.textContent;
        saveState();
    };

    // Data de vencimento
    const dueDate = document.createElement('div');
    dueDate.className = 'tarefa-due';
    if (task.dueDate) {
        const due = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (due < today && task.progress < 100) {
            dueDate.classList.add('overdue');
            dueDate.textContent = `Venceu em ${due.toLocaleDateString()}`;
        } else {
            dueDate.textContent = `Vence em ${due.toLocaleDateString()}`;
        }
    } else {
        dueDate.textContent = 'Sem data';
    }

    // Progresso
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container';

    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.style.width = `${task.progress}%`;

    progressContainer.appendChild(progressBar);

    // Ações
    const actions = document.createElement('div');
    actions.className = 'tarefa-actions';

    const progressBtn = document.createElement('button');
    progressBtn.innerHTML = '📈 Progresso';
    progressBtn.onclick = () => updateTaskProgress(task.id, columnId);

    const priorityBtn = document.createElement('button');
    priorityBtn.innerHTML = '⚠️ Prioridade';
    priorityBtn.onclick = () => updateTaskPriority(task.id, columnId);

    const commentBtn = document.createElement('button');
    commentBtn.innerHTML = '💬 Comentar';
    commentBtn.onclick = () => openCommentModal(task, columnId);

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.onclick = () => deleteTask(task.id, columnId);

    actions.appendChild(progressBtn);
    actions.appendChild(priorityBtn);
    actions.appendChild(commentBtn);
    actions.appendChild(deleteBtn);

    // Montar tarefa
    taskEl.appendChild(priority);
    taskEl.appendChild(title);
    taskEl.appendChild(dueDate);
    taskEl.appendChild(progressContainer);
    taskEl.appendChild(actions);

    return taskEl;
}

// Configurar drag and drop
function setupDragAndDrop() {
    const tasks = document.querySelectorAll('.tarefa');
    const columns = document.querySelectorAll('.coluna');

    tasks.forEach(task => {
        task.addEventListener('dragstart', (e) => {
            task.classList.add('dragging');
            e.dataTransfer.setData('text/plain', JSON.stringify({
                taskId: task.dataset.taskId,
                fromColumnId: task.dataset.columnId
            }));
        });

        task.addEventListener('dragend', () => {
            task.classList.remove('dragging');
        });
    });

    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            const draggingTask = document.querySelector('.dragging');
            if (draggingTask) {
                const afterElement = getDragAfterElement(column, e.clientY);
                if (afterElement) {
                    column.insertBefore(draggingTask, afterElement);
                } else {
                    column.appendChild(draggingTask);
                }
            }
        });

        column.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            const toColumnId = column.dataset.columnId;

            moveTask(data.taskId, data.fromColumnId, toColumnId);
        });
    });
}

// Helper para posicionamento durante drag
function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.tarefa:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Mover tarefa entre colunas
function moveTask(taskId, fromColumnId, toColumnId) {
    if (fromColumnId === toColumnId) return;

    const fromColumn = state.columns.find(col => col.id == fromColumnId);
    const toColumn = state.columns.find(col => col.id == toColumnId);

    if (!fromColumn || !toColumn) return;

    const taskIndex = fromColumn.tasks.findIndex(task => task.id == taskId);
    if (taskIndex === -1) return;

    const task = fromColumn.tasks.splice(taskIndex, 1)[0];
    toColumn.tasks.push(task);

    saveState();
    renderBoard();
}

// Adicionar nova coluna
function addNewColumn() {
    const title = prompt('Nome da nova coluna:', 'Nova Coluna');
    if (!title) return;

    state.columns.push({
        id: Date.now(),
        title,
        tasks: []
    });

    saveState();
    renderBoard();
    showToast(`Coluna "${title}" adicionada!`);
}

// Remover coluna
function deleteColumn(columnId) {
    if (!confirm('Tem certeza que deseja remover esta coluna e todas as suas tarefas?')) return;

    const column = state.columns.find(col => col.id == columnId);
    if (!column) return;

    state.columns = state.columns.filter(col => col.id != columnId);
    saveState();
    renderBoard();
    showToast(`Coluna "${column.title}" removida!`);
}

// Adicionar tarefa à coluna (CORREÇÃO APLICADA)
function addTaskToColumn(columnId) {
    const title = prompt('Título da tarefa:', 'Nova Tarefa');
    if (!title) return;

    const column = state.columns.find(col => col.id == columnId);
    if (!column) return;

    // Solicita a data no formato DD/MM/AAAA e formata para ISO
    const dueDateInput = prompt('Data de vencimento (DD/MM/AAAA):', '');
    let formattedDate = '';
    if (dueDateInput) {
        const [day, month, year] = dueDateInput.split('/');
        if (day && month && year) {
            formattedDate = new Date(`${year}-${month}-${day}`).toISOString();
        }
    }

    column.tasks.push({
        id: Date.now(),
        title,
        priority: 'Medium',
        dueDate: formattedDate,
        progress: 0,
        comments: []
    });

    saveState();
    renderBoard();
    showToast(`Tarefa "${title}" adicionada!`);
}

// Atualizar progresso da tarefa
function updateTaskProgress(taskId, columnId) {
    const column = state.columns.find(col => col.id == columnId);
    if (!column) return;

    const task = column.tasks.find(t => t.id == taskId);
    if (!task) return;

    const newProgress = prompt('Progresso (0-100):', task.progress);
    if (!newProgress || isNaN(newProgress)) return;

    task.progress = Math.min(100, Math.max(0, parseInt(newProgress)));
    saveState();
    renderBoard();
}

// Atualizar prioridade da tarefa
function updateTaskPriority(taskId, columnId) {
    const column = state.columns.find(col => col.id == columnId);
    if (!column) return;

    const task = column.tasks.find(t => t.id == taskId);
    if (!task) return;

    const priorities = ['High', 'Medium', 'Low'];
    const currentIndex = priorities.indexOf(task.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;

    task.priority = priorities[nextIndex];
    saveState();
    renderBoard();
}

// Abrir modal de comentários (CORREÇÃO APLICADA)
function openCommentModal(task, columnId) {
    state.currentTask = { task, columnId };

    // Injetar cabeçalho do modal com o número de comentários e botão de fechar
    DOM.commentsList.innerHTML = `
        <div class="modal-header">
            <h3>Comentários (${(task.comments || []).length})</h3>
            <button class="close-modal" onclick="DOM.commentModal.style.display='none'">×</button>
        </div>
    `;

    const commentsContainer = document.createElement('div');
    (task.comments || []).forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.style.marginBottom = '1rem';
        commentEl.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <strong>${comment.author}</strong>
                <small style="color: #aaa;">${formatDate(comment.date)}</small>
            </div>
            <p style="margin-top:0.5rem;">${comment.text}</p>
        `;
        commentsContainer.appendChild(commentEl);
    });

    DOM.commentsList.appendChild(commentsContainer);
    DOM.newComment.value = '';
    DOM.commentModal.style.display = 'flex';
}

// Função auxiliar para formatar data (CORREÇÃO APLICADA)
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Salvar comentário
function saveComment() {
    const text = DOM.newComment.value.trim();
    if (!text) return;

    const { task, columnId } = state.currentTask;
    const column = state.columns.find(col => col.id == columnId);
    if (!column) return;

    const taskInColumn = column.tasks.find(t => t.id == task.id);
    if (!taskInColumn) return;

    if (!taskInColumn.comments) taskInColumn.comments = [];

    taskInColumn.comments.push({
        author: prompt('Seu nome:', 'Usuário') || 'Anônimo',
        text,
        date: new Date().toISOString()
    });

    saveState();
    openCommentModal(taskInColumn, columnId);
    showToast('Comentário adicionado!');
}

// Deletar tarefa
function deleteTask(taskId, columnId) {
    if (!confirm('Tem certeza que deseja remover esta tarefa?')) return;

    const column = state.columns.find(col => col.id == columnId);
    if (!column) return;

    const taskIndex = column.tasks.findIndex(t => t.id == taskId);
    if (taskIndex === -1) return;

    const task = column.tasks[taskIndex];
    column.tasks.splice(taskIndex, 1);

    saveState();
    renderBoard();
    showToast(`Tarefa "${task.title}" removida!`);
}

// Undo/Redo
function undo() {
    if (state.historyIndex <= 0) return;

    state.historyIndex--;
    state.columns = JSON.parse(state.history[state.historyIndex]);
    localStorage.setItem('fjnotes-state', JSON.stringify(state));
    renderBoard();
    updateUndoRedoButtons();
}

function redo() {
    if (state.historyIndex >= state.history.length - 1) return;

    state.historyIndex++;
    state.columns = JSON.parse(state.history[state.historyIndex]);
    localStorage.setItem('fjnotes-state', JSON.stringify(state));
    renderBoard();
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
