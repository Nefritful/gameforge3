# GameForge 3 — no-code 2D editor (Phaser 2 oriented)

MVP-скелет платформы с 3 слоями:

1. **Editor Shell** — интерфейс редактора (сцены, дерево объектов, canvas, инспектор, файлы).
2. **Project Storage Layer** — хранение проектов в `storage/user_projects`.
3. **Runtime Layer (planned)** — запуск сцены в Phaser 2 и интерпретация block-logic.

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

## Что добавлено на этом шаге

- Полноценный проводник файлов в нижней панели редактора.
- Кнопки для операций: создать папку, создать файл, переименовать, удалить.
- Хранение и операции выполняются в `storage/user_projects/...` через backend API.
- Добавлена серверная валидация путей (`safeProjectPath`) против выхода из директории проекта.

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

1. Runtime preview: чтение `.scene.json`, сборка в Phaser 2.
2. Scratch-like блоки: хранение графов в JSON + исполнение событий и действий.
3. Улучшенный инспектор компонентов (physics/render/control/area/ui) по типу объекта.
