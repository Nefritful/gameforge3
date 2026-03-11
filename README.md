# GameForge 3 — no-code 2D editor (Phaser 2 oriented)

MVP-скелет платформы с 3 слоями:

1. **Editor Shell** — интерфейс редактора (сцены, дерево объектов, canvas, инспектор, файлы).
2. **Project Storage Layer** — хранение проектов в `storage/user_projects`.
3. **Runtime Layer** — запуск и preview сцены в 2D режиме.

## Что сделано к текущему этапу

- Реализован shell интерфейса:
  - верхняя панель (проект/сцена, создать сцену/объект, сохранить, preview);
  - левая панель дерева объектов сцены;
  - центральный визуальный canvas с сеткой;
  - правая панель свойств выбранного объекта;
  - нижняя панель файлов проекта.
- Добавлено создание сущностей через контекстное меню:
  - `Object`
  - `Pawn`
  - `Area`
  - `Ui`
- Реализовано перетаскивание объектов мышкой (LMB drag & drop).
- Добавлены шаблоны данных для 4 базовых абстракций (`Object`, `Pawn`, `Area`, `Ui`).
- Реализован файловый проводник проекта с операциями create/rename/delete через backend API.

## Backend API

### Scene API

- `GET /api/project` — получить метаданные проекта и список сцен;
- `GET /api/scenes` — получить список сцен;
- `GET /api/scene/:name` — загрузить сцену;
- `POST /api/scene` — создать сцену;
- `PUT /api/scene/:name` — сохранить сцену.

### File Explorer API

- `GET /api/files` — получить дерево файлов проекта;
- `POST /api/files/folder` — создать папку;
- `POST /api/files/file` — создать файл;
- `PUT /api/files/rename` — переименовать файл/папку;
- `DELETE /api/files?path=<relative_path>` — удалить файл/папку.

## Runtime Preview (новый этап)

- Добавлена отдельная страница `preview.html`.
- Кнопка `Запустить Preview` в редакторе:
  - автоматически сохраняет текущую сцену,
  - открывает preview-окно с параметрами owner/project/scene.
- Добавлен runtime-скрипт `src/runtime-preview.js`:
  - загружает сцену через Scene API,
  - рендерит 2D объекты типов `Object`, `Pawn`, `Area`, `Ui`,
  - поддерживает MVP-управление первым `Pawn` с клавиатуры (WASD/Arrow),
  - показывает raw scene JSON и runtime status.

## Локальный запуск

```bash
node server.js
```

Открыть: `http://localhost:4173`

## IDE

- Подойдет **PyCharm**.
- Также удобно использовать **WebStorm** или **VS Code**.

## Структура хранения

```text
storage/
  user_projects/
    demo@example.com/
      project1/
        project.json
        scenes/
          main.scene.json
        assets/
        scripts/
        ui/
        data/
        exports/
```

## Следующие этапы

1. Scratch-like блоки: хранение графов в JSON + исполнение событий и действий.
2. Улучшенный инспектор компонентов (physics/render/control/area/ui) по типу объекта.
3. Phaser 2 bridge: заменить DOM-preview на полноценную сборку сцены в Phaser runtime.
