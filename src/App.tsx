/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useEffect, useRef, useState } from 'react';
import { UserWarning } from './UserWarning';
import {
  addTodo,
  deleteTodo,
  getTodos,
  updateTodo,
  USER_ID,
} from './api/todos';
import { Todo } from './types/Todo';
import cn from 'classnames';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [status, setStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [tempTodo, setTempTodo] = useState<Todo | null>(null);
  const newTodoFaild = useRef<HTMLInputElement>(null);
  const [deletingTodoId, setDeletingTodoId] = useState<number | null>(null);

  const filterdTodos = todos.filter(todo => {
    switch (status) {
      case 'active':
        return !todo.completed;
      case 'completed':
        return todo.completed;
      default:
        return true;
    }
  });

  useEffect(() => {
    if (!hasError) {
      return;
    }

    const timer = setTimeout(() => {
      setHasError(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [hasError]);
  useEffect(() => {
    setHasError(false);
    getTodos()
      .then(setTodos)
      .catch(() => {
        setHasError(true);
        setErrorMsg('Unable to load todos');
      });
  }, []);

  useEffect(() => {
    if (!isAdding) {
      newTodoFaild.current?.focus();
    }
  }, [isAdding]);
  if (!USER_ID) {
    return <UserWarning />;
  }

  const handleSudmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (newTodoTitle.trim()) {
      try {
        const newTempTodo: Todo = {
          id: 0,
          userId: USER_ID,
          title: newTodoTitle.trim(),
          completed: false,
        };

        setTempTodo(newTempTodo);

        setIsAdding(true);
        const newTodo = await addTodo(newTodoTitle.trim());

        setTodos(currentTodos => [...currentTodos, newTodo]);

        setTempTodo(null);

        setNewTodoTitle('');
      } catch {
        setErrorMsg('Unable to add a todo');
        setHasError(true);
        setTempTodo(null);
      } finally {
        setIsAdding(false);
      }
    } else {
      setErrorMsg('Title should not be empty');
      setHasError(true);
    }
  };

  const handleDelete = async (todoID: number) => {
    setDeletingTodoId(todoID);
    try {
      await deleteTodo(todoID);
      setTodos(todos.filter(todo => todo.id !== todoID));
    } catch {
      setErrorMsg('Unable to delete a todo');
      setHasError(true);
    } finally {
      setDeletingTodoId(null);
      setIsAdding(false);
      newTodoFaild.current?.focus();
    }
  };

  const handleCleareComplite = async () => {
    const compleredTodos = todos.filter(todo => todo.completed);
    const results = await Promise.allSettled(
      compleredTodos.map(todo => deleteTodo(todo.id)),
    );

    newTodoFaild.current?.focus();

    const hasFailed = results.some(result => result.status === 'rejected');

    setTodos(currentTodos =>
      currentTodos.filter((todo, index) => {
        if (!todo.completed) {
          return true;
        }

        return results[index]?.status === 'rejected';
      }),
    );

    if (hasFailed) {
      setErrorMsg('Unable to delete a todo');

      setHasError(true);
    }
  };

  const handleToggle = async (todoID: number, completed: boolean) => {
    try {
      await updateTodo(todoID, completed);
      setTodos(
        todos.map(todo => {
          if (todo.id === todoID) {
            return {
              ...todo,
              completed: completed,
            };
          }

          return todo;
        }),
      );
    } catch {
      setErrorMsg('Unable to update a todo');
      setHasError(true);
    }
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          {/* this button should have `active` class only if all todos are completed */}
          <button
            type="button"
            className={cn('todoapp__toggle-all', {
              active: todos.length > 0 && todos.every(todo => todo.completed),
            })}
            data-cy="ToggleAllButton"
          />

          {/* Add a todo on form submit */}
          <form onSubmit={handleSudmit}>
            <input
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={even => setNewTodoTitle(even?.target.value)}
              autoFocus
              disabled={isAdding}
              ref={newTodoFaild}
            />
          </form>
        </header>
        {todos.length > 0 && (
          <section className="todoapp__main" data-cy="TodoList">
            {/* This is a completed todo */}
            {filterdTodos.map(todo => {
              return (
                <div
                  data-cy="Todo"
                  className={todo.completed ? 'todo completed' : 'todo'}
                  key={todo.id}
                >
                  <label className="todo__status-label">
                    <input
                      data-cy="TodoStatus"
                      type="checkbox"
                      className="todo__status"
                      checked={todo.completed}
                      onChange={() => handleToggle(todo.id, !todo.completed)}
                    />
                  </label>

                  <span data-cy="TodoTitle" className="todo__title">
                    {todo.title}
                  </span>

                  {/* Remove button appears only on hover */}
                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    onClick={() => handleDelete(todo.id)}
                  >
                    ×
                  </button>

                  {/* overlay will cover the todo while it is being deleted or updated */}
                  <div
                    data-cy="TodoLoader"
                    className={cn('modal overlay', {
                      'is-active': deletingTodoId === todo.id,
                    })}
                  >
                    <div
                      className="modal-background
                    has-background-white-ter"
                    />
                    <div className="loader" />
                  </div>
                </div>
              );
            })}
            {tempTodo && (
              <div data-cy="Todo" className="todo">
                <label className="todo__status-label">
                  <input
                    data-cy="TodoStatus"
                    type="checkbox"
                    className="todo__status"
                    checked={false}
                    disabled
                    readOnly
                  />
                </label>

                <span data-cy="TodoTitle" className="todo__title">
                  {tempTodo.title}
                </span>

                {/* Remove button appears only on hover */}
                <button
                  type="button"
                  className="todo__remove"
                  data-cy="TodoDelete"
                  disabled
                >
                  ×
                </button>

                {/* overlay will cover the todo while it is being deleted or updated */}
                <div
                  data-cy="TodoLoader"
                  className={cn('modal overlay', {
                    'is-active': tempTodo !== null,
                  })}
                >
                  <div
                    className="modal-background
                has-background-white-ter"
                  />
                  <div className="loader" />
                </div>
              </div>
            )}
            ;
          </section>
        )}
        {/* Hide the footer if there are no todos */}
        {todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(todo => !todo.completed).length} items left
            </span>

            {/* Active link should have the 'selected' class */}

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={cn('filter__link', { selected: status === 'all' })}
                data-cy="FilterLinkAll"
                onClick={() => setStatus('all')}
              >
                All
              </a>

              <a
                href="#/active"
                className={cn('filter__link', {
                  selected: status === 'active',
                })}
                data-cy="FilterLinkActive"
                onClick={() => setStatus('active')}
              >
                Active
              </a>

              <a
                href="#/completed"
                className={cn('filter__link', {
                  selected: status === 'completed',
                })}
                data-cy="FilterLinkCompleted"
                onClick={() => setStatus('completed')}
              >
                Completed
              </a>
            </nav>

            {/* this button should be disabled if there are no completed todos */}
            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(todo => todo.completed)}
              onClick={handleCleareComplite}
            >
              Clear completed
            </button>
          </footer>
        )}
        {/* DON'T use conditional rendering to hide the notification */}
        {/* DON'T use conditional rendering to hide the notification */}
        {/* Add the 'hidden' class to hide the message smoothly */}
        <div
          data-cy="ErrorNotification"
          className={cn(
            'notification is-danger is-light has-text-weight-normal',
            { hidden: hasError === false },
          )}
        >
          <button
            data-cy="HideErrorButton"
            type="button"
            className="delete"
            onClick={() => setHasError(false)}
          />
          {/* show only one message at a time */}
          {errorMsg}
        </div>
      </div>
    </div>
  );
};
