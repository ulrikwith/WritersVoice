// Blue.cc Books Service
// CRUD operations for books stored as Blue.cc todos

import blueCore from './core';
import customFieldsService from './customFields';
import type {
  ApiResponse,
  Book,
  BookMetadata,
  CreateBookInput,
  UpdateBookInput,
  Todo,
} from './types';

class BooksService {
  /**
   * Get all books for the current user
   */
  async getBooks(): Promise<ApiResponse<Book[]>> {
    const listId = await blueCore.getBooksListId();

    const query = `
      query GetBooks($listId: ID!) {
        todos(todoListId: $listId, filter: { parentId: null }) {
          id
          title
          text
          position
          createdAt
          updatedAt
          customFieldValues {
            field {
              id
              name
              type
            }
            value
          }
          children {
            id
            title
            position
          }
        }
      }
    `;

    const result = await blueCore.query<{ todos: Todo[] }>(query, { listId });

    if (!result.success || !result.data?.todos) {
      return { success: false, error: result.error || 'Failed to fetch books' };
    }

    const books = result.data.todos.map((todo) => this.todoToBook(todo));
    return { success: true, data: books };
  }

  /**
   * Get a single book by ID
   */
  async getBook(bookId: string): Promise<ApiResponse<Book>> {
    const todoResult = await blueCore.getTodo(bookId);

    if (!todoResult.success || !todoResult.data) {
      return { success: false, error: 'Book not found' };
    }

    const book = this.todoToBook(todoResult.data);
    return { success: true, data: book };
  }

  /**
   * Create a new book
   */
  async createBook(input: CreateBookInput): Promise<ApiResponse<Book>> {
    const listId = await blueCore.getBooksListId();

    const mutation = `
      mutation CreateBook($input: CreateTodoInput!) {
        createTodo(input: $input) {
          id
          title
          text
          position
          createdAt
          updatedAt
        }
      }
    `;

    const result = await blueCore.query<{ createTodo: Todo }>(mutation, {
      input: {
        todoListId: listId,
        title: input.title,
        text: input.description || '',
      },
    });

    if (!result.success || !result.data?.createTodo) {
      return { success: false, error: result.error || 'Failed to create book' };
    }

    const bookId = result.data.createTodo.id;

    // Set metadata custom field
    const metadata: BookMetadata = {
      ...input.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await customFieldsService.setTodoValue(
      bookId,
      'BookArchitect_BookMetadata',
      metadata
    );

    console.log(`[Blue.cc] Created book: ${input.title}`);

    const book = this.todoToBook({
      ...result.data.createTodo,
      customFieldValues: [],
    });
    book.metadata = metadata;

    return { success: true, data: book };
  }

  /**
   * Update a book
   */
  async updateBook(input: UpdateBookInput): Promise<ApiResponse<Book>> {
    const mutation = `
      mutation UpdateBook($input: UpdateTodoInput!) {
        updateTodo(input: $input) {
          id
          title
          text
          position
          updatedAt
        }
      }
    `;

    const updateInput: Record<string, unknown> = { id: input.id };
    if (input.title !== undefined) updateInput.title = input.title;
    if (input.description !== undefined) updateInput.text = input.description;

    const result = await blueCore.query<{ updateTodo: Todo }>(mutation, {
      input: updateInput,
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to update book' };
    }

    // Update metadata if provided
    if (input.metadata) {
      const existingMetadata = await customFieldsService.getTodoValue<BookMetadata>(
        input.id,
        'BookArchitect_BookMetadata'
      );

      const updatedMetadata: BookMetadata = {
        ...(existingMetadata.data || {}),
        ...input.metadata,
        updatedAt: new Date().toISOString(),
      } as BookMetadata;

      await customFieldsService.setTodoValue(
        input.id,
        'BookArchitect_BookMetadata',
        updatedMetadata
      );
    }

    // Fetch and return updated book
    return this.getBook(input.id);
  }

  /**
   * Delete a book
   */
  async deleteBook(bookId: string): Promise<ApiResponse<void>> {
    const result = await blueCore.deleteTodo(bookId);

    if (result.success) {
      console.log(`[Blue.cc] Deleted book: ${bookId}`);
    }

    return result;
  }

  /**
   * Reorder books
   */
  async reorderBooks(bookIds: string[]): Promise<ApiResponse<void>> {
    const mutation = `
      mutation ReorderBook($input: UpdateTodoInput!) {
        updateTodo(input: $input) {
          id
          position
        }
      }
    `;

    for (let i = 0; i < bookIds.length; i++) {
      await blueCore.query(mutation, {
        input: {
          id: bookIds[i],
          position: i,
        },
      });
    }

    return { success: true };
  }

  /**
   * Search books by title
   */
  async searchBooks(searchTerm: string): Promise<ApiResponse<Book[]>> {
    const listId = await blueCore.getBooksListId();
    const result = await blueCore.searchTodos(listId, searchTerm);

    if (!result.success || !result.data) {
      return { success: false, error: result.error, data: [] };
    }

    // Filter to only top-level todos (books, not chapters)
    const books = result.data
      .filter((todo) => !todo.parentId)
      .map((todo) => this.todoToBook(todo));

    return { success: true, data: books };
  }

  /**
   * Get book count
   */
  async getBookCount(): Promise<ApiResponse<number>> {
    const result = await this.getBooks();

    if (!result.success) {
      return { success: false, error: result.error, data: 0 };
    }

    return { success: true, data: result.data?.length || 0 };
  }

  /**
   * Convert a Blue.cc Todo to a Book
   */
  private todoToBook(todo: Todo): Book {
    let metadata: BookMetadata = {
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
    };

    // Extract metadata from custom fields
    const metadataField = todo.customFieldValues?.find(
      (cfv) => cfv.field.name === 'BookArchitect_BookMetadata'
    );

    if (metadataField) {
      try {
        metadata = { ...metadata, ...JSON.parse(metadataField.value) };
      } catch (error) {
        console.warn(`[Blue.cc] Failed to parse book metadata for ${todo.id}:`, error);
        // Keep default metadata
      }
    }

    return {
      id: todo.id,
      title: todo.title,
      description: todo.text,
      metadata,
      position: todo.position,
      // Preserve original timestamps from children instead of always using current time
      chapters: todo.children?.map((child) => ({
        id: child.id,
        bookId: todo.id,
        title: child.title,
        position: child.position,
        metadata: {
          lastEditedAt: todo.updatedAt, // Use todo's updatedAt as fallback
        },
      })),
    };
  }

  /**
   * Sync a local book to Blue.cc
   */
  async syncBook(localBook: {
    id?: string;
    title: string;
    description?: string;
    metadata?: Partial<BookMetadata>;
  }): Promise<ApiResponse<Book>> {
    if (localBook.id) {
      // Try to update existing
      const existingResult = await this.getBook(localBook.id);
      if (existingResult.success) {
        return this.updateBook({
          id: localBook.id,
          title: localBook.title,
          description: localBook.description,
          metadata: localBook.metadata,
        });
      }
    }

    // Create new book
    return this.createBook({
      title: localBook.title,
      description: localBook.description,
      metadata: localBook.metadata,
    });
  }
}

// Singleton instance
export const booksService = new BooksService();

export default booksService;
